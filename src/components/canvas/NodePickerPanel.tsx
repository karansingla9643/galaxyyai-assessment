"use client";

import { useCallback } from "react";
import { Crop, Music, X, Sparkles } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";

interface NodePickerPanelProps {
  onClose: () => void;
}

interface NodeDef {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badge: string;
}

const ADDABLE_NODES: NodeDef[] = [
  {
    type: "cropImage",
    label: "Crop Image",
    description: "Crop an image region using X, Y, width & height percentages.",
    icon: <Crop size={18} />,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    badge: "Image",
  },
  {
    type: "extractAudio",
    label: "Extract Audio",
    description: "Extract an audio track from a video. Outputs MP3, WAV, or AAC.",
    icon: <Music size={18} />,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    badge: "Audio",
  },
  {
    type: "geminiNode",
    label: "Gemini 2.0 Flash",
    description: "Google multimodal LLM. Accepts text, image, video and audio inputs.",
    icon: <Sparkles size={18} />,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    badge: "LLM",
  },
];

export default function NodePickerPanel({ onClose }: NodePickerPanelProps) {
  const { addNode } = useFlowStore();

  const handleAdd = useCallback((type: string) => {
    addNode(type);
    onClose();
  }, [addNode, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-20" onClick={onClose} />

      {/* Panel — pops up above bottom toolbar */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-[380px] bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Add Node</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Node list */}
        <div className="p-3 space-y-2">
          {ADDABLE_NODES.map((node) => (
            <button
              key={node.type}
              onClick={() => handleAdd(node.type)}
              className="w-full flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-left group"
            >
              <div className={`w-9 h-9 rounded-xl ${node.iconBg} flex items-center justify-center shrink-0`}>
                <span className={node.iconColor}>{node.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{node.label}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                    {node.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{node.description}</p>
              </div>
              <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-xs font-medium">+</span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 text-center">
          Click a node to add it to the canvas
        </div>
      </div>
    </>
  );
}
