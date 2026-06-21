import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/workflows/[id]/runs — list runs
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const workflow = await prisma.workflow.findFirst({
    where: { id, OR: [{ userId }, { isSystem: true }] },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId: id },
    orderBy: { startedAt: "desc" },
    take: 50,
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  });

  return NextResponse.json(runs);
}
