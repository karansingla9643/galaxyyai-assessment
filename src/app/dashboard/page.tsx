"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  GitBranch,
  Clock,
  Loader2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { formatTimestamp } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WorkflowItem {
  id: string;
  name: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  runs: Array<{ status: string }>;
}


function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const configs: Record<string, { label: string; className: string }> = {
    RUNNING: { label: "Running", className: "bg-blue-100 text-blue-700" },
    SUCCESS: { label: "Success", className: "bg-green-100 text-green-700" },
    FAILED: { label: "Failed", className: "bg-red-100 text-red-700" },
    PARTIAL: { label: "Partial", className: "bg-amber-100 text-amber-700" },
  };
  const config = configs[status];
  if (!config) return null;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

function SystemWorkflowCard({ workflow, onClick }: { workflow: WorkflowItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="w-44 border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
    >
      {/* Thumbnail */}
      <div className="h-28 bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
          <GitBranch size={32} className="text-slate-400" />
        </div>
      </div>
      {/* Label */}
      <div className="px-3 py-2.5 bg-white border-t border-gray-100">
        <p className="text-xs font-medium text-gray-800 text-center leading-tight">{workflow.name}</p>
      </div>
    </div>
  );
}

function WorkflowRow({
  workflow,
  onOpen,
  onRename,
  onDelete,
}: {
  workflow: WorkflowItem;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const latestStatus = workflow.runs[0]?.status;

  return (
    <div
      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0"
      onClick={onOpen}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
        <GitBranch size={14} className="text-indigo-500" />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{workflow.name}</span>
          {latestStatus && <StatusBadge status={latestStatus} />}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
          <Clock size={10} />
          <span>{formatTimestamp(workflow.updatedAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onOpen}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          title="Open"
        >
          <ExternalLink size={13} />
        </button>
        {!workflow.isSystem && (
          <>
            <button
              onClick={onRename}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              title="Rename"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="border border-gray-200 rounded-xl p-10 flex flex-col items-center gap-3">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">No workflows yet</h3>
        <p className="text-sm text-gray-500">
          Create your{" "}
          <button onClick={onCreateNew} className="text-indigo-500 hover:underline font-medium">
            first workflow
          </button>{" "}
          to start building.
        </p>
      </div>
      <button
        onClick={onCreateNew}
        className="mt-1 flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        Create workflow
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<WorkflowItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    console.log(
      `Candidate LinkedIn: ${process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/YOUR-HANDLE"}`
    );
  }, []);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows");
      const data = await res.json();
      setWorkflows(Array.isArray(data) ? data : []);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const createWorkflow = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Workflow" }),
      });
      const wf = await res.json();
      router.push(`/workflow/${wf.id}`);
    } catch {
      setCreating(false);
    }
  };

  const deleteWorkflow = async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const startRename = (wf: WorkflowItem) => {
    setRenamingId(wf.id);
    setRenameValue(wf.name);
  };

  const commitRename = async (id: string) => {
    if (!renameValue.trim()) return;
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, name: renameValue } : w)));
    setRenamingId(null);
  };

  const filtered = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );
  const systemWorkflows = filtered.filter((w) => w.isSystem);
  const userWorkflows = filtered.filter((w) => !w.isSystem);

  return (
    <div className="w-full h-full p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flow</h1>
          <p className="text-sm text-gray-400 mt-0.5">Build workflows or run models directly.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createWorkflow}
            disabled={creating}
            className="flex items-center justify-center w-8 h-8 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white rounded-lg transition-colors"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* System Workflows */}
          {systemWorkflows.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">System Workflows</h2>
              <p className="text-xs text-gray-400 mb-4">Prebuilt workflow templates — click to open and start using.</p>
              <div className="flex flex-wrap gap-3">
                {systemWorkflows.map((wf) => (
                  <SystemWorkflowCard
                    key={wf.id}
                    workflow={wf}
                    onClick={() => router.push(`/workflow/${wf.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Your Workflows */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Your Workflows</h2>
                <p className="text-xs text-gray-400 mt-0.5">Open one to edit, run, and review history.</p>
              </div>
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder-gray-400 w-48"
                />
              </div>
            </div>

            {userWorkflows.length === 0 ? (
              <EmptyState onCreateNew={createWorkflow} />
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                {userWorkflows.map((wf) =>
                  renamingId === wf.id ? (
                    <div key={wf.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 last:border-0 bg-indigo-50/50">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(wf.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(wf.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="flex-1 bg-transparent border-b-2 border-indigo-400 text-sm text-gray-900 focus:outline-none pb-0.5"
                      />
                      <button onClick={() => commitRename(wf.id)} className="text-xs text-indigo-500 font-medium hover:text-indigo-700">
                        Save
                      </button>
                    </div>
                  ) : (
                    <WorkflowRow
                      key={wf.id}
                      workflow={wf}
                      onOpen={() => router.push(`/workflow/${wf.id}`)}
                      onRename={() => startRename(wf)}
                      onDelete={() => setDeleteTarget(wf)}
                    />
                  )
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm bg-white rounded-2xl border border-gray-100 shadow-2xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Delete Workflow
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-gray-500 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-800">&quot;{deleteTarget?.name}&quot;</span>?{" "}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteTarget && deleteWorkflow(deleteTarget.id)}
              disabled={deleting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl h-10 border-0"
            >
              {deleting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
