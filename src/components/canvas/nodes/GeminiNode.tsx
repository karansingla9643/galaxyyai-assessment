"use client";

import { memo, useState, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  ChevronRight, ChevronDown, Upload, Loader2, CheckCircle,
  AlertCircle, Info, RefreshCw, MoreHorizontal, Play,
  Sparkles, Maximize2, X,
} from "lucide-react";
import type { GeminiData } from "@/types/nodes";
import { useFlowStore } from "@/store/flowStore";
import { useRunStore } from "@/store/runStore";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// Port colors
const PORT_COLORS: Record<string, string> = {
  text: "#f59e0b",
  image: "#8b5cf6",
  video: "#ec4899",
  audio: "#3b82f6",
  any: "#94a3b8",
};

const MODELS = [
  "Gemini 2.0 Flash",
  "Gemini 2.0 Flash Lite",
  "Gemini 1.5 Pro",
  "Gemini 1.5 Flash",
  "Gemini 1.5 Flash 8B",
];

const MODEL_API_MAP: Record<string, string> = {
  "Gemini 2.5 Flash": "gemini-2.5-flash",
  "Gemini 2.5 Pro": "gemini-2.5-pro",
  "Gemini 2.0 Flash": "gemini-2.0-flash",
  "Gemini 2.0 Flash Lite": "gemini-2.0-flash-lite",
  "Gemini 1.5 Pro": "gemini-1.5-pro",
  "Gemini 1.5 Flash": "gemini-1.5-flash",
  "Gemini 1.5 Flash 8B": "gemini-1.5-flash-8b",
};

// Map api model name → display name
function modelDisplayName(apiName: string): string {
  const found = Object.entries(MODEL_API_MAP).find(([, v]) => v === apiName);
  return found ? found[0] : "Gemini 2.0 Flash";
}

function InputRow({
  label,
  handleId,
  portColor,
  required,
  connected,
  children,
}: {
  label: string;
  handleId: string;
  portColor: string;
  required?: boolean;
  connected?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative mb-3 last:mb-0">
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id={handleId}
        style={{
          left: -20,
          top: connected ? 10 : 12,
          width: 12, height: 12,
          background: portColor,
          border: "2px solid white",
          borderRadius: "50%",
        }}
      />

      {/* Label row */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: portColor }} />
        <span className="text-[11px] font-medium text-gray-700">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </span>
        <button className="ml-auto text-gray-300 hover:text-gray-500">
          <Info size={11} />
        </button>
        <button className="text-gray-300 hover:text-gray-500">
          <span className="text-xs font-bold leading-none">+</span>
        </button>
      </div>

      {children}
    </div>
  );
}

