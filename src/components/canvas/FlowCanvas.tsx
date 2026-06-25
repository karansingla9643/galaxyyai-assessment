"use client";

import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useFlowStore } from "@/store/flowStore";
import type { NodeData } from "@/types/nodes";
import { RequestInputsNode } from "./nodes/RequestInputsNode";
import { CropImageNode } from "./nodes/CropImageNode";
import { ResponseNode } from "./nodes/ResponseNode";
import { ExtractAudioNode } from "./nodes/ExtractAudioNode";
import { GeminiNode } from "./nodes/GeminiNode";
import { DeletableEdge } from "./DeletableEdge";
import CanvasToolbar from "./CanvasToolbar";

const nodeTypes: NodeTypes = {
  requestInputs: RequestInputsNode as any,
  cropImage: CropImageNode as any,
  responseNode: ResponseNode as any,
  extractAudio: ExtractAudioNode as any,
  geminiNode: GeminiNode as any,
};

const edgeTypes: EdgeTypes = {
  deletable: DeletableEdge as any,
};

interface FlowCanvasProps {
  workflowId: string;
  onRun?: () => void;
}

export default function FlowCanvas({ workflowId, onRun }: FlowCanvasProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    deleteNode,
  } = useFlowStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        const selectedNodes = nodes.filter((n) => n.selected);
        for (const node of selectedNodes) {
          deleteNode(node.id);
        }
      }
    },
    [nodes, deleteNode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        snapToGrid
        snapGrid={[16, 16]}
        zoomOnScroll={true}
        panOnScroll={false}
        panOnDrag={true}
        defaultEdgeOptions={{
          type: "deletable",
          animated: true,
          style: { stroke: "#f59e0b", strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-[#f8fafc]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e2e8f0"
        />
        <Controls
          className="!bg-white !border-gray-200 !shadow-sm !rounded-xl overflow-hidden"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-white !border-gray-200 !rounded-xl !shadow-sm"
          nodeColor={(node) => {
            const type = (node.data as NodeData)?.nodeType;
            const colors: Record<string, string> = {
              "request-inputs": "#6366f1",
              "crop-image": "#8b5cf6",
              "extract-audio": "#3b82f6",
              "gemini": "#6366f1",
              "response": "#10b981",
            };
            return colors[type ?? ""] ?? "#94a3b8";
          }}
          maskColor="rgba(248,250,252,0.7)"
        />

        <CanvasToolbar workflowId={workflowId} onRun={onRun} />
      </ReactFlow>
    </div>
  );
}
