"use client";

import { create } from "zustand";
import type { NodeStatusType, RunStatusType, WorkflowRun } from "@/types/workflow";

export interface NodeExecutionState {
  status: NodeStatusType;
  nodeType?: string;
  nodeLabel?: string | null;
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  output?: unknown;
  error?: string;
}

interface RunState {
  activeRunId: string | null;
  runStatus: RunStatusType | null;
  nodeStates: Record<string, NodeExecutionState>; // nodeId → state
  runs: WorkflowRun[];
  historyPanelOpen: boolean;

  // Actions
  startRun: (runId: string) => void;
  setRunStatus: (status: RunStatusType) => void;
  setNodeStatus: (nodeId: string, state: Partial<NodeExecutionState>) => void;
  finishRun: (status: RunStatusType) => void;
  resetRun: () => void;
  setRuns: (runs: WorkflowRun[]) => void;
  addRun: (run: WorkflowRun) => void;
  toggleHistoryPanel: () => void;
  setHistoryPanelOpen: (open: boolean) => void;
}

export const useRunStore = create<RunState>((set) => ({
  activeRunId: null,
  runStatus: null,
  nodeStates: {},
  runs: [],
  historyPanelOpen: false,

  startRun: (runId) =>
    set({ activeRunId: runId, runStatus: "RUNNING", nodeStates: {} }),

  setRunStatus: (status) => set({ runStatus: status }),

  setNodeStatus: (nodeId, state) =>
    set((prev) => ({
      nodeStates: {
        ...prev.nodeStates,
        [nodeId]: { ...(prev.nodeStates[nodeId] ?? {}), ...state },
      },
    })),

  finishRun: (status) =>
    set({ runStatus: status, activeRunId: null }),

  resetRun: () =>
    set({ activeRunId: null, runStatus: null, nodeStates: {} }),

  setRuns: (runs) => set({ runs }),

  addRun: (run) => set((prev) => ({ runs: [run, ...prev.runs] })),

  toggleHistoryPanel: () =>
    set((prev) => ({ historyPanelOpen: !prev.historyPanelOpen })),

  setHistoryPanelOpen: (open) => set({ historyPanelOpen: open }),
}));
