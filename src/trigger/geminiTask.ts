import { task, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

const GeminiPayload = z.object({
  nodeRunId: z.string(),
  workflowRunId: z.string(),
  model: z.string().default("gemini-2.0-flash"),
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  temperature: z.number().default(0.7),
  maxTokens: z.number().default(2048),
});

export type GeminiPayloadType = z.infer<typeof GeminiPayload>;

function getImageMimeType(url: string): string {
  if (url.startsWith("data:")) return url.split(";")[0].split(":")[1];
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg",
    png: "image/png", webp: "image/webp", gif: "image/gif",
  };
  return mimeTypes[ext ?? ""] ?? "image/jpeg";
}

async function urlToBase64Part(url: string, mimeType: string): Promise<Part> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    return { inlineData: { data: base64, mimeType } };
  }
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return { inlineData: { data: base64, mimeType } };
}

export const geminiTask = task({
  id: "gemini-generate",
  maxDuration: 120, // 2 minutes
  run: async (payload: GeminiPayloadType) => {
    const {
      nodeRunId, workflowRunId, model,
      prompt, systemPrompt, imageUrls,
      temperature, maxTokens,
    } = payload;

    logger.info("Starting Gemini task", { nodeRunId, workflowRunId, model });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    });

    // Build content parts
    const parts: Part[] = [];

    if (imageUrls && imageUrls.length > 0) {
      logger.info(`Processing ${imageUrls.length} image(s) for vision`);
      for (const imgUrl of imageUrls) {
        try {
          const mimeType = getImageMimeType(imgUrl) as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
          const imgPart = await urlToBase64Part(imgUrl, mimeType);
          parts.push(imgPart);
        } catch (err) {
          logger.warn(`Failed to fetch image ${imgUrl}`, { error: err });
        }
      }
    }

    parts.push({ text: prompt });

    logger.info("Sending request to Gemini", { partsCount: parts.length });

    const result = await geminiModel.generateContent({ contents: [{ role: "user", parts }] });
    const response = result.response;
    const text = response.text();

    logger.info("Gemini task complete", { responseLength: text.length });

    return {
      text,
      nodeRunId,
      workflowRunId,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  },
});
