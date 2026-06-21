"use client";

import { memo, useRef } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { Crop, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import type { CropImageData } from "@/types/nodes";
import { useFlowStore } from "@/store/flowStore";
import { useRunStore } from "@/store/runStore";
import { cn } from "@/lib/utils";

// Port color registry
const PORT_COLORS: Record<string, string> = {
  image: "#8b5cf6",
  text: "#f59e0b",
  audio: "#3b82f6",
  video: "#ec4899",
  any: "#94a3b8",
};

function SliderRow({
  label,
  value,
  onChange,
  disabled,
  handleId,
  nodeId,
  connected,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  handleId: string;
  nodeId: string;
  connected?: boolean;
}) {
  return (
    <div className="relative flex items-center gap-2 py-1">
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Left}
        id={handleId}
        style={{
          left: -18,
          top: "50%",
          transform: "translateY(-50%)",
          width: 10,
          height: 10,
          background: PORT_COLORS.any,
          border: "2px solid white",
          borderRadius: "50%",
        }}
      />
      <span className={cn("text-[10px] w-16 shrink-0 font-medium", connected ? "text-gray-400" : "text-gray-500")}>
        {label}
      </span>
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled || connected}
        className="flex-1 h-1 accent-violet-500 disabled:opacity-40 cursor-pointer"
      />
      <span className={cn("text-[10px] w-7 text-right font-mono tabular-nums", connected ? "text-gray-300" : "text-gray-600")}>
        {connected ? "—" : value}
      </span>
    </div>
  );
}

export const CropImageNode = memo(function CropImageNode({ id, data }: NodeProps) {
  const nodeData = data as CropImageData;
  const { updateNodeData, edges } = useFlowStore();
  const { nodeStates } = useRunStore();
  const nodeState = nodeStates[id];
  const isRunning = nodeState?.status === "RUNNING";
  const isDone = nodeState?.status === "SUCCESS";
  const isFailed = nodeState?.status === "FAILED";

  // Determine which handles are connected
  const connectedInputs = new Set(
    edges.filter((e) => e.target === id).map((e) => e.targetHandle)
  );

  const update = (changes: Partial<CropImageData>) =>
    updateNodeData(id, changes as any);

  const outputImage = (nodeState?.output as any)?.outputImage ?? nodeData.outputImage;

  return (
    <div className={cn(
      "bg-white border rounded-xl shadow-sm w-64 overflow-hidden transition-all select-none",
      isRunning ? "border-violet-400 shadow-violet-100 ring-2 ring-violet-200" : 
      isDone ? "border-emerald-300" :
      isFailed ? "border-red-300" : "border-gray-200"
    )}>
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-violet-50 border-b border-violet-100 flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center">
          <Crop size={11} className="text-violet-600" />
        </div>
        <span className="text-xs font-semibold text-gray-800">Crop Image</span>
        <div className="ml-auto flex items-center gap-1">
          {isRunning && <Loader2 size={11} className="animate-spin text-violet-500" />}
          {isDone && <CheckCircle size={11} className="text-emerald-500" />}
          {isFailed && <AlertCircle size={11} className="text-red-500" />}
        </div>
      </div>

      <div className="px-3.5 py-3 space-y-2">
        {/* Input Image handle row */}
        <div className="relative flex items-center gap-2 py-1">
          <Handle
            type="target"
            position={Position.Left}
            id="inputImage"
            style={{
              left: -18, top: "50%", transform: "translateY(-50%)",
              width: 12, height: 12,
              background: PORT_COLORS.image, border: "2px solid white",
              borderRadius: "50%",
            }}
          />
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PORT_COLORS.image }} />
          <span className="text-xs font-medium text-gray-700">
            Input Image <span className="text-red-400">*</span>
          </span>
          {connectedInputs.has("inputImage") && (
            <span className="ml-auto text-[10px] text-violet-500 font-medium">connected</span>
          )}
        </div>

        {/* If no image connected, show placeholder */}
        {!connectedInputs.has("inputImage") && (
          <div className="border border-dashed border-gray-200 rounded-lg py-3 text-center text-xs text-gray-400">
            Connect an image source
          </div>
        )}

        <div className="border-t border-gray-100 pt-2 space-y-0.5">
          <SliderRow label="X Position %" value={nodeData.xPosition ?? 0} onChange={(v) => update({ xPosition: v })}
            handleId="xPosition" nodeId={id} connected={connectedInputs.has("xPosition")} />
          <SliderRow label="Y Position %" value={nodeData.yPosition ?? 0} onChange={(v) => update({ yPosition: v })}
            handleId="yPosition" nodeId={id} connected={connectedInputs.has("yPosition")} />
          <SliderRow label="Width %" value={nodeData.width ?? 100} onChange={(v) => update({ width: v })}
            handleId="width" nodeId={id} connected={connectedInputs.has("width")} />
          <SliderRow label="Height %" value={nodeData.height ?? 100} onChange={(v) => update({ height: v })}
            handleId="height" nodeId={id} connected={connectedInputs.has("height")} />
        </div>

        {/* Output preview */}
        {outputImage && (
          <div className="mt-1 rounded-lg overflow-hidden border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={outputImage} alt="Output" className="w-full h-auto max-h-28 object-cover" />
          </div>
        )}

        {/* Error */}
        {isFailed && nodeState?.error && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-600">
            {nodeState.error}
          </div>
        )}
      </div>

      {/* Output row */}
      <div className="px-3.5 pb-3 border-t border-gray-100 pt-2">
        <div className="relative flex items-center justify-end gap-2">
          <span className="text-[10px] text-gray-500 font-medium">Output Image</span>
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PORT_COLORS.image }} />
          <Handle
            type="source"
            position={Position.Right}
            id="outputImage"
            style={{
              right: -18, top: "50%", transform: "translateY(-50%)",
              width: 12, height: 12,
              background: PORT_COLORS.image, border: "2px solid white",
              borderRadius: "50%",
            }}
          />
        </div>
      </div>
    </div>
  );
});
