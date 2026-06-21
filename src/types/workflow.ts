import { z } from "zod";

export const WorkflowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  flowJson: z.any(),
  isSystem: z.boolean(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const RenameWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const RunStatus = z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED", "PARTIAL"]);
export const RunScope = z.enum(["FULL", "PARTIAL", "SINGLE"]);
export const NodeStatus = z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED", "SKIPPED"]);

export type RunStatusType = z.infer<typeof RunStatus>;
export type RunScopeType = z.infer<typeof RunScope>;
export type NodeStatusType = z.infer<typeof NodeStatus>;

export const NodeRunSchema = z.object({
  id: z.string(),
  workflowRunId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeLabel: z.string().nullable(),
  status: NodeStatus,
  inputs: z.any().nullable(),
  output: z.any().nullable(),
  error: z.string().nullable(),
  triggerRunId: z.string().nullable(),
  startedAt: z.string().or(z.date()).nullable(),
  finishedAt: z.string().or(z.date()).nullable(),
  durationMs: z.number().nullable(),
});

export const WorkflowRunSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: RunStatus,
  scope: RunScope,
  startedAt: z.string().or(z.date()),
  finishedAt: z.string().or(z.date()).nullable(),
  nodeRuns: z.array(NodeRunSchema).optional(),
});

export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
export type NodeRun = z.infer<typeof NodeRunSchema>;
