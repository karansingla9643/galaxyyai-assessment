"use client";

import { useEffect, useState } from "react";
import { X, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Loader2, Clock, Timer } from "lucide-react";
import { useRunStore } from "@/store/runStore";
import { formatTimestamp, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { WorkflowRun, NodeRun } from "@/types/workflow";

// ── Status rendering ─────────────────────────────────────────────────────────

function NodeStatusIcon({ status }: { status: string }) {
  if (status === "SUCCESS") return <CheckCircle size={12} className="text-emerald-500 shrink-0" />;
  if (status === "FAILED") return <AlertCircle size={12} className="text-red-500 shrink-0" />;
  if (status === "RUNNING") return <Loader2 size={12} className="animate-spin text-blue-500 shrink-0" />;
  return <Clock size={12} className="text-gray-300 shrink-0" />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
    RUNNING: "bg-blue-50 text-blue-700 border-blue-200",
    PENDING: "bg-gray-100 text-gray-500 border-gray-200",
  };
  const emoji: Record<string, string> = {
    SUCCESS: "✓", FAILED: "✗", PARTIAL: "~", RUNNING: "…", PENDING: "·",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
      styles[status] ?? styles.PENDING
    )}>
      <span>{emoji[status] ?? "·"}</span>
      {status}
    </span>
  );
}

// ── Pretty output snippet ────────────────────────────────────────────────────

function outputSnippet(output: unknown, maxLen = 48): string {
  if (!output) return "";
  if (typeof output === "string") return output.slice(0, maxLen);
  const obj = output as Record<string, unknown>;
  if (obj.value && typeof obj.value === "string") return (obj.value as string).slice(0, maxLen);
  if (obj.response && typeof obj.response === "string") return (obj.response as string).slice(0, maxLen);
  if (obj.outputUrl && typeof obj.outputUrl === "string") return "Image: " + (obj.outputUrl as string).slice(0, 32) + "…";
  if (obj.imageUrl && typeof obj.imageUrl === "string") return "Image captured";
  // For request-inputs: show field names
  const keys = Object.keys(obj);
  if (keys.length > 0) return keys.join(", ");
  return JSON.stringify(output).slice(0, maxLen);
}

// ── Node type display name ───────────────────────────────────────────────────

function nodeDisplayName(nr: NodeRun, index: number): string {
  const labels: Record<string, string> = {
    "request-inputs": "Request Inputs",
    "crop-image": "Crop Image",
    gemini: "Gemini",
    response: "Response",
    "extract-audio": "Extract Audio",
  };
  const base = nr.nodeLabel ?? labels[nr.nodeType] ?? nr.nodeType;
  return base;
}

// ── Expanded node run row ────────────────────────────────────────────────────

function NodeRunRow({ nr, index, isLast }: { nr: NodeRun; index: number; isLast: boolean }) {
  const snippet = outputSnippet(nr.output);
  const prefix = isLast ? "└──" : "├──";

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[10px] text-gray-300 font-mono mt-0.5 shrink-0 select-none">{prefix}</span>
      <NodeStatusIcon status={nr.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-800">
            {nodeDisplayName(nr, index)}
          </span>
          {nr.durationMs != null && (
            <span className="text-[10px] text-gray-400 font-mono">
              {formatDuration(nr.durationMs)}
            </span>
          )}
        </div>
        {snippet && (
          <p className="text-[10px] text-gray-500 truncate mt-0.5">
            → {snippet}{snippet.length >= 48 ? "…" : ""}
          </p>
        )}
        {nr.error && (
          <p className="text-[10px] text-red-500 mt-0.5 truncate">✕ {nr.error}</p>
        )}
      </div>
    </div>
  );
}

// ── Run item ─────────────────────────────────────────────────────────────────

function RunItem({ run, index }: { run: WorkflowRun; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const nodeRuns = run.nodeRuns ?? [];

  const duration = run.finishedAt
    ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
    : null;

  const scopeLabel: Record<string, string> = {
    FULL: "Full Workflow",
    PARTIAL: "Partial",
    SINGLE: "Single Node",
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Status indicator dot */}
        <div className={cn(
          "w-2 h-2 rounded-full shrink-0",
          run.status === "SUCCESS" ? "bg-emerald-400" :
          run.status === "FAILED" ? "bg-red-400" :
          run.status === "PARTIAL" ? "bg-amber-400" :
          run.status === "RUNNING" ? "bg-blue-400 animate-pulse" : "bg-gray-300"
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-800">Run #{index}</span>
            <StatusBadge status={run.status} />
            <span className="text-[10px] text-gray-400 ml-auto shrink-0">
              {scopeLabel[run.scope] ?? run.scope}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
            <span>{formatTimestamp(run.startedAt)}</span>
            {duration != null && (
              <span className="flex items-center gap-0.5">
                <Timer size={8} />
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>

        {expanded
          ? <ChevronDown size={12} className="text-gray-300 shrink-0" />
          : <ChevronRight size={12} className="text-gray-300 shrink-0" />
        }
      </button>

      {/* Expanded node details */}
      {expanded && nodeRuns.length > 0 && (
        <div className="px-4 pb-3 bg-gray-50/60">
          <div className="pt-1">
            {nodeRuns.map((nr, i) => (
              <NodeRunRow
                key={nr.id}
                nr={nr}
                index={i}
                isLast={i === nodeRuns.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {expanded && nodeRuns.length === 0 && (
        <div className="px-4 pb-3 text-xs text-gray-400 text-center">No node details</div>
      )}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface HistoryPanelProps {
  workflowId: string;
}

export default function HistoryPanel({ workflowId }: HistoryPanelProps) {
  const { runs, setRuns, setHistoryPanelOpen } = useRunStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await fetch(`/api/workflows/${workflowId}/runs`);
        const data = await res.json();
        setRuns(Array.isArray(data) ? data : []);
      } catch {
        setRuns([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, [workflowId, setRuns]);

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 flex flex-col z-10 shadow-xl">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">Run History</h3>
        <button
          onClick={() => setHistoryPanelOpen(false)}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Runs list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Clock size={18} className="text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">No runs yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Run the workflow to see history</p>
            </div>
          </div>
        ) : (
          <div>
            {runs.map((run, i) => (
              <RunItem key={run.id} run={run} index={runs.length - i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
