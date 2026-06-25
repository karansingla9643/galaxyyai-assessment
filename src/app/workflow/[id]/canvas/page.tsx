"use client";

import { useEffect, use, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { ArrowLeft, Loader2, Play, History, Pencil, Check, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Clock, Timer, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useFlowStore } from "@/store/flowStore";
import { useRunStore } from "@/store/runStore";
import { cn } from "@/lib/utils";
import { formatTimestamp, formatDuration } from "@/lib/utils";
import type { WorkflowRun, NodeRun } from "@/types/workflow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const FlowCanvas = dynamic(
  () => import("@/components/canvas/FlowCanvas"),
  { ssr: false }
);

// ── Shared status helpers ─────────────────────────────────────────────────────

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

function outputSnippet(output: unknown, maxLen = 60): string {
  if (!output) return "";
  if (typeof output === "string") return output.slice(0, maxLen);
  const obj = output as Record<string, unknown>;
  if (obj.value && typeof obj.value === "string") return (obj.value as string).slice(0, maxLen);
  if (obj.response && typeof obj.response === "string") return (obj.response as string).slice(0, maxLen);
  if (obj.outputUrl && typeof obj.outputUrl === "string") return "Image: " + (obj.outputUrl as string).slice(0, 32) + "…";
  if (obj.imageUrl && typeof obj.imageUrl === "string") return "Image captured";
  const keys = Object.keys(obj);
  if (keys.length > 0) return keys.join(", ");
  return JSON.stringify(output).slice(0, maxLen);
}

// ── Run Detail Dialog ─────────────────────────────────────────────────────────

