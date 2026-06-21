import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { topologicalSort, getParallelGroups } from "@/lib/dag";
import type { Node, Edge } from "@xyflow/react";
import type { NodeData } from "@/types/nodes";
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import sharp from "sharp";

export const maxDuration = 300; // 5 min timeout

// ── helpers ──────────────────────────────────────────────────────────────────

async function fetchBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

function getImageMimeType(url: string): string {
  if (url.startsWith("data:")) return url.split(";")[0].split(":")[1];
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  const map: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
  return map[ext ?? ""] ?? "image/jpeg";
}

// ── inline node executors ─────────────────────────────────────────────────────

async function executeCropImage(params: {
  imageUrl: string;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
}): Promise<{ outputUrl: string }> {
  const { imageUrl, xPosition, yPosition, width, height } = params;
  const buf = await fetchBuffer(imageUrl);
  const img = sharp(buf);
  const meta = await img.metadata();
  const imgW = meta.width ?? 1920;
  const imgH = meta.height ?? 1080;

  const cropX = Math.max(0, Math.floor((xPosition / 100) * imgW));
  const cropY = Math.max(0, Math.floor((yPosition / 100) * imgH));
  const cropW = Math.max(1, Math.floor((width / 100) * imgW));
  const cropH = Math.max(1, Math.floor((height / 100) * imgH));

  // Clamp to image bounds
  const safeW = Math.min(cropW, imgW - cropX);
  const safeH = Math.min(cropH, imgH - cropY);

  const cropped = await img
    .extract({ left: cropX, top: cropY, width: safeW, height: safeH })
    .jpeg({ quality: 90 })
    .toBuffer();

  const outputUrl = `data:image/jpeg;base64,${cropped.toString("base64")}`;
  return { outputUrl };
}

async function executeGemini(params: {
  model: string;
  prompt: string;
  systemPrompt?: string;
  imageUrls?: string[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; usage: object }> {
  const { model, prompt, systemPrompt, imageUrls, temperature, maxTokens } = params;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: model ?? "gemini-2.5-flash",
    generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: maxTokens ?? 2048 },
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
  });

  const parts: Part[] = [];

  // Add images (vision)
  if (imageUrls && imageUrls.length > 0) {
    for (const imgUrl of imageUrls) {
      try {
        const mimeType = getImageMimeType(imgUrl) as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
        const buf = await fetchBuffer(imgUrl);
        parts.push({ inlineData: { data: buf.toString("base64"), mimeType } });
      } catch (e) {
        console.warn(`[Gemini] Failed to fetch image ${imgUrl}:`, e);
      }
    }
  }

  parts.push({ text: prompt });

  const result = await geminiModel.generateContent({ contents: [{ role: "user", parts }] });
  const text = result.response.text();

  return {
    text,
    usage: {
      promptTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      candidateTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: result.response.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}

// ── POST /api/workflows/[id]/run ─────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const workflow = await prisma.workflow.findFirst({
    where: { id, OR: [{ userId }, { isSystem: true }] },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const scope = (body.scope ?? "FULL") as "FULL" | "PARTIAL" | "SINGLE";
  const selectedNodeIds: string[] = body.selectedNodeIds ?? [];
  const bodyInputs: Record<string, string> = body.inputs ?? {};

  // Use the saved flowJson, or fall back to the request body's flowJson
  const flow = (workflow.flowJson ?? body.flowJson) as { nodes: Node<NodeData>[]; edges: Edge[] } | null;
  if (!flow?.nodes) return NextResponse.json({ error: "No workflow to run" }, { status: 400 });

  const allNodes = flow.nodes;
  const edges = flow.edges ?? [];

  // Determine which nodes to execute
  let nodesToRun = allNodes;
  if ((scope === "SINGLE" || scope === "PARTIAL") && selectedNodeIds.length > 0) {
    nodesToRun = allNodes.filter((n) => selectedNodeIds.includes(n.id));
  }

  // Cycle check
  const sorted = topologicalSort(nodesToRun, edges);
  if (!sorted) return NextResponse.json({ error: "Workflow contains a cycle" }, { status: 400 });

  // Create the workflow run record
  const run = await prisma.workflowRun.create({
    data: { workflowId: id, status: "RUNNING", scope },
  });

  // Create per-node run records
  const nodeRunMap: Record<string, string> = {};
  for (const node of nodesToRun) {
    const nodeData = node.data as NodeData;
    const nr = await prisma.nodeRun.create({
      data: {
        workflowRunId: run.id,
        nodeId: node.id,
        nodeType: nodeData.nodeType,
        nodeLabel: ("label" in nodeData ? (nodeData as { label?: string }).label : null) ?? null,
        status: "PENDING",
      },
    });
    nodeRunMap[node.id] = nr.id;
  }

  // Fire-and-forget
  void executeWorkflow(run.id, nodesToRun, edges, nodeRunMap, bodyInputs);

  return NextResponse.json({ runId: run.id, status: "RUNNING" }, { status: 202 });
}

