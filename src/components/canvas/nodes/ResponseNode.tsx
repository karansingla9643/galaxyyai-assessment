"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag, CheckCircle, Loader2, Copy } from "lucide-react";
import type { ResponseData } from "@/types/nodes";
import { useRunStore } from "@/store/runStore";
import { cn } from "@/lib/utils";

const PORT_COLORS: Record<string, string> = {
  text: "#f59e0b",
  image: "#8b5cf6",
  any: "#94a3b8",
};

export const ResponseNode = memo(function ResponseNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ResponseData;
  const { nodeStates } = useRunStore();
  const nodeState = nodeStates[id];
  const isRunning = nodeState?.status === "RUNNING";
  const isDone = nodeState?.status === "SUCCESS";

  const value = (nodeState?.output as any)?.value ?? nodeData.value;
  const imageUrl = (nodeState?.output as any)?.imageUrl ?? nodeData.imageUrl;

  return (
    <div className={cn(
      "bg-white border rounded-xl shadow-sm w-56 overflow-hidden transition-all select-none",
      isRunning ? "border-emerald-400 shadow-emerald-100 ring-2 ring-emerald-100" :
      isDone ? "border-emerald-300" : "border-gray-200",
      selected && "ring-2 ring-indigo-500 border-indigo-500 animate-pulse-glow"
    )}>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          left: -8, top: "40%", transform: "translateY(-50%)",
          width: 12, height: 12,
          background: PORT_COLORS.any,
          border: "2px solid white",
          borderRadius: "50%",
        }}
      />

      {/* Header */}
      <div className="px-3.5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center">
          <Flag size={11} className="text-emerald-600" />
        </div>
        <span className="text-xs font-semibold text-gray-800">Response</span>
        <div className="ml-auto flex items-center gap-1">
          {isRunning && <Loader2 size={11} className="animate-spin text-emerald-500" />}
          {isDone && <CheckCircle size={11} className="text-emerald-500" />}
          {!isRunning && !isDone && (
            <span className="text-[10px] text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded">OUTPUT</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 space-y-2">
        {!value && !imageUrl ? (
          <div className="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
            Connect a node to capture output
          </div>
        ) : (
          <>
            {imageUrl && (
              <div className="rounded-lg overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Output" className="w-full h-auto max-h-32 object-cover" />
              </div>
            )}
            {value && (
              <div className="relative">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono">
                  {value}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(value)}
                  className="absolute top-1.5 right-1.5 text-gray-300 hover:text-gray-600 transition-colors"
                >
                  <Copy size={10} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
