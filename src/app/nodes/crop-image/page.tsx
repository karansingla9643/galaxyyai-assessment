"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Upload, RotateCcw, Sparkles, Copy, Loader2, CheckCircle, AlertCircle, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface RunRecord {
  id: string;
  startedAt: Date;
  status: "success" | "failed" | "running";
  durationMs: number;
  credits: string;
  outputUrl?: string;
  geminiAnalysis?: string;
  error?: string;
}

function SliderParam({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        <span className="text-sm font-mono text-gray-700 tabular-nums">{value}</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
}

function RunHistoryTable({ runs }: { runs: RunRecord[] }) {
  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Header */}
      <div className="px-5 py-2.5 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <span className="text-base">🕐</span>
          Run History ({runs.length})
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs font-medium bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100">
            UI Runs
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs font-medium text-gray-500">
            API Runs
          </Button>
          <input
            type="text"
            placeholder="Search by Run ID..."
            className="h-7 px-2.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-indigo-300 placeholder-gray-400 w-44"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-4 px-5 py-2 text-xs font-medium text-gray-400 border-b border-gray-50">
        <span>Date &amp; Time</span>
        <span>Status</span>
        <span>Used credits</span>
        <span>Run ID</span>
      </div>

      {/* Rows */}
      <div className="max-h-44 overflow-y-auto">
        {runs.length === 0 ? (
          <div className="text-center py-7 text-sm text-gray-400">No UI run yet.</div>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              className="grid grid-cols-4 px-5 py-2.5 text-xs border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
            >
              <span className="text-gray-600">
                {run.startedAt.toLocaleString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                  hour: "numeric", minute: "2-digit", hour12: true,
                })}
              </span>
              <span>
                {run.status === "success" ? (
                  <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-[10px] gap-1">
                    <CheckCircle size={9} /> Success
                  </Badge>
                ) : run.status === "running" ? (
                  <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px] gap-1">
                    <Loader2 size={9} className="animate-spin" /> Running
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 text-[10px] gap-1">
                    <AlertCircle size={9} /> Failed
                  </Badge>
                )}
              </span>
              <span className="text-gray-600">{run.credits}</span>
              <span className="text-gray-400 font-mono truncate">{run.id}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative rounded-lg bg-gray-900 border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-xs text-gray-500 font-mono">{language}</span>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-xs text-green-400 overflow-x-auto leading-relaxed font-mono whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function ParamRow({
  name, type, required, description, defaultVal,
}: {
  name: string; type: string; required?: boolean; description: string; defaultVal?: string;
}) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <code className="text-sm font-semibold text-gray-900 font-mono">{name}</code>
        <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-300">{type}</Badge>
        {required && <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 hover:bg-red-100">{required ? "required" : "optional"}</Badge>}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      {defaultVal && <p className="text-xs text-gray-400 mt-0.5">Default: {defaultVal}</p>}
    </div>
  );
}

