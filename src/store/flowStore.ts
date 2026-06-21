"use client";

import { create } from "zustand";
import { temporal } from "zundo";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import type { Node, Edge, NodeChange, EdgeChange, Connection } from "@xyflow/react";
import type { NodeData } from "@/types/nodes";
import { arePortTypesCompatible, NODE_HANDLE_TYPES } from "@/types/nodes";
import { wouldCreateCycle } from "@/lib/dag";
import { generateId } from "@/lib/utils";

export interface FlowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeIds: string[];
  workflowId: string | null;
  workflowName: string;
  isDirty: boolean;

  // Actions
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<Node<NodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (nodeType: string, position?: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  loadFlow: (flow: { nodes: Node<NodeData>[]; edges: Edge[] }) => void;
  setDirty: (dirty: boolean) => void;
}

const PROTECTED_NODE_TYPES = ["request-inputs", "response"];

function createDefaultNodes(): Node<NodeData>[] {
  return [
    {
      id: "request-inputs-1",
      type: "requestInputs",
      position: { x: 80, y: 200 },
      data: {
        nodeType: "request-inputs",
        fields: [
          { id: generateId(), type: "text_field", label: "text_field" },
        ],
      },
      deletable: false,
    },
    {
      id: "response-1",
      type: "responseNode",
      position: { x: 700, y: 200 },
      data: { nodeType: "response" },
      deletable: false,
    },
  ];
}

function getNodeDefaults(nodeType: string): Partial<Node<NodeData>> & { data: NodeData } {
  switch (nodeType) {
    case "crop-image":
    case "cropImage":
      return {
        type: "cropImage",
        data: {
          nodeType: "crop-image",
          xPosition: 0,
          yPosition: 0,
          width: 100,
          height: 100,
          status: "idle",
        } as NodeData,
      };
    case "extract-audio":
    case "extractAudio":
      return {
        type: "extractAudio",
        data: {
          nodeType: "extract-audio",
          format: "mp3",
          status: "idle",
        } as NodeData,
      };
    case "gemini":
    case "geminiNode":
      return {
        type: "geminiNode",
        data: {
          nodeType: "gemini",
          model: "gemini-2.5-flash",
          prompt: "",
          temperature: 0.7,
          maxTokens: 2048,
          status: "idle",
        } as NodeData,
      };
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}


export const useFlowStore = create<FlowState>()(
  temporal(
    (set, get) => ({
      nodes: createDefaultNodes(),
      edges: [],
      selectedNodeIds: [],
      workflowId: null,
      workflowName: "Untitled Workflow",
      isDirty: false,

      setNodes: (nodes) => set({ nodes, isDirty: true }),
      setEdges: (edges) => set({ edges, isDirty: true }),

      onNodesChange: (changes) => {
        // Filter out deletions of protected nodes
        const safeChanges = changes.filter((change) => {
          if (change.type === "remove") {
            const node = get().nodes.find((n) => n.id === change.id);
            if (node && PROTECTED_NODE_TYPES.includes((node.data as NodeData).nodeType)) {
              return false;
            }
          }
          return true;
        });
        set({ nodes: applyNodeChanges(safeChanges, get().nodes) as Node<NodeData>[], isDirty: true });
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges), isDirty: true });
      },

      onConnect: (connection) => {
        const { nodes, edges } = get();

        // Find source and target handle metadata
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);
        if (!sourceNode || !targetNode) return;

        const sourceNodeType = (sourceNode.data as NodeData).nodeType;
        const targetNodeType = (targetNode.data as NodeData).nodeType;
        const sourceMeta = NODE_HANDLE_TYPES[sourceNodeType];
        const targetMeta = NODE_HANDLE_TYPES[targetNodeType];

        const sourceHandle = sourceMeta?.outputs.find((h) => h.id === connection.sourceHandle);
        const targetHandle = targetMeta?.inputs.find((h) => h.id === connection.targetHandle);

        // Type safety check
        if (sourceHandle && targetHandle) {
          if (!arePortTypesCompatible(sourceHandle.portType, targetHandle.portType)) {
            return; // Incompatible types — silently reject
          }
        }

        // Choose edge color based on port type
        const portType = sourceHandle?.portType ?? targetHandle?.portType ?? "any";
        const edgeColors: Record<string, string> = {
          text: "#f59e0b",
          image: "#8b5cf6",
          audio: "#3b82f6",
          video: "#ec4899",
          file: "#6366f1",
          any: "#94a3b8",
        };
        const strokeColor = edgeColors[portType] ?? "#94a3b8";

        const newEdge: Edge = {
          id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
          source: connection.source!,
          sourceHandle: connection.sourceHandle,
          target: connection.target!,
          targetHandle: connection.targetHandle,
          type: "deletable",
          animated: true,
          style: { stroke: strokeColor, strokeWidth: 2 },
          data: { portType },
        };

        // DAG cycle check
        if (wouldCreateCycle(nodes, edges, newEdge)) return;

        set({ edges: [...edges, newEdge], isDirty: true });
      },

      addNode: (nodeType, position) => {
        const { nodes } = get();
        const defaults = getNodeDefaults(nodeType);
        const newNode: Node<NodeData> = {
          id: `${nodeType}-${generateId()}`,
          position: position ?? {
            x: 200 + nodes.length * 40,
            y: 200 + nodes.length * 20,
          },
          ...defaults,
        };
        set({ nodes: [...nodes, newNode], isDirty: true });
      },

      deleteNode: (nodeId) => {
        const { nodes, edges } = get();
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        if (PROTECTED_NODE_TYPES.includes((node.data as NodeData).nodeType)) return;

        set({
          nodes: nodes.filter((n) => n.id !== nodeId),
          edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
          isDirty: true,
        });
      },

      updateNodeData: (nodeId, data) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } as NodeData } : n
          ),
          isDirty: true,
        });
      },

      setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
      setWorkflowId: (id) => set({ workflowId: id }),
      setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),

      loadFlow: (flow) => {
        set({
          nodes: flow.nodes,
          edges: flow.edges,
          isDirty: false,
        });
      },

      setDirty: (dirty) => set({ isDirty: dirty }),
    }),
    {
      // Only track node/edge changes for undo/redo
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      limit: 50,
    }
  )
);
