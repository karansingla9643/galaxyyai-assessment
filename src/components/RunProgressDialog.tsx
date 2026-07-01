"use client";

import { useEffect, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock4,
  AlertCircle,
  X,
  Play,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRunStore } from "@/store/runStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NodeRunSnapshot {
  nodeId: string;
  nodeType: string;
  nodeLabel: string | null;
  status: string;
  durationMs?: number | null;
  error?: string | null;
}

interface RunProgressDialogProps {
  open: boolean;
  runId: string | null;
  /** Called when the user dismisses the dialog (only after run ends) */
  onClose: () => void;
  /** Called when user wants to view full details */
  onViewDetails?: (runId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; ring: string; dot: string }
> = {
  SUCCESS: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
  },
  COMPLETED: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
  },
  FAILED: {
    label: "Failed",
    color: "text-red-700",
    bg: "bg-red-50",
    ring: "ring-red-200",
    dot: "bg-red-500",
  },
  PARTIAL: {
    label: "Partial",
    color: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
  },
  RUNNING: {
    label: "Running",
    color: "text-blue-700",
    bg: "bg-blue-50",
    ring: "ring-blue-200",
    dot: "bg-blue-500",
  },
  PENDING: {
    label: "Pending",
    color: "text-gray-500",
    bg: "bg-gray-50",
    ring: "ring-gray-200",
    dot: "bg-gray-300",
  },
  SKIPPED: {
    label: "Skipped",
    color: "text-gray-400",
    bg: "bg-gray-50",
    ring: "ring-gray-100",
    dot: "bg-gray-300",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      color: "text-gray-500",
      bg: "bg-gray-50",
      ring: "ring-gray-200",
      dot: "bg-gray-300",
    }
  );
}

function humanizeNodeType(type: string): string {
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Node$/, "")
    .trim();
}

function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function NodeStatusIcon({ status }: { status: string }) {
  if (status === "SUCCESS" || status === "COMPLETED")
    return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
  if (status === "FAILED")
    return <XCircle size={16} className="text-red-500 shrink-0" />;
  if (status === "RUNNING")
    return (
      <Loader2 size={16} className="animate-spin text-blue-500 shrink-0" />
    );
  if (status === "PARTIAL")
    return <AlertCircle size={16} className="text-amber-500 shrink-0" />;
  return <Clock4 size={16} className="text-gray-300 shrink-0" />;
}

