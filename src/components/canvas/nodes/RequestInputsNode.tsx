"use client";
import { memo, useState, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plus, Trash2, GripVertical, Image as ImageIcon, Type, Hash, ToggleLeft, Mic, Play, Film, FileText, Upload, X, Loader2 } from "lucide-react";
import type { RequestInputsData } from "@/types/nodes";
import { useFlowStore } from "@/store/flowStore";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "image"
  | "audio"
  | "video"
  | "media"
  | "file";

// Legacy type support
type LegacyFieldType = "text_field" | "image_field";

const fieldTypeConfig = {
  text: { icon: Type, label: "Text", color: "amber", handleColor: "#f59e0b" },
  number: { icon: Hash, label: "Number", color: "blue", handleColor: "#3b82f6" },
  boolean: { icon: ToggleLeft, label: "Boolean", color: "emerald", handleColor: "#10b981" },
  image: { icon: ImageIcon, label: "Image", color: "violet", handleColor: "#8b5cf6" },
  audio: { icon: Mic, label: "Audio", color: "rose", handleColor: "#e11d48" },
  video: { icon: Play, label: "Video", color: "orange", handleColor: "#f97316" },
  media: { icon: Film, label: "Media", color: "purple", handleColor: "#a855f7" },
  file: { icon: FileText, label: "File", color: "slate", handleColor: "#64748b" },
} as const;

function normalizeFieldType(type: FieldType | LegacyFieldType): FieldType {
  if (type === "text_field") return "text";
  if (type === "image_field") return "image";
  return type as FieldType;
}

