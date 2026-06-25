"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock4,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NodeRun {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string | null;
  status: string;
  inputs: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

export interface RunDetail {
  id: string;
  status: string;
  scope: string;
  startedAt: string;
  finishedAt: string | null;
  nodeRuns: NodeRun[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusChip: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  RUNNING: "bg-blue-100 text-blue-700",
  PENDING: "bg-gray-100 text-gray-600",
};

function statusIcon(s: string) {
  if (s === "SUCCESS" || s === "COMPLETED")
    return <CheckCircle2 size={14} className="text-green-500 shrink-0" />;
  if (s === "FAILED")
    return <XCircle size={14} className="text-red-500 shrink-0" />;
  if (s === "RUNNING")
    return <Loader2 size={14} className="animate-spin text-blue-500 shrink-0" />;
  if (s === "PARTIAL")
    return <AlertCircle size={14} className="text-amber-500 shrink-0" />;
  return <Clock4 size={14} className="text-gray-400 shrink-0" />;
}

function nodeLabel(nr: NodeRun): string {
  return (
    nr.nodeLabel ??
    nr.nodeType
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim()
  );
}

function formatMs(ms: number | null): string {
  return ms == null ? "—" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function getFinalResponse(nodeRuns: NodeRun[] | undefined): string | null {
  const responseNodeRun = nodeRuns?.find((nr) => nr.nodeType === "response");
  return (
    (responseNodeRun?.output?.value as string) ??
    (responseNodeRun?.output?.imageUrl as string) ??
    (Object.keys(responseNodeRun?.output ?? {}).length > 0
      ? JSON.stringify(responseNodeRun?.output, null, 2)
      : null)
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface RunDetailDialogProps {
  /** Pass either a runId (will fetch) or a pre-loaded run object */
  runId?: string | null;
  run?: RunDetail | null;
  onClose: () => void;
}

export default function RunDetailDialog({
  runId,
  run: externalRun,
  onClose,
}: RunDetailDialogProps) {
  const [run, setRun] = useState<RunDetail | null>(externalRun ?? null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // If a runId is provided, fetch the run data
  useEffect(() => {
    if (externalRun !== undefined) {
      setRun(externalRun ?? null);
      return;
    }
    if (!runId) {
      setRun(null);
      return;
    }
    setLoading(true);
    setExpandedNodes(new Set());
    fetch(`/api/runs/${runId}`)
      .then((r) => r.json())
      .then(setRun)
      .catch(() => setRun(null))
      .finally(() => setLoading(false));
  }, [runId, externalRun]);

  const toggleNode = (id: string) =>
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const isOpen = externalRun !== undefined ? !!externalRun : !!runId;
  const finalResponse = getFinalResponse(run?.nodeRuns);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-full bg-white rounded-2xl border border-gray-100 shadow-2xl p-0 overflow-hidden max-h-[88vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Run Details
              </DialogTitle>
              {run && (
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{run.id}</p>
              )}
            </div>
            {run && (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusChip[run.status] ?? "bg-gray-100 text-gray-600"
                  }`}
              >
                {run.status}
              </span>
            )}
          </div>
          {run && (
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>Started: {formatDate(run.startedAt)}</span>
              {run.finishedAt && (
                <span>
                  Duration:{" "}
                  {formatMs(
                    new Date(run.finishedAt).getTime() -
                    new Date(run.startedAt).getTime()
                  )}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-gray-300" />
            </div>
          ) : !run ? (
            <div className="text-center py-10 text-sm text-gray-400">
              Failed to load run details.
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Final Response highlight */}
              {finalResponse && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide">
                    Final Response
                  </p>
                  {typeof finalResponse === "string" &&
                    finalResponse.startsWith("http") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={finalResponse}
                      alt="Output"
                      className="w-full max-h-48 object-contain rounded-lg"
                    />
                  ) : (
                    <p className="text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed">
                      {String(finalResponse)}
                    </p>
                  )}
                </div>
              )}

              {/* Node run timeline */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Node Runs ({run.nodeRuns?.length ?? 0})
                </p>
                <div className="space-y-2">
                  {(run.nodeRuns ?? []).map((nr, idx) => {
                    const isExpanded = expandedNodes.has(nr.id);
                    const hasOutput =
                      nr.output && Object.keys(nr.output).length > 0;
                    const hasError = !!nr.error;

                    return (
                      <div
                        key={nr.id}
                        className="border border-gray-200 rounded-xl overflow-hidden"
                      >
                        {/* Row header */}
                        <button
                          onClick={() =>
                            (hasOutput || hasError) && toggleNode(nr.id)
                          }
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${hasOutput || hasError
                            ? "hover:bg-gray-50 cursor-pointer"
                            : "cursor-default"
                            }`}
                        >
                          {/* Step number */}
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          {statusIcon(nr.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {nodeLabel(nr)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatMs(nr.durationMs)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusChip[nr.status] ?? "bg-gray-100 text-gray-600"
                              }`}
                          >
                            {nr.status}
                          </span>
                          {(hasOutput || hasError) &&
                            (isExpanded ? (
                              <ChevronDown
                                size={13}
                                className="text-gray-400 shrink-0"
                              />
                            ) : (
                              <ChevronRight
                                size={13}
                                className="text-gray-400 shrink-0"
                              />
                            ))}
                        </button>

                        {/* Expanded output */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/50">
                            {hasError && (
                              <div className="mb-3">
                                <p className="text-[10px] font-semibold text-red-600 uppercase mb-1">
                                  Error
                                </p>
                                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 font-mono whitespace-pre-wrap">
                                  {nr.error}
                                </p>
                              </div>
                            )}
                            {hasOutput && (
                              <div>
                                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                                  Output
                                </p>
                                <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-2.5 font-mono whitespace-pre-wrap overflow-x-auto max-h-40">
                                  {JSON.stringify(nr.output, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
