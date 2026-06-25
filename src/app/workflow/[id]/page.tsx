"use client";

import { useEffect, use, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Play, Loader2, Upload, ImageIcon, X, GripHorizontal, CheckCircle2, XCircle, AlertCircle, Clock4, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReactFlowProvider } from "@xyflow/react";
import dynamic from "next/dynamic";
import { formatLabel } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import RunDetailDialog from "@/components/RunDetailDialog";

// Lazy-load the read-only canvas (no SSR)
const ReadOnlyCanvas = dynamic(
  () => import("@/components/canvas/ReadOnlyCanvas"),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading canvas…</div> }
);

interface RunRecord {
  id: string;
  status: string;
  scope: string;
  startedAt: string;
  finishedAt: string | null;
}

interface NodeRun {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string | null;
  status: string;
  inputs: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

interface FullRunDetail extends RunRecord {
  nodeRuns: NodeRun[];
}

interface WorkflowData {
  id: string;
  name: string;
  flowJson: { nodes: any[]; edges: any[] } | null;
  workflowType: string;
  runs: RunRecord[];
  createdAt: string;
  updatedAt: string;
}

// ── Playground input field types ─────────────────────────────────
type FieldType = "text_field" | "image_field" | "select_field";

interface InputField {
  id: string;
  type: FieldType;
  label: string;
  value: string;
  options?: string[];
}



function deriveInputFields(flowJson: WorkflowData["flowJson"]): InputField[] {
  if (!flowJson) return [];
  const reqNode = flowJson.nodes.find((n: any) => n.type === "requestInputs");
  if (!reqNode) return [];
  return (reqNode.data?.fields ?? []).map((f: any) => ({
    id: f.id,
    // Normalize legacy types
    type: f.type === "image_field" ? "image_field"
      : f.type === "text_field" ? "text_field"
        : f.type === "image" ? "image_field"
          : f.type === "text" ? "text_field"
            : (f.type as FieldType),
    label: f.label ?? "input",
    // Preserve any already-uploaded value from the node
    value: f.value ?? "",
    options: f.options,
  }));
}

// ── Image upload field ────────────────────────────────────────────
function ImageUploadField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) onChange(data.url);
      else throw new Error(data.error ?? "Upload failed");
    } catch (e) {
      alert("Upload failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploading(false);
    }
  };

  if (value) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt={label} className="w-full max-h-48 object-cover" />
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
        <button
          onClick={() => onChange("")}
          className="absolute top-2 right-2 w-7 h-7 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-full flex items-center justify-center shadow-sm transition-all group"
        >
          <X size={13} className="text-gray-400 group-hover:text-red-500" />
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="absolute bottom-2 right-2 text-[10px] bg-white/90 backdrop-blur-sm border border-gray-200 px-2 py-1 rounded-lg text-gray-600 hover:text-gray-900 shadow-sm"
        >
          Replace
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
      onClick={() => fileRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all ${dragOver
        ? "border-indigo-400 bg-indigo-50"
        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }`}
    >
      {uploading ? (
        <Loader2 size={22} className="animate-spin text-gray-400" />
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Upload size={18} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Upload image</p>
            <p className="text-xs text-gray-400 mt-0.5">Drag & drop or click to browse</p>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
    </div>
  );
}

function PlaygroundTab({ workflow }: { workflow: WorkflowData }) {
  const [fields, setFields] = useState<InputField[]>(() => deriveInputFields(workflow.flowJson));
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>(workflow.runs ?? []);
  const [runFilter, setRunFilter] = useState<"UI" | "API">("UI");
  const [runSearch, setRunSearch] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // ── Resize state ──────────────────────────────────────────────────
  const [historyHeight, setHistoryHeight] = useState(35); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshRuns = async () => {
    try {
      const res = await fetch(`/api/workflows/${workflow.id}`);
      const data = await res.json();
      if (data.runs) setRuns(data.runs);
    } catch { /* silent */ }
  };

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    setOutputImage(null);
    setError(null);

    const inputs: Record<string, string> = {};
    for (const f of fields) inputs[f.label] = f.value;

    try {
      const res = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "FULL", inputs, flowJson: workflow.flowJson }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");

      const poll = async (): Promise<void> => {
        const pollRes = await fetch(`/api/runs/${data.runId}`);
        const runData = await pollRes.json();
        if (["PENDING", "RUNNING"].includes(runData.status)) {
          await new Promise((r) => setTimeout(r, 2000));
          return poll();
        }
        if (runData.status === "SUCCESS" || runData.status === "COMPLETED") {
          const responseNodeRun = runData.nodeRuns?.find((nr: any) => nr.nodeType === "response");
          if (responseNodeRun?.output?.imageUrl) setOutputImage(responseNodeRun.output.imageUrl);
          else if (responseNodeRun?.output?.value) setOutput(responseNodeRun.output.value);
          else setOutput(JSON.stringify(runData.output ?? runData.nodeRuns?.map((r: any) => r.output), null, 2));
        } else {
          setError(runData.error ?? "Workflow run failed");
        }
        await refreshRuns();
      };
      await poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  const updateField = (id: string, value: string) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)));

  // ── Resize handlers ─────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRect.height;
      const mouseY = e.clientY - containerRect.top;

      // Calculate percentage from bottom
      const percentFromBottom = ((containerHeight - mouseY) / containerHeight) * 100;

      // Clamp between 15% (minimum) and 50% (maximum)
      const clamped = Math.min(50, Math.max(15, percentFromBottom));
      setHistoryHeight(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const statusConfig: Record<string, { label: string; className: string }> = {
    SUCCESS: { label: "Success", className: "bg-green-100 text-green-700" },
    COMPLETED: { label: "Success", className: "bg-green-100 text-green-700" },
    FAILED: { label: "Failed", className: "bg-red-100 text-red-700" },
    PARTIAL: { label: "Partial", className: "bg-amber-100 text-amber-700" },
    RUNNING: { label: "Running", className: "bg-blue-100 text-blue-700" },
    PENDING: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  };

  const filteredRuns = runs
    .filter((r) => runFilter === "UI" ? r.scope !== "API" : r.scope === "API")
    .filter((r) => !runSearch || r.id.toLowerCase().includes(runSearch.toLowerCase()));

  const formatRunDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      + ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  // Calculate heights based on historyHeight percentage
  const topSectionHeight = 100 - historyHeight;
  const isHistoryMaximized = historyHeight >= 49;
  useEffect(() => {
    console.log(
      `Candidate LinkedIn: ${process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/YOUR-HANDLE"}`
    );
  }, []);
  const isDefault = workflow.workflowType !== "custom";

  return (
    <div ref={containerRef} className="flex flex-col flex-1 overflow-hidden relative">
      {/* ── Top row: Inputs + Output ── */}
      <div
        className="flex border-b border-gray-200 shrink-0"
        style={{ height: isDefault ? "100%" : `${topSectionHeight}%`, minHeight: "30%" }}
      >
        {/* Left: Inputs */}
        <div className="w-[420px] border-r border-gray-200 flex flex-col bg-white shrink-0">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Inputs</h2>
              <p className="text-xs text-gray-400 mt-0.5">Configure the input fields for this workflow run</p>
            </div>
            <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 text-xs gap-1 font-semibold">
              <span>⚡</span> Est. ~1.72 M
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {fields.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">
                <p>No inputs configured.</p>
                <Link href={`/workflow/${workflow.id}/canvas`} className="text-indigo-500 hover:underline text-xs mt-1 block">
                  Open canvas to add inputs →
                </Link>
              </div>
            ) : (
              fields.map((field) => (
                <div key={field.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      {formatLabel(field.label)}
                    </label>
                    <span className="text-[10px] text-gray-400 uppercase font-medium">
                      {field.type === "text_field" ? "Text" : field.type === "image_field" ? "Image" : "Select"}
                    </span>
                  </div>
                  {field.type === "text_field" ? (
                    <Textarea
                      value={field.value}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      placeholder={`Enter ${formatLabel(field.label)}…`}
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 resize-none bg-white"
                    />
                  ) : field.type === "select_field" ? (
                    <select
                      value={field.value}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-300 bg-white appearance-none cursor-pointer"
                    >
                      <option value="">Select…</option>
                      {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === "image_field" ? (
                    <ImageUploadField
                      value={field.value}
                      onChange={(url) => updateField(field.id, url)}
                      label={field.label}
                    />
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center text-xs text-gray-400">
                      Input type: {field.type}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Run button */}
          <div className="px-5 py-3.5 border-t border-gray-100 shrink-0">
            <button
              onClick={handleRun}
              disabled={running}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? "Running…" : "Run"}
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex-1 flex flex-col bg-gray-50/40">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-white shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Output</h2>
            <p className="text-xs text-gray-400 mt-0.5">Results from workflow execution</p>
          </div>
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            {running ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                  <Loader2 size={22} className="animate-spin text-indigo-500" />
                </div>
                <p className="text-sm text-gray-500 font-medium">Running workflow…</p>
              </div>
            ) : error ? (
              <div className="max-w-sm bg-white border border-red-200 rounded-xl p-5 text-center">
                <p className="text-sm font-semibold text-red-700 mb-1">Run failed</p>
                <p className="text-xs text-red-500">{error}</p>
              </div>
            ) : outputImage ? (
              <div className="max-w-lg w-full space-y-3">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={outputImage} alt="Output" className="w-full h-auto max-h-72 object-contain" />
                </div>
              </div>
            ) : output ? (
              <div className="max-w-lg w-full">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {output}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                  <Play size={18} className="text-gray-300 ml-0.5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">No output yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Run the workflow to see results here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {workflow?.workflowType === "custom" && (
        <>
          {/* ── Resize Handle ── */}
          <div
            className={`flex items-center justify-center h-3 cursor-row-resize shrink-0 hover:bg-indigo-50 transition-colors relative group ${isDragging ? "bg-indigo-100" : ""
              }`}
            onMouseDown={handleMouseDown}
          >
            <div
              className={`w-12 h-1 rounded-full transition-all ${isDragging
                  ? "bg-indigo-500 w-16"
                  : "bg-gray-300 group-hover:bg-indigo-400"
                }`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <GripHorizontal
                size={14}
                className={`text-gray-400 transition-opacity ${isDragging
                    ? "text-indigo-500"
                    : "opacity-0 group-hover:opacity-100"
                  }`}
              />
            </div>
          </div>

          {/* ── Bottom: Run History ── */}
          <div
            className="flex flex-col bg-white overflow-hidden shrink-0"
            style={{ height: `${historyHeight}%`, minHeight: "20%" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-400"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>

                <span className="text-sm font-semibold text-gray-900">
                  Run History
                </span>

                <span className="text-xs text-gray-400 font-medium">
                  ({runs.length})
                </span>

                {isHistoryMaximized && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-indigo-600 border-indigo-200 bg-indigo-50"
                  >
                    Max height
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* UI / API toggle */}
                <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setRunFilter("UI")}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${runFilter === "UI"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    UI Runs
                  </button>

                  <button
                    onClick={() => setRunFilter("API")}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${runFilter === "API"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    API Runs
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>

                  <input
                    type="text"
                    placeholder="Search by Run ID…"
                    value={runSearch}
                    onChange={(e) => setRunSearch(e.target.value)}
                    className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-300 w-44 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-gray-500 font-medium">
                      Date &amp; Time
                    </th>
                    <th className="text-left px-5 py-2.5 text-gray-500 font-medium">
                      Status
                    </th>
                    <th className="text-left px-5 py-2.5 text-gray-500 font-medium">
                      Used credits
                    </th>
                    <th className="text-left px-5 py-2.5 text-gray-500 font-medium">
                      Run ID
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRuns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-10 text-gray-400"
                      >
                        No {runFilter === "UI" ? "UI" : "API"} runs yet.
                      </td>
                    </tr>
                  ) : (
                    filteredRuns.map((run) => {
                      const cfg = statusConfig[run.status] ?? {
                        label: run.status,
                        className: "bg-gray-100 text-gray-600",
                      };

                      return (
                        <tr
                          key={run.id}
                          onClick={() => setSelectedRunId(run.id)}
                          className="border-b border-gray-50 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-3 text-gray-700 group-hover:text-indigo-700">
                            {formatRunDate(run.startedAt)}
                          </td>

                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.className}`}
                            >
                              {cfg.label}
                            </span>
                          </td>

                          <td className="px-5 py-3 text-gray-500">—</td>

                          <td className="px-5 py-3 font-mono text-gray-400 group-hover:text-indigo-400">
                            {run.id.slice(0, 20)}…
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Run Detail Dialog */}
      <RunDetailDialog runId={selectedRunId} onClose={() => setSelectedRunId(null)} />
    </div>
  );
}

function APITab({ workflow }: { workflow: WorkflowData }) {
  const curlExample = `curl -X POST https://nextflow.app/api/v1/workflows/${workflow.id}/run \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"inputs": {}}'`;

  return (
    <div className="flex gap-6 p-6 max-w-5xl">
      <div className="flex-1">
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <span className="text-xs text-gray-500 font-mono">bash</span>
            <button
              onClick={() => navigator.clipboard.writeText(curlExample)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Copy
            </button>
          </div>
          <pre className="p-4 text-xs text-green-400 font-mono overflow-x-auto leading-relaxed whitespace-pre">{curlExample}</pre>
        </div>
      </div>
      <div className="w-72 shrink-0 space-y-4 text-sm">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Endpoint</h3>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs">POST</Badge>
            <code className="text-xs text-gray-600 font-mono">/api/v1/workflows/{workflow.id.slice(0, 8)}…/run</code>
          </div>
        </div>
        <Separator />
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Response</h3>
          <div className="bg-gray-900 rounded-lg p-3">
            <pre className="text-xs text-green-400 font-mono">{`{ "runId": "run_abc123..." }`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setWorkflow(data);
      })
      .catch(() => setError("Failed to load workflow"))
      .finally(() => setLoading(false));
  }, [id]);

  const cloneWorkflow = async () => {
    if (!workflow) return;
    setCloning(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${workflow.name} - Copy` }),
      });
      const newWf = await res.json();
      if (!res.ok) throw new Error(newWf.error ?? "Failed to clone");
      // Now save the original flowJson into the new workflow
      await fetch(`/api/workflows/${newWf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowJson: workflow.flowJson }),
      });
      router.push(`/workflow/${newWf.id}/canvas`);
    } catch {
      alert("Failed to clone workflow");
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">{error ?? "Workflow not found"}</p>
        <Link href="/dashboard" className="text-sm text-indigo-500 hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Top bar */}
      <header className="h-11 flex items-center gap-3 px-5 border-b border-gray-200 shrink-0 bg-white">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={14} />
        </Link>
        <span className="text-sm font-semibold text-gray-900">{workflow.name}</span>
      </header>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="playground" className="flex flex-col flex-1 overflow-hidden">
          <div className="px-5 border-b border-gray-200 bg-white shrink-0">
            <TabsList className="h-auto p-0 bg-transparent rounded-none gap-0 border-0">
              {["Playground", "API", "Workflow"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab.toLowerCase()}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-gray-500 data-[state=active]:text-gray-900 px-0 pb-2.5 pt-2 mr-6 cursor-pointer"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Playground */}
          <TabsContent value="playground" className="flex flex-col flex-1 overflow-hidden mt-0">
            <PlaygroundTab workflow={workflow} />
          </TabsContent>

          {/* API */}
          <TabsContent value="api" className="flex-1 overflow-y-auto mt-0">
            <APITab workflow={workflow} />
          </TabsContent>

          {/* Workflow (read-only canvas view) */}
          <TabsContent value="workflow" className="flex flex-col flex-1 overflow-hidden mt-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Workflow Structure</h2>
              {workflow?.workflowType === "custom" && (
                <Link href={`/workflow/${id}/canvas`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Pencil size={12} />
                    Edit Workflow
                  </Button>
                </Link>
              )}
              {workflow?.workflowType === "default" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={cloneWorkflow}
                  disabled={cloning}
                >
                  {cloning ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                  {cloning ? "Cloning..." : "Clone Workflow"}
                </Button>
              )}
            </div>
            <div className="flex-1 relative overflow-hidden bg-[#f8fafc]">
              <ReactFlowProvider>
                <ReadOnlyCanvas flowJson={workflow.flowJson} />
              </ReactFlowProvider>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}