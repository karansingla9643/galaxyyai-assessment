"use client";

import { useState, useCallback } from "react";
import { Search, X, Crop, Sparkles, Clock, Image, Music, Video, MoreHorizontal } from "lucide-react";
import { useFlowStore } from "@/store/flowStore";
import { cn } from "@/lib/utils";

interface NodePickerProps {
  onClose: () => void;
}

type Category = "Recent" | "Image" | "Video" | "Audio" | "Others" | "LLM";

interface NodeDef {
  id: string;
  label: string;
  description: string;
  type: string;
  category: Category[];
  icon: React.ReactNode;
  color: string;
  functional: boolean;
}

const NODE_DEFS: NodeDef[] = [
  {
    id: "crop-image",
    label: "Crop Image",
    description: "Crop an image by specifying X, Y, width, height as percentages.",
    type: "crop-image",
    category: ["Image", "Recent"],
    icon: <Crop size={18} />,
    color: "from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-400",
    functional: true,
  },
  {
    id: "gemini",
    label: "Gemini 2.0 Flash",
    description: "Google's powerful multimodal LLM. Supports text, images, video, and audio.",
    type: "gemini",
    category: ["LLM", "Recent", "Others"],
    icon: <Sparkles size={18} />,
    color: "from-indigo-500/20 to-blue-500/10 border-indigo-500/30 text-indigo-400",
    functional: true,
  },
];

const CATEGORIES: { id: Category; icon: React.ReactNode }[] = [
  { id: "Recent", icon: <Clock size={12} /> },
  { id: "Image", icon: <Image size={12} /> },
  { id: "Video", icon: <Video size={12} /> },
  { id: "Audio", icon: <Music size={12} /> },
  { id: "LLM", icon: <Sparkles size={12} /> },
  { id: "Others", icon: <MoreHorizontal size={12} /> },
];

export default function NodePicker({ onClose }: NodePickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("Recent");
  const { addNode } = useFlowStore();

  const handleAdd = useCallback((nodeType: string) => {
    addNode(nodeType);
    onClose();
  }, [addNode, onClose]);

  const filtered = NODE_DEFS.filter((n) => {
    const matchesSearch = n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = search
      ? true
      : n.category.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-20"
        onClick={onClose}
      />

      {/* Picker panel */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-[480px] bg-[#13131f]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2">
            <Search size={13} className="text-white/30 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search nodes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/25 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/60">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        {!search && (
          <div className="flex gap-1 px-3 py-2 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all",
                  activeCategory === cat.id
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.05]"
                )}
              >
                {cat.icon}
                {cat.id}
              </button>
            ))}
          </div>
        )}

        {/* Node list */}
        <div className="p-3 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-sm text-white/25">
              No nodes found
            </div>
          ) : (
            filtered.map((node) => (
              <button
                key={node.id}
                onClick={() => handleAdd(node.type)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border bg-gradient-to-br transition-all text-left group hover:scale-[1.02]",
                  node.color
                )}
              >
                <div className="shrink-0 mt-0.5">{node.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-white/90 mb-0.5">{node.label}</div>
                  <div className="text-[10px] text-white/40 leading-relaxed">{node.description}</div>
                  {!node.functional && (
                    <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded font-medium">
                      Coming soon
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