// ── Execution engine ──────────────────────────────────────────────────────────

async function executeWorkflow(
  runId: string,
  nodes: Node<NodeData>[],
  edges: Edge[],
  nodeRunMap: Record<string, string>,
  externalInputs: Record<string, string>
) {
  // resolvedOutputs[nodeId][handleId] = value
  const resolvedOutputs: Record<string, Record<string, unknown>> = {};

  function getConnectedValue(nodeId: string, handleId: string): unknown {
    const edge = edges.find((e) => e.target === nodeId && e.targetHandle === handleId);
    if (!edge) return undefined;
    const src = resolvedOutputs[edge.source];
    if (!src) return undefined;
    return src[edge.sourceHandle ?? "output"] ?? src[Object.keys(src)[0]];
  }

  // Collects ALL values connected to a handle — needed when multiple nodes
  // (e.g. Crop #1 + Crop #2) both wire into the same image handle on Gemini
  function getAllConnectedValues(nodeId: string, handleId: string): unknown[] {
    return edges
      .filter((e) => e.target === nodeId && e.targetHandle === handleId)
      .flatMap((e) => {
        const src = resolvedOutputs[e.source];
        if (!src) return [];
        const val = src[e.sourceHandle ?? "output"] ?? src[Object.keys(src)[0]];
        return val !== undefined ? [val] : [];
      });
  }

  // ── Step 1: Resolve RequestInputs immediately ──
  const reqNode = nodes.find((n) => (n.data as NodeData).nodeType === "request-inputs");
  if (reqNode) {
    const data = reqNode.data as { fields: Array<{ id: string; label: string; value?: string; type: string }> };
    resolvedOutputs[reqNode.id] = {};
    for (const field of data.fields ?? []) {
      const value = externalInputs[field.label] ?? externalInputs[field.id] ?? field.value ?? "";
      // Key by field.id — this is what the edge sourceHandle points to
      resolvedOutputs[reqNode.id][field.id] = value;
      // Also key by label and type for fallback lookups
      resolvedOutputs[reqNode.id][field.label] = value;
      resolvedOutputs[reqNode.id][field.type] = value;
    }
    if (nodeRunMap[reqNode.id]) {
      await prisma.nodeRun.update({
        where: { id: nodeRunMap[reqNode.id] },
        data: {
          status: "SUCCESS",
          startedAt: new Date(),
          finishedAt: new Date(),
          durationMs: 1,
          output: resolvedOutputs[reqNode.id] as object,
        },
      });
    }
  }

  // ── Step 2: Execute parallel groups ──
  const parallelGroups = getParallelGroups(nodes, edges);

  for (const group of parallelGroups) {
    const executableNodes = group.filter(
      (n) => !["request-inputs", "response"].includes((n.data as NodeData).nodeType)
    );

    await Promise.all(
      executableNodes.map(async (node) => {
        const nodeRunId = nodeRunMap[node.id];
        const nodeData = node.data as NodeData;
        const startTime = Date.now();

        try {
          await prisma.nodeRun.update({
            where: { id: nodeRunId },
            data: { status: "RUNNING", startedAt: new Date() },
          });

          let output: unknown;

          // ── Crop Image ──
          if (nodeData.nodeType === "crop-image") {
            const imageUrl =
              (getConnectedValue(node.id, "inputImage") as string) ?? (nodeData as any).inputImage;
            if (!imageUrl) throw new Error("Input Image is required — connect an image source");

            const result = await executeCropImage({
              imageUrl,
              xPosition: (getConnectedValue(node.id, "xPosition") as number) ?? (nodeData as any).xPosition ?? 0,
              yPosition: (getConnectedValue(node.id, "yPosition") as number) ?? (nodeData as any).yPosition ?? 0,
              width: (getConnectedValue(node.id, "width") as number) ?? (nodeData as any).width ?? 100,
              height: (getConnectedValue(node.id, "height") as number) ?? (nodeData as any).height ?? 100,
            });
            output = result;
            resolvedOutputs[node.id] = { outputImage: result.outputUrl };

          // ── Gemini ──
          } else if (nodeData.nodeType === "gemini") {
            const prompt =
              (getConnectedValue(node.id, "prompt") as string) ?? (nodeData as any).prompt;
            if (!prompt) throw new Error("Prompt is required — connect a text source or type directly");

            // Collect ALL images connected to this node's image handle
            // This allows Crop #1 + Crop #2 to both feed into the Final Gemini
            const imageUrls: string[] = getAllConnectedValues(node.id, "image")
              .filter((v): v is string => typeof v === "string" && v.length > 0);

            // Remap legacy/deprecated model names
            const LEGACY_MODEL_MAP: Record<string, string> = {
              "gemini-2.0-flash-exp": "gemini-2.5-flash",
              "gemini-2.0-flash": "gemini-2.5-flash",
              "gemini-2.0-flash-lite": "gemini-2.5-flash",
            };
            const resolvedModel = LEGACY_MODEL_MAP[(nodeData as any).model] ?? (nodeData as any).model ?? "gemini-2.5-flash";
            const result = await executeGemini({
              model: resolvedModel,
              prompt,
              systemPrompt:
                (getConnectedValue(node.id, "systemPrompt") as string) ?? (nodeData as any).systemPrompt,
              imageUrls: imageUrls.length > 0 ? imageUrls : ((nodeData as any).imageUrls ?? []),
              temperature: (nodeData as any).temperature ?? 0.7,
              maxTokens: (nodeData as any).maxTokens ?? 2048,
            });
            output = result;
            resolvedOutputs[node.id] = { response: result.text };
          }

          const durationMs = Date.now() - startTime;
          await prisma.nodeRun.update({
            where: { id: nodeRunId },
            data: { status: "SUCCESS", finishedAt: new Date(), durationMs, output: output as object },
          });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          console.error(`[workflow] Node ${node.id} failed:`, error);
          await prisma.nodeRun.update({
            where: { id: nodeRunId },
            data: { status: "FAILED", finishedAt: new Date(), error },
          });
        }
      })
    );
  }

  // ── Step 3: Resolve Response node ──
  const responseNode = nodes.find((n) => (n.data as NodeData).nodeType === "response");
  if (responseNode && nodeRunMap[responseNode.id]) {
    const incomingEdge = edges.find((e) => e.target === responseNode.id);
    let finalOutput: unknown = null;
    if (incomingEdge) {
      const srcOutputs = resolvedOutputs[incomingEdge.source];
      finalOutput =
        srcOutputs?.[incomingEdge.sourceHandle ?? "output"] ??
        srcOutputs?.[Object.keys(srcOutputs ?? {})[0]] ??
        srcOutputs;
    }
    const isImage =
      typeof finalOutput === "string" && (finalOutput as string).startsWith("data:image");

    await prisma.nodeRun.update({
      where: { id: nodeRunMap[responseNode.id] },
      data: {
        status: "SUCCESS",
        startedAt: new Date(),
        finishedAt: new Date(),
        durationMs: 1,
        output: (isImage ? { imageUrl: finalOutput } : { value: finalOutput }) as object,
      },
    });
  }

  // ── Final status ──
  const nodeRuns = await prisma.nodeRun.findMany({ where: { workflowRunId: runId } });
  const hasFailure = nodeRuns.some((n) => n.status === "FAILED");
  const hasSuccess = nodeRuns.some((n) => n.status === "SUCCESS");
  const finalStatus = hasFailure && hasSuccess ? "PARTIAL" : hasFailure ? "FAILED" : "SUCCESS";

  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: finalStatus, finishedAt: new Date() },
  });
}