const API_CURL = `# Start model execution
curl -X POST https://nextflow.app/api/v1/nodes/crop-image/run \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "nodeType": "crop_image",
    "input": {
      "image_url": "https://upload.wikimedia.org/example.jpg",
      "x_percent": 0,
      "y_percent": 0,
      "width_percent": 100,
      "height_percent": 100
    }
  }'

# Poll for result (replace RUN_ID with the runId from above)
curl https://nextflow.app/api/v1/nodes/runs/RUN_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

export default function CropImageNodePage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [xPosition, setXPosition] = useState(0);
  const [yPosition, setYPosition] = useState(0);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [running, setRunning] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOutputUrl(null);
    setGeminiAnalysis(null);
    setError(null);
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setOutputUrl(null);
    setGeminiAnalysis(null);
    setError(null);
    setXPosition(0); setYPosition(0); setWidth(100); setHeight(100);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!imageFile) { setError("Please upload an image first."); return; }
    setRunning(true);
    setError(null);
    setOutputUrl(null);
    setGeminiAnalysis(null);

    const runStart = Date.now();
    const runId = Math.random().toString(36).slice(2, 10).toUpperCase();

    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      const uploadRes = await fetch("/api/upload-image", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Image upload failed");
      const { url: imageUrl } = await uploadRes.json();

      const cropRes = await fetch("/api/nodes/crop-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, xPosition, yPosition, width, height, analyzeWithGemini: true }),
      });

      if (!cropRes.ok) {
        const err = await cropRes.json();
        throw new Error(err.error ?? "Crop failed");
      }

      const result = await cropRes.json();
      const durationMs = Date.now() - runStart;

      setOutputUrl(result.outputUrl);
      if (result.geminiAnalysis) setGeminiAnalysis(result.geminiAnalysis);

      setRuns((prev) => [{
        id: runId, startedAt: new Date(), status: "success",
        durationMs, credits: "~0.005 M",
        outputUrl: result.outputUrl,
        geminiAnalysis: result.geminiAnalysis,
      }, ...prev]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setRuns((prev) => [{
        id: runId, startedAt: new Date(), status: "failed",
        durationMs: Date.now() - runStart, credits: "0 M", error: msg,
      }, ...prev]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-6 py-3.5 border-b border-gray-100 flex items-start gap-3 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/nodes" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ChevronLeft size={14} />
              Nodes
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-900">Crop Image</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-[68px] -mt-0">Crop an image to specified dimensions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="playground" className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 border-b border-gray-100 bg-white">
            <TabsList className="h-auto p-0 bg-transparent rounded-none gap-0 border-0">
              <TabsTrigger
                value="playground"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-gray-500 data-[state=active]:text-gray-900 px-0 pb-2.5 pt-2 mr-6"
              >
                Playground
              </TabsTrigger>
              <TabsTrigger
                value="api"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-gray-500 data-[state=active]:text-gray-900 px-0 pb-2.5 pt-2"
              >
                API
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ─── Playground Tab ─── */}
          <TabsContent value="playground" className="flex flex-col flex-1 overflow-hidden mt-0">
            <div className="flex flex-1 overflow-hidden">
              {/* Input Panel */}
              <div className="w-[420px] border-r border-gray-200 flex flex-col bg-white">
                {/* Input header */}
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Input</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Configure model parameters</p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 text-xs font-semibold gap-1">
                    <span>⚡</span> ~0.005 M
                  </Badge>
                </div>

                {/* Scrollable input body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-5 space-y-5">
                    {/* Image Upload */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Upload an image to crop</p>

                      {imagePreview ? (
                        <div className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity z-10 gap-1.5 text-white text-xs font-medium"
                          >
                            <Upload size={13} /> Change Image
                          </button>
                          <button
                            onClick={() => { setImagePreview(null); setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                            className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow z-20 text-gray-600 hover:text-gray-900 text-sm font-bold leading-none"
                          >
                            ×
                          </button>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imagePreview} alt="Input" className="w-full h-44 object-cover" />
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-xl p-7 flex flex-col items-center gap-2 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                            <Upload size={14} className="text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-500">Upload an image to crop</span>
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </div>

                    <Separator />

                    {/* Sliders */}
                    <div className="space-y-4">
                      <SliderParam
                        label="X Position (%)"
                        description="Horizontal crop start position (percentage from left)"
                        value={xPosition}
                        onChange={setXPosition}
                      />
                      <SliderParam
                        label="Y Position (%)"
                        description="Vertical crop start position (percentage from top)"
                        value={yPosition}
                        onChange={setYPosition}
                      />
                      <SliderParam
                        label="Width (%)"
                        description="Crop width as a percentage of the original image"
                        value={width}
                        onChange={setWidth}
                      />
                      <SliderParam
                        label="Height (%)"
                        description="Crop height as a percentage of the original image"
                        value={height}
                        onChange={setHeight}
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-5 py-3.5 border-t border-gray-100 flex gap-2.5 shrink-0">
                  <Button variant="outline" onClick={handleReset} className="gap-1.5 text-gray-700">
                    <RotateCcw size={13} /> Reset
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    // disabled={running || !imageFile}
                    disabled
                    className="flex-1 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {running ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {running ? "Processing (30s+)…" : "Generate"}
                  </Button>
                </div>
              </div>

              {/* Output Panel */}
              <div className="flex-1 flex flex-col bg-gray-50/60">
                <div className="px-5 py-3.5 border-b border-gray-100 bg-white shrink-0">
                  <h2 className="text-sm font-semibold text-gray-900">Output</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Results from model execution</p>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {running ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                        <Loader2 size={22} className="animate-spin text-indigo-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">Processing image…</p>
                      <p className="text-xs text-gray-400">Processing takes 30+ seconds</p>
                    </div>
                  ) : error ? (
                    <div className="max-w-sm mx-auto bg-white border border-red-200 rounded-xl p-5 text-center mt-10">
                      <AlertCircle size={22} className="text-red-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-red-700 mb-1">Error</p>
                      <p className="text-xs text-red-500">{error}</p>
                    </div>
                  ) : outputUrl ? (
                    <div className="space-y-3 max-w-lg">
                      {/* Cropped image */}
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={outputUrl} alt="Cropped output" className="w-full h-auto max-h-64 object-contain" />
                      </div>

                      {/* Download / copy */}
                      <div className="flex gap-2">
                        <input readOnly value={outputUrl.slice(0, 40) + "…"} className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-500 font-mono focus:outline-none" />
                        <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(outputUrl)} className="gap-1.5">
                          <Copy size={12} /> Copy
                        </Button>
                        <a href={outputUrl} download="cropped.jpg">
                          <Button size="sm" className="bg-gray-900 hover:bg-gray-700 text-white">Download</Button>
                        </a>
                      </div>

                      {/* Gemini Analysis */}
                      {geminiAnalysis && (
                        <div className="bg-white border border-indigo-100 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={13} className="text-indigo-500" />
                            <span className="text-xs font-semibold text-indigo-700">Gemini AI Analysis</span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{geminiAnalysis}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2">
                      {/* Empty output icon */}
                      <div className="w-11 h-11 flex items-center justify-center">
                        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="text-gray-200">
                          <rect x="4" y="4" width="36" height="36" rx="6" stroke="currentColor" strokeWidth="2" />
                          <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="24" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="8" y="24" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="24" y="24" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500">No output yet</p>
                      <p className="text-xs text-gray-400">Configure inputs and click generate</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Run History */}
            <RunHistoryTable runs={runs} />
          </TabsContent>

          {/* ─── API Tab ─── */}
          <TabsContent value="api" className="flex-1 overflow-y-auto mt-0">
            <div className="flex gap-6 p-6 max-w-5xl">
              {/* Left: code */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <select className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none">
                    <option>cURL</option>
                    <option>Python</option>
                    <option>Node.js</option>
                  </select>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigator.clipboard.writeText(API_CURL)}>
                    <Copy size={11} /> Copy
                  </Button>
                </div>
                <CodeBlock code={API_CURL} language="bash" />
              </div>

              {/* Right: docs */}
              <div className="w-80 shrink-0 space-y-6 text-sm">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">API Endpoint</h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs">POST</Badge>
                    <code className="text-xs text-gray-600 font-mono">/api/v1/nodes/crop-image/run</code>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Parameters</h3>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div className="px-4"><ParamRow name="image_url" type="string" required description="Upload an image to crop" defaultVal="()" /></div>
                    <div className="px-4"><ParamRow name="x_percent" type="number" required description="Horizontal crop start position (percentage from left)" defaultVal="Min: 0 · Max: 100" /></div>
                    <div className="px-4"><ParamRow name="y_percent" type="number" required description="Vertical crop start position (percentage from top)" defaultVal="Min: 0 · Max: 100" /></div>
                    <div className="px-4"><ParamRow name="width_percent" type="number" required description="Crop width as a percentage of the original image" defaultVal="Min: 1% · Max: 100" /></div>
                    <div className="px-4"><ParamRow name="height_percent" type="number" required description="Crop height as a percentage of the original image" defaultVal="Min: 1% · Max: 100" /></div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Response Format</h3>
                  <p className="text-xs text-gray-500 mb-2">The start endpoint returns a <code className="bg-gray-100 px-1 rounded font-mono">runId</code>. Poll <code className="bg-gray-100 px-1 rounded font-mono">GET /v1/nodes/runs/{"{runId}"}</code> to check status and get output.</p>
                  <CodeBlock code={`{\n  "runId": "run_xk123..."\n}`} language="json" />
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Polling for Result</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-xs">GET</Badge>
                    <code className="text-xs text-gray-600 font-mono">/v1/nodes/runs/{"{runId}"}</code>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Poll every 5 seconds until status is terminal:</p>
                  <div className="flex gap-1.5 mb-3">
                    {["QUEUED", "RUNNING", "COMPLETED", "FAILED"].map((s) => (
                      <span key={s} className={cn("text-[10px] px-2 py-0.5 rounded font-bold", {
                        "bg-gray-100 text-gray-600": s === "QUEUED",
                        "bg-amber-100 text-amber-700": s === "RUNNING",
                        "bg-green-100 text-green-700": s === "COMPLETED",
                        "bg-red-100 text-red-700": s === "FAILED",
                      })}>{s}</span>
                    ))}
                  </div>
                  <CodeBlock language="json" code={JSON.stringify({
                    id: "run_xk123...", nodeType: "crop_image", status: "COMPLETED",
                    output: { result: "https://..." }, creditUsed: 90000,
                    error: null, creditLeft: 90000, createdAt: "2025-01-01T00:00:00.000Z",
                  }, null, 2)} />
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Webhooks (Optional)</h3>
                  <p className="text-xs text-gray-500 mb-3">Add a <code className="bg-gray-100 px-1 rounded font-mono">webhook</code> object to your request body to receive live status updates instead of polling.</p>
                  <CodeBlock language="json" code={JSON.stringify({
                    webhook: {
                      url: "https://your-server.com/webhook",
                      events: ["run.started", "run.completed", "run.failed"],
                      metadata: { myCustomField: "value" },
                      headers: { "X-Custom-Header": "value" },
                    }
                  }, null, 2)} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
