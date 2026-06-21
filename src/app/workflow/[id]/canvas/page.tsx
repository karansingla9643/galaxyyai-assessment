"use client";

import { useEffect, use, useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { ArrowLeft, Save, Loader2, Play, History, Pencil, Check } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useFlowStore } from "@/store/flowStore";
import { useRunStore } from "@/store/runStore";

const FlowCanvas = dynamic(
  () => import("@/components/canvas/FlowCanvas"),
  { ssr: false }
);

export default function WorkflowCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { loadFlow, setWorkflowId, setWorkflowName, workflowName, nodes, edges, isDirty, setDirty } =
    useFlowStore();
  const { toggleHistoryPanel, startRun, setNodeStatus, finishRun, addRun } = useRunStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
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
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowJson: { nodes, edges } }),
      });
      setDirty(false);
    } catch {
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

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
    setRunning(true);
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
          }
        } catch {
          clearInterval(pollInterval);
          setRunning(false);
        }
      }, 2000);
    } catch (err) {
      console.error("Run error:", err);
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">{error}</p>
        <Link href="/dashboard" className="text-sm text-indigo-500 hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden">
      {/* Top bar — matches Magica canvas header */}
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
            <button
              onClick={() => saveName(nameValue)}
              className="p-1 text-indigo-500 hover:text-indigo-700"
            >
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

        {isDirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
        )}

        <div className="flex-1" />

        {/* Right side controls — Est + Bal + Run + History */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
            <span className="font-medium">Est.</span>
            <span className="text-amber-600 font-semibold">1.72 M</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
            <span className="font-medium">Bal.</span>
            <span className="text-gray-700 font-semibold">0.00 M</span>
          </div>

          {/* Save */}
          {isDirty && (
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-medium rounded-lg border border-gray-200 transition-all"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Saving…" : "Save"}
            </button>
          )}

          {/* History */}
          <button
            onClick={toggleHistoryPanel}
            className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
            title="Run History"
          >
            <History size={14} />
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlowProvider>
          <FlowCanvas workflowId={id} onRun={handleRun} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
