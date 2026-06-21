"use client";

import { useState, useCallback, useRef } from "react";
import {
  Plus,
  Play,
  Undo2,
  Redo2,
  Download,
  Upload,
  History,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useFlowStore } from "@/store/flowStore";
import { useRunStore } from "@/store/runStore";
import NodePicker from "./NodePicker";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  workflowId: string;
}

export default function Toolbar({ workflowId }: ToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { nodes, edges, setNodes, setEdges, workflowName } = useFlowStore();
  const { toggleHistoryPanel, startRun, setNodeStatus, finishRun, addRun } = useRunStore();
  const { undo, redo, pastStates, futureStates } = useFlowStore.temporal.getState();

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "FULL", flowJson: { nodes, edges } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");

      startRun(data.runId);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/runs/${data.runId}`);
          const runData = await pollRes.json();

          // Update per-node status
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
  }, [workflowId, nodes, edges, startRun, setNodeStatus, finishRun, addRun]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify({ nodes, edges, name: workflowName }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, workflowName]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
      } catch {
        alert("Invalid workflow JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [setNodes, setEdges]);

  return (
    <>
      {/* Bottom center floating toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-[#13131f]/90 backdrop-blur-xl border border-white/[0.1] rounded-2xl px-2 py-1.5 shadow-2xl shadow-black/40">

        {/* Add node */}
        <button
          id="add-node-btn"
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={13} />
          Add
        </button>

        <div className="w-px h-5 bg-white/[0.08] mx-0.5" />

        {/* Undo/Redo */}
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] disabled:opacity-30 transition-all"
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] disabled:opacity-30 transition-all"
          title="Redo"
        >
          <Redo2 size={14} />
        </button>

        <div className="w-px h-5 bg-white/[0.08] mx-0.5" />

        {/* Zoom */}
        <button
          onClick={() => zoomIn()}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => zoomOut()}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          title="Fit View"
        >
          <Maximize2 size={14} />
        </button>

        <div className="w-px h-5 bg-white/[0.08] mx-0.5" />

        {/* Export/Import */}
        <button
          onClick={handleExport}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          title="Export JSON"
        >
          <Download size={14} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          title="Import JSON"
        >
          <Upload size={14} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />

        <div className="w-px h-5 bg-white/[0.08] mx-0.5" />

        {/* History */}
        <button
          onClick={toggleHistoryPanel}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          title="Run History"
        >
          <History size={14} />
        </button>

        <div className="w-px h-5 bg-white/[0.08] mx-0.5" />

        {/* Run */}
        <button
          id="run-workflow-btn"
          onClick={handleRun}
          disabled={running}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-xl transition-all shadow-lg",
            running
              ? "bg-emerald-600/70 shadow-emerald-500/10"
              : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
          )}
        >
          {running ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Play size={13} />
          )}
          {running ? "Running…" : "Run"}
        </button>
      </div>

      {/* Node Picker */}
      {pickerOpen && (
        <NodePicker onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}
