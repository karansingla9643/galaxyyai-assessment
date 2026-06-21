import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/runs/[runId] — get a specific run with node details
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { runId } = await params;

  const run = await prisma.workflowRun.findFirst({
    where: {
      id: runId,
      workflow: { OR: [{ userId }, { isSystem: true }] },
    },
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  });

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(run);
}
