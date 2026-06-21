"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RequestInputsNode } from "./nodes/RequestInputsNode";
import { CropImageNode } from "./nodes/CropImageNode";
import { ResponseNode } from "./nodes/ResponseNode";
import { ExtractAudioNode } from "./nodes/ExtractAudioNode";
import { GeminiNode } from "./nodes/GeminiNode";
import type { NodeTypes, EdgeTypes } from "@xyflow/react";
import { DeletableEdge } from "./DeletableEdge";

const nodeTypes: NodeTypes = {
  requestInputs: RequestInputsNode as any,
  cropImage: CropImageNode as any,
  responseNode: ResponseNode as any,
  extractAudio: ExtractAudioNode as any,
  geminiNode: GeminiNode as any,
};

// Register the custom edge type so saved edges with type:"deletable" render
// correctly in the read-only workflow preview (without the delete button)
const edgeTypes: EdgeTypes = {
  deletable: DeletableEdge as any,
};

interface ReadOnlyCanvasProps {
  flowJson: { nodes: Node[]; edges: Edge[] } | null;
}

export default function ReadOnlyCanvas({ flowJson }: ReadOnlyCanvasProps) {
  const nodes = useMemo(() => flowJson?.nodes ?? [], [flowJson]);
  const edges = useMemo(() => flowJson?.edges ?? [], [flowJson]);

  if (!flowJson || nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        <div className="text-center">
          <p className="font-medium text-gray-500">No workflow yet</p>
          <p className="text-xs text-gray-400 mt-1">Click &quot;Edit Workflow&quot; to start building</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnScroll={true}
      panOnScroll={true}
      panOnDrag={true}
      defaultEdgeOptions={{
        type: "smoothstep",
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
        nodeColor="#6366f1"
        maskColor="rgba(248,250,252,0.7)"
      />
    </ReactFlow>
  );
}
