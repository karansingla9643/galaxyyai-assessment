"use client";

import Link from "next/link";
import { Crop, Music, Sparkles, ArrowRight } from "lucide-react";
import { useEffect } from "react";

interface NodeDef {
  id: string;
  slug: string;
  label: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  creditCost: string;
  functional: boolean;
}

const NODES: NodeDef[] = [
  {
    id: "crop-image",
    slug: "crop-image",
    label: "Crop Image",
    description: "Crop an image to a specific region using X, Y, width, and height percentages.",
    category: "Image",
    icon: <Crop size={20} />,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    creditCost: "~0.01 M",
    functional: true,
  },
  {
    id: "extract-audio",
    slug: "extract-audio",
    label: "Extract Audio",
    description: "Extract audio track from a video file. Supports MP3, WAV, and AAC output formats.",
    category: "Audio",
    icon: <Music size={20} />,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    creditCost: "~0.02 M",
    functional: true,
  },
  {
    id: "gemini",
    slug: "gemini",
    label: "Gemini 2.0 Flash",
    description: "Google's powerful multimodal LLM. Supports text, images, video, and audio inputs.",
    category: "LLM",
    icon: <Sparkles size={20} />,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    creditCost: "~0.05 M",
    functional: false,
  },
];

const CATEGORIES = ["All"];

export default function NodesPage() {
  useEffect(() => {
    console.log(
      `Candidate LinkedIn: ${process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/YOUR-HANDLE"}`
    );
  }, []);
  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nodes</h1>
        <p className="text-sm text-gray-400 mt-0.5">Run individual AI models and tools.</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${cat === "All"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Node grid */}
      <div className="grid grid-cols-3 gap-4">
        {NODES.map((node) => (
          <Link
            key={node.id}
            href={node.functional ? `/nodes/${node.slug}` : "#"}
            className={`group border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md hover:border-gray-300 transition-all ${!node.functional ? "opacity-60 pointer-events-none" : ""
              }`}
          >
            {/* Icon + badge */}
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${node.iconBg} flex items-center justify-center`}>
                <span className={node.iconColor}>{node.icon}</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {node.category}
              </span>
            </div>

            {/* Text */}
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{node.label}</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">{node.description}</p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                ⚡ {node.creditCost}
              </span>
              {node.functional && (
                <span className="flex items-center gap-1 text-xs text-indigo-500 font-medium group-hover:gap-2 transition-all">
                  Open
                  <ArrowRight size={12} />
                </span>
              )}
              {!node.functional && (
                <span className="text-xs text-gray-400">Coming soon</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
