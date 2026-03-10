"use client";
import React, { useRef, useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";

// Types for nodes and edges (inferred from usage)
type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  type?: string;
  selected?: boolean;
  hovered?: boolean;
};

type Edge = {
  from: string;
  to: string;
  label?: string;
};

type GraphVisualizationProps = {
  nodes: Node[];
  edges: Edge[];
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  selectedNodeId?: string;
  hoveredNodeId?: string;
  className?: string;
};

const NODE_RADIUS = 24;

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  nodes,
  edges,
  width = 600,
  height = 500,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  hoveredNodeId,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const theme = useTheme();

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 2 / zoom;
    edges.forEach((edge) => {
      const from = nodes.find((n) => n.id === edge.from);
      const to = nodes.find((n) => n.id === edge.to);
      if (!from || !to) return;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle =
        node.id === selectedNodeId
          ? "#1976d2"
          : node.id === hoveredNodeId
          ? "#90caf9"
          : "#fff";
      ctx.strokeStyle = "#1976d2";
      ctx.lineWidth = node.id === selectedNodeId ? 4 / zoom : 2 / zoom;
      ctx.fill();
      ctx.stroke();

      // Draw label only if hovered or selected
      if (node.id === selectedNodeId || node.id === hoveredNodeId) {
        ctx.save();
      ctx.fillStyle = "#222";
        ctx.font = `${14 / zoom}px sans-serif`;
      ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(node.label, node.x, node.y - NODE_RADIUS - 6 / zoom);
        ctx.restore();
      }
    });
    ctx.restore();
  }, [nodes, edges, width, height, selectedNodeId, hoveredNodeId, zoom, offset]);

  // Mouse event helpers
  function getNodeAt(canvasX: number, canvasY: number): Node | null {
    // Apply inverse transform for zoom/pan
    const x = (canvasX - offset.x) / zoom;
    const y = (canvasY - offset.y) / zoom;
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < NODE_RADIUS) {
        return node;
      }
    }
    return null;
  }

  function getCanvasCoords(e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragging && lastPos) {
      const { x, y } = getCanvasCoords(e);
      setOffset((prev) => ({
        x: prev.x + (x - lastPos.x),
        y: prev.y + (y - lastPos.y),
      }));
      setLastPos({ x, y });
      return;
    }
    if (!onNodeHover) return;
    const { x, y } = getCanvasCoords(e);
    const node = getNodeAt(x, y);
    onNodeHover(node ? node.id : null);
  }

  function handlePointerLeave() {
    if (onNodeHover) onNodeHover(null);
    setDragging(false);
    setLastPos(null);
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onNodeClick) return;
    const { x, y } = getCanvasCoords(e);
    const node = getNodeAt(x, y);
    if (node) onNodeClick(node.id);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasCoords(e);
    setDragging(true);
    setLastPos({ x, y });
  }

  function handlePointerUp() {
    setDragging(false);
    setLastPos(null);
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const delta = -e.deltaY;
    setZoom((z) => Math.max(0.2, Math.min(5, z + delta * 0.001)));
  }

  return (
    <div style={{ width: "100%", height: "100%", border: `2px solid ${theme.palette.primary.main}`, borderRadius: 8, background: theme.palette.background.paper }} className={className}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height: "100%", display: "block", cursor: dragging ? 'grabbing' : 'grab' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />
    </div>
  );
};

export default GraphVisualization; 