function RunDetailDialog({
  run,
  index,
  onClose,
}: {
  run: WorkflowRun | null;
  index: number;
  onClose: () => void;
}) {
  if (!run) return null;

  const nodeRuns = run.nodeRuns ?? [];
  const duration = run.finishedAt
    ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              run.status === "SUCCESS" ? "bg-emerald-400" :
              run.status === "FAILED" ? "bg-red-400" :
              run.status === "PARTIAL" ? "bg-amber-400" : "bg-gray-300"
            )} />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Run #{index}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400">{formatTimestamp(run.startedAt)}</span>
                {duration != null && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Timer size={8} /> {formatDuration(duration)}
                  </span>
                )}
              </div>
            </div>
            <StatusBadge status={run.status} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Node runs */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {nodeRuns.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No node details available</div>
          ) : (
            nodeRuns.map((nr, i) => {
              const snippet = outputSnippet(nr.output);
              const prefix = i === nodeRuns.length - 1 ? "└──" : "├──";
              return (
                <div key={nr.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="text-[10px] text-gray-300 font-mono mt-0.5 shrink-0 select-none">{prefix}</span>
                  <NodeStatusIcon status={nr.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">
                        {nr.nodeLabel ?? nr.nodeType}
                      </span>
                      {nr.durationMs != null && (
                        <span className="text-[10px] text-gray-400 font-mono">{formatDuration(nr.durationMs)}</span>
                      )}
                    </div>
                    {snippet && (
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">→ {snippet}{snippet.length >= 60 ? "…" : ""}</p>
                    )}
                    {nr.error && (
                      <p className="text-[11px] text-red-500 mt-0.5 truncate">✕ {nr.error}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── History Dropdown ──────────────────────────────────────────────────────────

function HistoryDropdown({ workflowId }: { workflowId: string }) {
  const { runs, setRuns } = useRunStore();
  const [open, setOpen] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedRun, setSelectedRun] = useState<{ run: WorkflowRun; index: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/runs`);
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
    } catch {
      setRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  };

  const toggle = () => {
    if (!open) fetchRuns();
    setOpen((v) => !v);
  };

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={toggle}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors",
            open
              ? "bg-gray-100 border-gray-300 text-gray-700"
              : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
          )}
          title="Run History"
        >
          <History size={13} />
          History
          <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700">Run History</p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {loadingRuns ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-gray-300" />
                </div>
              ) : runs.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">No runs yet</div>
              ) : (
                runs.map((run, i) => {
                  const idx = runs.length - i;
                  const duration = run.finishedAt
                    ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
                    : null;
                  return (
                    <button
                      key={run.id}
                      onClick={() => { setSelectedRun({ run, index: idx }); setOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        run.status === "SUCCESS" ? "bg-emerald-400" :
                        run.status === "FAILED" ? "bg-red-400" :
                        run.status === "PARTIAL" ? "bg-amber-400" :
                        run.status === "RUNNING" ? "bg-blue-400 animate-pulse" : "bg-gray-300"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-800">Run #{idx}</span>
                          <StatusBadge status={run.status} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>{formatTimestamp(run.startedAt)}</span>
                          {duration != null && (
                            <span className="flex items-center gap-0.5">
                              <Timer size={8} /> {formatDuration(duration)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-gray-300 shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Run detail dialog */}
      {selectedRun && (
        <RunDetailDialog
          run={selectedRun.run}
          index={selectedRun.index}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkflowCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { loadFlow, setWorkflowId, setWorkflowName, workflowName, nodes, edges, isDirty, setDirty } =
    useFlowStore();
  const { startRun, setNodeStatus, finishRun, addRun, runs } = useRunStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [workflow, setWorkflow] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [runOverlay, setRunOverlay] = useState(false); // full-screen loading
  const [completedRun, setCompletedRun] = useState<{ run: WorkflowRun; index: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    console.log(
      `Candidate LinkedIn: ${process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/YOUR-HANDLE"}`
    );
  }, []);

  // Load workflow
  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setWorkflow(data);
        setWorkflowId(id);
        setWorkflowName(data.name);
        setNameValue(data.name);
        const flow = data.flowJson as { nodes: any[]; edges: any[] } | null;
        if (flow?.nodes) {
          loadFlow({ nodes: flow.nodes, edges: flow.edges ?? [] });
        }
      })
      .catch(() => setError("Failed to load workflow"))
      .finally(() => setLoading(false));
  }, [id, loadFlow, setWorkflowId, setWorkflowName]);

  const save = async () => {
    setSaving(true);
    setSaveStatus("saving");
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowJson: { nodes, edges } }),
      });
      setDirty(false);
      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 3000);
    } catch {
      alert("Save failed");
      setSaveStatus("idle");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save
  useEffect(() => {
    if (!isDirty || loading) return;
    const timer = setTimeout(() => { save(); }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, nodes, edges, loading]);

  const saveName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === workflowName) { setEditingName(false); return; }
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      setWorkflowName(trimmed);
      setNameValue(trimmed);
    } catch {
      alert("Failed to rename workflow");
    } finally {
      setEditingName(false);
    }
  };

  const handleRun = async () => {
    // Validate: requestInputs node must have at least one outgoing edge
    const reqNode = nodes.find((n) => (n.data as any).nodeType === "request-inputs");
    if (reqNode) {
      const hasOutgoing = edges.some((e) => e.source === reqNode.id);
      if (!hasOutgoing) {
        setValidationError("The Request Inputs node is not connected to anything. Connect it to at least one node before running.");
        return;
      }
    }
    setValidationError(null);
    setRunning(true);
    setRunOverlay(true);
    try {
      const res = await fetch(`/api/workflows/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "FULL", flowJson: { nodes, edges } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");

      startRun(data.runId);

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/runs/${data.runId}`);
          const runData = await pollRes.json();

          for (const nodeRun of runData.nodeRuns ?? []) {
            setNodeStatus(nodeRun.nodeId, {
              status: nodeRun.status,
              output: nodeRun.output,
              error: nodeRun.error ?? undefined,
              durationMs: nodeRun.durationMs ?? undefined,
            });
          }

          if (!["PENDING", "RUNNING"].includes(runData.status)) {
            clearInterval(pollInterval);
            finishRun(runData.status);
            addRun(runData);
            setRunning(false);
            setRunOverlay(false);
            // Show the completed run dialog — it's the first run (index = total runs + 1 but we calc after addRun)
            setCompletedRun({ run: runData, index: -1 }); // index will be resolved below
          }
        } catch {
          clearInterval(pollInterval);
          setRunning(false);
          setRunOverlay(false);
        }
      }, 2000);
    } catch (err) {
      console.error("Run error:", err);
      setRunning(false);
      setRunOverlay(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || workflow?.workflowType === "default") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">{error}</p>
        <Link href="/dashboard" className="text-sm text-indigo-500 hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] overflow-hidden">
      {/* Full-screen run loading overlay */}
      {runOverlay && (
        <div className="fixed inset-0 z-50 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Running workflow…</p>
            <p className="text-xs text-gray-400 mt-0.5">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="h-11 flex items-center gap-3 px-4 bg-white border-b border-gray-200 shrink-0 z-10">
        {/* Back */}
        <Link
          href={`/workflow/${id}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={14} />
        </Link>

        {/* Workflow name — inline editable */}
        {editingName ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => saveName(nameValue)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName(nameValue);
                if (e.key === "Escape") { setNameValue(workflowName); setEditingName(false); }
              }}
              className="text-sm font-semibold text-gray-900 bg-white border border-indigo-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-indigo-200 max-w-[220px]"
            />
            <button onClick={() => saveName(nameValue)} className="p-1 text-indigo-500 hover:text-indigo-700">
              <Check size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setNameValue(workflowName); setEditingName(true); }}
            className="flex items-center gap-1.5 group"
            title="Click to rename"
          >
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
              {workflowName}
            </span>
            <Pencil size={11} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
          </button>
        )}

        <div className="flex-1" />

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
            <span className="font-medium">Est.</span>
            <span className="text-amber-600 font-semibold">1.72 M</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
            <span className="font-medium">Bal.</span>
            <span className="text-gray-700 font-semibold">0.00 M</span>
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
            {running ? "Running…" : "Run"}
          </button>

          {/* History dropdown */}
          <HistoryDropdown workflowId={id} />
        </div>
      </header>

      {/* Validation error alert */}
      {validationError && (
        <div className="px-4 pt-3 pb-0 shrink-0">
          <Alert variant="destructive" className="relative">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot run workflow</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
            <button
              onClick={() => setValidationError(null)}
              className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </Alert>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Save Status Badge */}
        {(saveStatus === "saving" || saveStatus === "saved") && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
            {saveStatus === "saving" && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-md">
                <Loader2 size={13} className="animate-spin text-gray-400" />
                <span className="text-xs font-medium text-gray-500">Saving...</span>
              </div>
            )}
            {saveStatus === "saved" && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-md">
                <Check size={13} className="text-green-500" />
                <span className="text-xs font-medium text-green-600">Saved</span>
              </div>
            )}
          </div>
        )}

        <ReactFlowProvider>
          <FlowCanvas workflowId={id} onRun={handleRun} />
        </ReactFlowProvider>
      </div>

      {/* Completed run dialog */}
      {completedRun && (
        <RunDetailDialog
          run={completedRun.run}
          index={runs.length}
          onClose={() => setCompletedRun(null)}
        />
      )}
    </div>
  );
}