// ── Elapsed timer ─────────────────────────────────────────────────────────────

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const tick = () => {
      if (!ref.current) return;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      ref.current.textContent = m > 0 ? `${m}m ${s}s` : `${s}s`;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span ref={ref} />;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  nodeStates,
  isRunning,
}: {
  nodeStates: NodeRunSnapshot[];
  isRunning: boolean;
}) {
  const total = nodeStates.length;
  if (total === 0) return null;

  const done = nodeStates.filter(
    (n) =>
      n.status === "SUCCESS" ||
      n.status === "COMPLETED" ||
      n.status === "FAILED" ||
      n.status === "PARTIAL"
  ).length;

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const hasFailed = nodeStates.some((n) => n.status === "FAILED");

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {done} / {total} nodes
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            hasFailed
              ? "bg-red-400"
              : isRunning
              ? "bg-blue-500"
              : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RunProgressDialog({
  open,
  runId,
  onClose,
  onViewDetails,
}: RunProgressDialogProps) {
  const { runStatus, nodeStates, activeRunId } = useRunStore();
  const startRef = useRef<number>(Date.now());

  // Reset timer on new run
  useEffect(() => {
    if (open) startRef.current = Date.now();
  }, [open, runId]);

  const status = runStatus as string | null;

  const isRunning =
    status === "RUNNING" || status === "PENDING" || !!activeRunId;

  const isFinished =
    status === "SUCCESS" ||
    status === "COMPLETED" ||
    status === "FAILED" ||
    status === "PARTIAL";

  // Build ordered list from nodeStates
  const nodeList: NodeRunSnapshot[] = Object.entries(nodeStates).map(
    ([nodeId, state]) => ({
      nodeId,
      nodeType: state.nodeType ?? "node",
      nodeLabel: state.nodeLabel ?? null,
      status: state.status ?? "PENDING",
      durationMs: state.durationMs,
      error: state.error,
    })
  );

  const overallStatus = (runStatus as string) ?? "RUNNING";

  // Pill label counts
  const completed = nodeList.filter(
    (n) => n.status === "SUCCESS" || n.status === "COMPLETED"
  ).length;
  const running = nodeList.filter((n) => n.status === "RUNNING").length;
  const failed = nodeList.filter((n) => n.status === "FAILED").length;
  const pending = nodeList.filter(
    (n) => n.status === "PENDING" || !n.status
  ).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && isFinished && onClose()}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden rounded-2xl border border-gray-100 shadow-2xl bg-white"
        onInteractOutside={(e) => {
          if (!isFinished) e.preventDefault();
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            {/* Left: icon + title */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isRunning
                    ? "bg-blue-50"
                    : isFinished && overallStatus !== "FAILED"
                    ? "bg-emerald-50"
                    : "bg-red-50"
                }`}
              >
                {isRunning ? (
                  <Loader2
                    size={20}
                    className="animate-spin text-blue-500"
                  />
                ) : overallStatus === "FAILED" ? (
                  <XCircle size={20} className="text-red-500" />
                ) : overallStatus === "PARTIAL" ? (
                  <AlertCircle size={20} className="text-amber-500" />
                ) : (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                )}
              </div>

              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  {isRunning
                    ? "Running Workflow…"
                    : overallStatus === "FAILED"
                    ? "Run Failed"
                    : overallStatus === "PARTIAL"
                    ? "Run Partially Completed"
                    : "Run Completed"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isRunning ? (
                    <>
                      Elapsed:{" "}
                      <span className="font-medium text-gray-600">
                        <ElapsedTimer startedAt={startRef.current} />
                      </span>
                    </>
                  ) : runId ? (
                    <span className="font-mono">{runId.slice(0, 20)}…</span>
                  ) : null}
                </p>
              </div>
            </div>

            {/* Close — only when finished */}
            {isFinished && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status pill bar */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {completed > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {completed} done
              </span>
            )}
            {running > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
                {running} running
              </span>
            )}
            {failed > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {failed} failed
              </span>
            )}
            {pending > 0 && isRunning && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                {pending} waiting
              </span>
            )}
          </div>

          {/* Progress bar */}
          {nodeList.length > 0 && (
            <div className="mt-3">
              <ProgressBar nodeStates={nodeList} isRunning={isRunning} />
            </div>
          )}
        </div>

        {/* ── Node timeline ───────────────────────────────────────────────── */}
        <div className="max-h-72 overflow-y-auto">
          {nodeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Zap size={18} className="text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Initializing run…
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Node updates will appear here as they execute
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {nodeList.map((node, idx) => {
                const nodeCfg = getStatusConfig(node.status);
                const label =
                  node.nodeLabel ||
                  humanizeNodeType(node.nodeType) ||
                  `Node ${idx + 1}`;

                return (
                  <div
                    key={node.nodeId}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      node.status === "RUNNING"
                        ? "border-blue-200 bg-blue-50/60 ring-1 ring-blue-100"
                        : node.status === "FAILED"
                        ? "border-red-200 bg-red-50/40"
                        : node.status === "SUCCESS" ||
                          node.status === "COMPLETED"
                        ? "border-emerald-100 bg-emerald-50/30"
                        : "border-gray-100 bg-gray-50/40"
                    }`}
                  >
                    {/* Step number */}
                    <span className="w-5 h-5 rounded-full bg-white border border-gray-200 text-[9px] font-bold text-gray-400 flex items-center justify-center shrink-0 shadow-sm">
                      {idx + 1}
                    </span>

                    {/* Status icon */}
                    <NodeStatusIcon status={node.status} />

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          node.status === "RUNNING"
                            ? "text-blue-700"
                            : node.status === "FAILED"
                            ? "text-red-700"
                            : node.status === "SUCCESS" ||
                              node.status === "COMPLETED"
                            ? "text-emerald-700"
                            : "text-gray-500"
                        }`}
                      >
                        {label}
                      </p>
                      {node.error && (
                        <p className="text-[10px] text-red-500 truncate mt-0.5">
                          {node.error}
                        </p>
                      )}
                    </div>

                    {/* Duration / status pill */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {node.durationMs != null && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formatMs(node.durationMs)}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${nodeCfg.bg} ${nodeCfg.color} border ${
                          node.status === "RUNNING"
                            ? "border-blue-200"
                            : node.status === "FAILED"
                            ? "border-red-200"
                            : node.status === "SUCCESS" ||
                              node.status === "COMPLETED"
                            ? "border-emerald-200"
                            : "border-gray-200"
                        }`}
                      >
                        {nodeCfg.label.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
          {isRunning ? (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" />
              Processing… do not close this window
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Run {overallStatus === "FAILED" ? "encountered errors" : "finished successfully"}.
            </p>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {isFinished && onViewDetails && runId && (
              <button
                onClick={() => {
                  onViewDetails(runId);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
              >
                <Play size={11} fill="currentColor" />
                View Details
              </button>
            )}
            {isFinished && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
