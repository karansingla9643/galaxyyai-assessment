"use client";

import { useState, useCallback, useRef } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  // Use a timeout ref to debounce the hide so the button doesn't disappear
  // when the mouse briefly passes between the SVG path and the DOM button
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(true);
  };

  const hide = () => {
    hideTimer.current = setTimeout(() => setHovered(false), 80);
  };

  const handleDelete = useCallback(() => {
    setEdges((es) => es.filter((e) => e.id !== id));
  }, [id, setEdges]);

  const visible = hovered || selected;

  return (
    <>
      {/* Visible animated edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: visible ? 2.5 : 2,
          opacity: visible ? 1 : 0.85,
          transition: "stroke-width 0.12s, opacity 0.12s",
        }}
      />

      {/* Transparent wide hit area — 28px wide so it's easy to hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={28}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{ cursor: "pointer", pointerEvents: "stroke" }}
      />

      {/* Delete button in HTML layer — always rendered, just hidden */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            // Always present in DOM so mouse can slide from path → button seamlessly
            pointerEvents: "all",
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <button
            onClick={handleDelete}
            title="Remove connection"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.5)",
              transition: "opacity 0.12s ease, transform 0.12s ease",
              pointerEvents: visible ? "all" : "none",
            }}
            className="w-[22px] h-[22px] bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md border-[2.5px] border-white cursor-pointer"
          >
            <X size={9} strokeWidth={3.5} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
