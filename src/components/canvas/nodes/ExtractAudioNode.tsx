"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Music, Loader2, CheckCircle } from "lucide-react";
import { useRunStore } from "@/store/runStore";
import { cn } from "@/lib/utils";

export const ExtractAudioNode = memo(function ExtractAudioNode({ id, data, selected }: NodeProps) {
  const { nodeStates } = useRunStore();
  const nodeState = nodeStates[id];
  const isRunning = nodeState?.status === "RUNNING";
  const isDone = nodeState?.status === "SUCCESS";

  return (
    <div
      className={cn(
        "bg-white border rounded-xl shadow-sm w-60 overflow-hidden transition-all",
        isRunning
          ? "border-blue-400 shadow-blue-100"
          : isDone
          ? "border-blue-300"
          : "border-gray-200",
        selected && "ring-2 ring-indigo-500 border-indigo-500 animate-pulse-glow"
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="video"
        style={{
          left: -8, top: "50%", transform: "translateY(-50%)",
          width: 12, height: 12,
          background: "#3b82f6", border: "2px solid white",
          borderRadius: "50%",
        }}
      />

      {/* Header */}
      <div className="px-3.5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center">
          <Music size={11} className="text-blue-600" />
        </div>
        <span className="text-xs font-semibold text-gray-800">Extract Audio</span>
        {isRunning && <Loader2 size={11} className="ml-auto animate-spin text-blue-500" />}
        {isDone && <CheckCircle size={11} className="ml-auto text-blue-400" />}
        {!isRunning && !isDone && (
          <span className="ml-auto text-[10px] text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded">
            AUDIO
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2.5">
        {/* Format selector */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 mb-1">Format</label>
          <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-blue-300">
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="aac">AAC</option>
          </select>
        </div>

        {/* Output preview */}
        {nodeState?.output ? (
          <div className="border border-blue-100 rounded-lg p-2.5 bg-blue-50/50 text-xs text-blue-700">
            <div className="flex items-center gap-1.5 font-medium">
              <Music size={10} />
              Audio extracted
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center text-xs text-gray-400">
            No output yet
          </div>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="audio"
        style={{
          right: -8, top: "50%", transform: "translateY(-50%)",
          width: 12, height: 12,
          background: "#3b82f6", border: "2px solid white",
          borderRadius: "50%",
        }}
      />
    </div>
  );
});