function FieldRow({
  field,
  onUpdate,
  onDelete,
}: {
  field: {
    id: string;
    type: FieldType | LegacyFieldType;
    label: string;
    value?: string;
    placeholder?: string;
  };
  onUpdate: (id: string, changes: Partial<{ label: string; value: string }>) => void;
  onDelete: (id: string) => void;
}) {
  const normalizedType = normalizeFieldType(field.type);
  const config = fieldTypeConfig[normalizedType];
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!config) return null;

  const Icon = config.icon;
  const isMediaType = ["image", "video", "audio", "media", "file"].includes(normalizedType);
  const hasValue = !!field.value;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) onUpdate(field.id, { value: data.url });
      else throw new Error(data.error ?? "Upload failed");
    } catch (e) {
      alert("Upload failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group mb-3 last:mb-0">
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id={field.id}
        style={{
          right: -9, top: "50%", transform: "translateY(-50%)",
          width: 13, height: 13,
          background: config.handleColor,
          border: "2px solid white",
          borderRadius: "50%",
          zIndex: 10,
        }}
      />

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-gray-300 cursor-grab active:cursor-grabbing">
            <GripVertical size={14} />
          </div>

          <div className={cn("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0", `bg-${config.color}-100`)}>
            <Icon size={13} className={cn(`text-${config.color}-600`)} />
          </div>

          <input
            className="flex-1 bg-transparent text-sm font-medium text-gray-800 focus:outline-none placeholder:text-gray-400"
            value={field.label}
            onChange={(e) => onUpdate(field.id, { label: e.target.value })}
            placeholder="Field name"
          />

          <button
            onClick={() => onDelete(field.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Input area */}
        {isMediaType ? (
          <div>
            {/* Preview if uploaded */}
            {normalizedType === "image" && hasValue && (
              <div className="mb-2 rounded-lg overflow-hidden border border-gray-200 relative group/preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={field.value}
                  alt="Uploaded"
                  className="w-full h-24 object-cover"
                />
                <button
                  onClick={() => onUpdate(field.id, { value: "" })}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity"
                >
                  <X size={9} strokeWidth={3} />
                </button>
              </div>
            )}
            {(normalizedType === "audio" || normalizedType === "video") && hasValue && (
              <div className="mb-2 p-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 flex items-center gap-2">
                <Icon size={12} />
                <span className="truncate">{field.value?.slice(0, 40)}…</span>
                <button onClick={() => onUpdate(field.id, { value: "" })} className="ml-auto text-red-400 hover:text-red-600">
                  <X size={10} />
                </button>
              </div>
            )}

            {/* Upload drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleUpload(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 py-3 cursor-pointer transition-all",
                dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
              )}
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin text-gray-400" />
              ) : (
                <>
                  <Upload size={15} className="text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {hasValue ? "Replace file" : "Upload or drop"}
                  </span>
                  <span className="text-[10px] text-gray-300">or connect a handle</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={
                normalizedType === "image" ? "image/*" :
                  normalizedType === "audio" ? "audio/*" :
                    normalizedType === "video" ? "video/*" : "*"
              }
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
          </div>
        ) : normalizedType === "boolean" ? (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              className="w-4 h-4 accent-indigo-600"
              checked={field.value === "true"}
              onChange={(e) => onUpdate(field.id, { value: e.target.checked.toString() })}
            />
            <span className="text-sm text-gray-600">True / False</span>
          </div>
        ) : normalizedType === "number" ? (
          <input
            type="number"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            placeholder="Enter number..."
            value={field.value ?? ""}
            onChange={(e) => onUpdate(field.id, { value: e.target.value })}
          />
        ) : (
          <Textarea
            className="w-full bg-white border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-indigo-400 resize-y min-h-[42px] placeholder:text-gray-400"
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            value={field.value ?? ""}
            onChange={(e) => onUpdate(field.id, { value: e.target.value })}
            rows={2}
          />
        )}
      </div>
    </div>
  );
}


export const RequestInputsNode = memo(function RequestInputsNode({ id, data }: NodeProps) {
  const nodeData = data as RequestInputsData;
  const { updateNodeData } = useFlowStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const addField = (type: FieldType) => {
    const count = nodeData.fields.filter((f) => normalizeFieldType(f.type) === type).length;
    const baseLabel = fieldTypeConfig[type].label;
    const label = count === 0 ? baseLabel.toLowerCase() : `${baseLabel.toLowerCase()}_${count + 1}`;

    updateNodeData(id, {
      fields: [
        ...nodeData.fields,
        {
          id: generateId(),
          type,
          label,
          value: type === "boolean" ? "false" : "",
        }
      ],
    } as Partial<RequestInputsData>);

    setIsDropdownOpen(false); // Close dropdown after selection
  };

  const updateField = (fieldId: string, changes: Partial<{ label: string; value: string }>) => {
    updateNodeData(id, {
      fields: nodeData.fields.map((f) =>
        f.id === fieldId ? { ...f, ...changes } : f
      ),
    } as Partial<RequestInputsData>);
  };

  const deleteField = (fieldId: string) => {
    updateNodeData(id, {
      fields: nodeData.fields.filter((f) => f.id !== fieldId),
    } as Partial<RequestInputsData>);
  };

  // Close dropdown when clicking outside
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm w-80">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Type size={15} className="text-indigo-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">Request Inputs</div>
            <div className="text-[10px] text-gray-500 -mt-0.5">Define input parameters</div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white border border-gray-200 hover:border-gray-300 transition-all"
          >
            <Plus size={18} className="text-gray-500" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-gray-200 shadow-xl py-1 z-50 text-sm">
              {Object.entries(fieldTypeConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => addField(key as FieldType)}
                    className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-left"
                  >
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center", `bg-${config.color}-100`)}>
                      <Icon size={14} className={cn(`text-${config.color}-600`)} />
                    </div>
                    <span className="text-gray-700">{config.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fields Container */}
      <div className="p-4">
        {nodeData.fields.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
            No inputs yet.<br />Click + to add fields
          </div>
        ) : (
          nodeData.fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              onUpdate={updateField}
              onDelete={deleteField}
            />
          ))
        )}
      </div>
    </div>
  );
});