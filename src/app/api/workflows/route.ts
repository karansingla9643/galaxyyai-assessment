import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateWorkflowSchema } from "@/types/workflow";

// GET /api/workflows — list all workflows for the authenticated user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await prisma.workflow.findMany({
    where: { OR: [{ userId }, { isSystem: true }] },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      isSystem: true,
      createdAt: true,
      updatedAt: true,
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });

  return NextResponse.json(workflows);
}

// POST /api/workflows — create a new workflow
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const defaultFlow = {
    nodes: [
      {
        id: "request-inputs-1",
        type: "requestInputs",
        position: { x: 80, y: 200 },
        data: {
          nodeType: "request-inputs",
          fields: [{ id: "f1", type: "text_field", label: "text_field" }],
        },
        deletable: false,
      },
      {
        id: "response-1",
        type: "responseNode",
        position: { x: 700, y: 200 },
        data: { nodeType: "response" },
        deletable: false,
      },
    ],
    edges: [],
  };

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: parsed.data.name,
      flowJson: defaultFlow,
    },
  });

  return NextResponse.json(workflow, { status: 201 });
}