export const GeminiNode = memo(function GeminiNode({ id, data, selected }: NodeProps) {
  const nodeData = data as GeminiData;
  const { updateNodeData, edges } = useFlowStore();
  const { nodeStates } = useRunStore();
  const nodeState = nodeStates[id];
  const isRunning = nodeState?.status === "RUNNING";
  const isDone = nodeState?.status === "SUCCESS";
  const isFailed = nodeState?.status === "FAILED";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine connected handles
  const connectedInputs = new Set(
    edges.filter((e) => e.target === id).map((e) => e.targetHandle)
  );

  const update = (changes: Partial<GeminiData>) =>
    updateNodeData(id, changes as any);

  const response = (nodeState?.output as any)?.response ?? nodeData.response;
  const displayModel = modelDisplayName(nodeData.model ?? "gemini-2.5-flash");

  // Handle temperature change - prevent event propagation
  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();
    update({ temperature: Number(e.target.value) });
  };

  // Handle max tokens change - prevent event propagation
  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();
    update({ maxTokens: Number(e.target.value) });
  };

  return (
    <div className={cn(
      "bg-white border rounded-xl shadow-sm w-72 overflow-hidden transition-all select-none",
      isRunning ? "border-indigo-400 shadow-indigo-100 ring-2 ring-indigo-200" :
        isDone ? "border-emerald-300" :
          isFailed ? "border-red-300" : "border-gray-200",
      selected && "ring-2 ring-indigo-500 border-indigo-500 animate-pulse-glow"
    )}>

      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center gap-2">
        {/* Model selector */}
        <div className="relative flex-1">
          <button
            onClick={() => setModelOpen((o) => !o)}
            className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors flex items-center gap-1"
          >
            {displayModel}
          </button>
          {modelOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {MODELS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    update({ model: MODEL_API_MAP[m] });
                    setModelOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                    displayModel === m ? "text-indigo-600 font-semibold bg-indigo-50" : "text-gray-700"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button className="p-1 text-gray-300 hover:text-gray-600 transition-colors"><Info size={13} /></button>
          <button className="p-1 text-gray-300 hover:text-gray-600 transition-colors"><RefreshCw size={13} /></button>
          <button
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors",
              isRunning
                ? "bg-green-100 text-green-700"
                : "bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
            )}
          >
            {isRunning ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} fill="currentColor" />}
            {isRunning ? "…" : "Run"}
          </button>
          <button className="p-1 text-gray-300 hover:text-gray-600 transition-colors"><MoreHorizontal size={13} /></button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-0">
        {/* ── Prompt (required) ── */}
        <InputRow
          label="Prompt"
          handleId="prompt"
          portColor={PORT_COLORS.text}
          required
          connected={connectedInputs.has("prompt")}
        >
          {connectedInputs.has("prompt") ? (
            <div className="w-full border border-dashed border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 bg-gray-50">
              Value from connected node
            </div>
          ) : (
            <div className="relative">
              <Textarea
                value={nodeData.prompt ?? ""}
                onChange={(e) => update({ prompt: e.target.value })}
                placeholder="Enter your prompt…"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-300 resize-none bg-white"
              />
              <button className="absolute bottom-1.5 right-1.5 text-gray-300 hover:text-gray-500">
                <Maximize2 size={10} />
              </button>
            </div>
          )}
        </InputRow>

        {/* ── System Prompt ── */}
        <InputRow
          label="System Prompt"
          handleId="systemPrompt"
          portColor={PORT_COLORS.text}
          connected={connectedInputs.has("systemPrompt")}
        >
          {connectedInputs.has("systemPrompt") ? (
            <div className="w-full border border-dashed border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 bg-gray-50">
              Value from connected node
            </div>
          ) : (
            <div className="relative">
              <Textarea
                value={nodeData.systemPrompt ?? ""}
                onChange={(e) => update({ systemPrompt: e.target.value })}
                placeholder="Optional system instruction…"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-300 resize-none bg-white"
              />
              <button className="absolute bottom-1.5 right-1.5 text-gray-300 hover:text-gray-500">
                <Maximize2 size={10} />
              </button>
            </div>
          )}
        </InputRow>

        {/* ── Image Vision ── */}
        <InputRow
          label="Image (Vision)"
          handleId="image"
          portColor={PORT_COLORS.image}
          connected={connectedInputs.has("image")}
        >
          {connectedInputs.has("image") ? (
            <div className="border border-dashed border-violet-200 rounded-lg px-3 py-2 text-xs text-violet-500 bg-violet-50">
              Image from connected node
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border border-dashed border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 text-xs text-gray-400 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Upload size={12} />
              Upload Image
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
        </InputRow>

        {/* ── Settings (collapsed) ── */}
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className="flex items-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors w-full"
        >
          {settingsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Settings
        </button>

        {settingsOpen && (
          <div className="border border-gray-100 rounded-xl p-3 space-y-3 bg-gray-50">
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">Temperature ({nodeData.temperature ?? 0.7})</label>
              <input
                type="range"
                min={0} max={2} step={0.01}
                value={nodeData.temperature ?? 0.7}
                onChange={handleTemperatureChange}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-1 accent-indigo-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">Max Tokens</label>
              <input
                type="number"
                min={1} max={8192}
                value={nodeData.maxTokens ?? 2048}
                onChange={handleMaxTokensChange}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-indigo-300 bg-white"
              />
            </div>
          </div>
        )}

        {/* ── Response output ── */}
        <div className="relative mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[11px] font-medium text-gray-700">Response</span>
          </div>

          {isRunning ? (
            <div className="border border-gray-200 rounded-lg px-3 py-4 flex items-center justify-center gap-2 bg-gray-50 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Generating…
            </div>
          ) : response ? (
            <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 max-h-24 overflow-y-auto whitespace-pre-wrap bg-white leading-relaxed">
              {response}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg px-3 py-4 text-center text-xs text-gray-400 bg-gray-50">
              No output yet
            </div>
          )}
        </div>

        {/* ── Output handle row — always visible at the bottom ── */}
        <div className="relative flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 font-medium">Output text</span>
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PORT_COLORS.text }} />
          {/* This handle is positioned RIGHT of this div — easy to drag from */}
          <Handle
            type="source"
            position={Position.Right}
            id="response"
            style={{
              right: -18,
              top: "50%",
              transform: "translateY(-50%)",
              width: 13,
              height: 13,
              background: PORT_COLORS.text,
              border: "2.5px solid white",
              borderRadius: "50%",
              boxShadow: "0 0 0 1px #f59e0b40",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Sparkles size={9} />
          <span>~0.0001 M</span>
        </div>
        {isFailed && (
          <div className="flex items-center gap-1 text-[10px] text-red-500">
            <AlertCircle size={9} />
            <span>{nodeState?.error ?? "Failed"}</span>
          </div>
        )}
        {isDone && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-500">
            <CheckCircle size={9} />
            <span>Done</span>
          </div>
        )}
      </div>
    </div>
  );
});