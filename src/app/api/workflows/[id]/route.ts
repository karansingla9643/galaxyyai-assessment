import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RenameWorkflowSchema } from "@/types/workflow";

// GET /api/workflows/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const workflow = await prisma.workflow.findFirst({
    where: { id, OR: [{ userId }, { isSystem: true }, { workflowType: "default" }] },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { nodeRuns: true },
      },
    },
  });

  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(workflow);
}

// PATCH /api/workflows/[id] — rename or save flow
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workflow.isSystem || workflow.workflowType === "default") return NextResponse.json({ error: "Cannot modify default workflows" }, { status: 403 });

  const body = await req.json();

  const updates: { name?: string; flowJson?: object } = {};

  if (body.name !== undefined) {
    const parsed = RenameWorkflowSchema.safeParse({ name: body.name });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    updates.name = parsed.data.name;
  }

  if (body.flowJson !== undefined) {
    updates.flowJson = body.flowJson;
  }

  const updated = await prisma.workflow.update({ where: { id }, data: updates });
  return NextResponse.json(updated);
}

// DELETE /api/workflows/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workflow.isSystem || workflow.workflowType === "default") return NextResponse.json({ error: "Cannot delete default workflows" }, { status: 403 });

  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
