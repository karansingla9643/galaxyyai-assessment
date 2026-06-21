"use client";

import { useState, useCallback, useRef } from "react";
import {
  Plus,
  Copy,
  Undo2,
  Redo2,
  Maximize2,
  Loader2,
  Download,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useFlowStore } from "@/store/flowStore";
import { useRunStore } from "@/store/runStore";
import NodePickerPanel from "./NodePickerPanel";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  workflowId: string;
  onRun?: () => void;
}

export default function CanvasToolbar({ workflowId, onRun }: CanvasToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { fitView } = useReactFlow();
  const { nodes, edges, setNodes, setEdges, workflowName } = useFlowStore();
  const { undo, redo, pastStates, futureStates } = useFlowStore.temporal.getState();

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

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
      {/* Bottom center floating toolbar — matching Magica screenshot */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-2xl px-2 py-1.5 shadow-lg shadow-gray-200/60">

        {/* Copy node (duplicate selected) */}
        <button
          onClick={() => {
            const selected = nodes.filter((n) => n.selected);
            if (selected.length === 0) return;
            const copies = selected.map((n) => ({
              ...n,
              id: `${n.id}-copy-${Date.now()}`,
              position: { x: n.position.x + 40, y: n.position.y + 40 },
              selected: false,
            }));
            setNodes([...nodes, ...copies]);
          }}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          title="Duplicate selected node"
        >
          <Copy size={15} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Undo / Redo */}
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-all"
          title="Undo"
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-all"
          title="Redo"
        >
          <Redo2 size={15} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Fit view */}
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          title="Fit View"
        >
          <Maximize2 size={15} />
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          title="Export JSON"
        >
          <Download size={15} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Add node — the + button from screenshot */}
        <button
          id="add-node-btn"
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all text-sm font-medium"
          title="Add Node"
        >
          <Plus size={15} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Node Picker panel */}
      {pickerOpen && (
        <NodePickerPanel onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}
