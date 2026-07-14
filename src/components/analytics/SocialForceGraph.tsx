"use client";

import { useEffect, useRef, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import { ZoomIn, ZoomOut, Maximize2, Users, HelpCircle, Activity } from "lucide-react";

interface SocialNode {
  id: number;
  label: string;
  avatar: string | null;
  connections_count: number;
  reputation_earned: number;
  is_super_connector: boolean;
  is_organizer?: boolean;
}

interface SocialEdge {
  source: number | any;
  target: number | any;
  weight: number;
}

interface Props {
  nodes: SocialNode[];
  edges: SocialEdge[];
}

export default function SocialForceGraph({ nodes = [], edges = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<any>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Interactive state
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 });

  // Animation pulse time
  const animationFrameRef = useRef<number | null>(null);
  const pulseTimeRef = useRef(0);

  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Node helper: gets radius based on connections
  const getNodeRadius = (connections: number) => {
    return Math.max(14, Math.min(32, 12 + (connections || 0) * 1.5));
  };

  // Pre-load images
  useEffect(() => {
    nodes.forEach((n) => {
      if (n.avatar && !imageCacheRef.current.has(n.avatar)) {
        const img = new Image();
        img.src = n.avatar;
        img.onload = () => {
          // Force redraw by restarting rendering loop
        };
        imageCacheRef.current.set(n.avatar, img);
      }
    });
  }, [nodes]);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      const { clientWidth } = containerRef.current!;
      setDimensions({
        width: clientWidth,
        height: 400,
      });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Initialize and run Simulation
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    // 1. Filter out invalid nodes and ensure uniqueness by ID
    const uniqueNodesMap = new Map<number, SocialNode>();
    nodes.forEach((n) => {
      if (n && typeof n.id === "number") {
        if (!uniqueNodesMap.has(n.id)) {
          uniqueNodesMap.set(n.id, n);
        }
      }
    });

    const cleanNodes = Array.from(uniqueNodesMap.values());
    const validNodeIds = new Set(cleanNodes.map((n) => n.id));

    // 2. Clone nodes with initial position properties for D3
    const d3Nodes = cleanNodes.map((n) => ({
      ...n,
      x: dimensions.width / 2 + (Math.random() - 0.5) * 100,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
    }));

    // 3. Filter edges to only include links where both source and target exist in validNodeIds
    const d3Edges = (edges || [])
      .filter((e) => {
        if (!e) return false;
        const sourceId = typeof e.source === "object" ? e.source.id : e.source;
        const targetId = typeof e.target === "object" ? e.target.id : e.target;
        return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
      })
      .map((e) => ({
        ...e,
        source: typeof e.source === "object" ? e.source.id : e.source,
        target: typeof e.target === "object" ? e.target.id : e.target,
      }));

    // Reset center pan
    setTransform({ x: 0, y: 0, k: 1 });

    const sim = forceSimulation(d3Nodes)
      .force(
        "link",
        forceLink(d3Edges)
          .id((d: any) => d.id)
          .distance(110)
      )
      .force("charge", forceManyBody().strength(-280))
      .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force(
        "collision",
        forceCollide().radius((d: any) => getNodeRadius(d.connections_count) + 14)
      );

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [nodes, edges, dimensions.width, dimensions.height]);

  // Interactive Drag / Pan logic
  const isDraggingNodeRef = useRef<any | null>(null);
  const dragStartMouseRef = useRef({ x: 0, y: 0 });
  const dragStartTransformRef = useRef({ x: 0, y: 0 });

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  const getSimulationCoords = (canvasX: number, canvasY: number) => {
    const x = (canvasX - transform.x) / transform.k;
    const y = (canvasY - transform.y) / transform.k;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasPos = getCanvasCoords(e);
    const simPos = getSimulationCoords(canvasPos.x, canvasPos.y);

    // Check if clicked a node
    if (simulationRef.current) {
      const d3Nodes = simulationRef.current.nodes();
      let clickedNode = null;
      for (const n of d3Nodes) {
        const dx = n.x - simPos.x;
        const dy = n.y - simPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= getNodeRadius(n.connections_count)) {
          clickedNode = n;
          break;
        }
      }

      if (clickedNode) {
        isDraggingNodeRef.current = clickedNode;
        clickedNode.fx = clickedNode.x;
        clickedNode.fy = clickedNode.y;
        simulationRef.current.alphaTarget(0.3).restart();
        return;
      }
    }

    // Pan start
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    dragStartTransformRef.current = { x: transform.x, y: transform.y };
    isDraggingNodeRef.current = "pan";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasPos = getCanvasCoords(e);
    const simPos = getSimulationCoords(canvasPos.x, canvasPos.y);

    if (isDraggingNodeRef.current === "pan") {
      const dx = e.clientX - dragStartMouseRef.current.x;
      const dy = e.clientY - dragStartMouseRef.current.y;
      setTransform((prev) => ({
        ...prev,
        x: dragStartTransformRef.current.x + dx,
        y: dragStartTransformRef.current.y + dy,
      }));
      return;
    }

    if (isDraggingNodeRef.current && typeof isDraggingNodeRef.current === "object") {
      const node = isDraggingNodeRef.current;
      node.fx = simPos.x;
      node.fy = simPos.y;
      return;
    }

    // Hover detection
    if (simulationRef.current) {
      const d3Nodes = simulationRef.current.nodes();
      let hovered = null;
      for (const n of d3Nodes) {
        const dx = n.x - simPos.x;
        const dy = n.y - simPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= getNodeRadius(n.connections_count)) {
          hovered = n;
          break;
        }
      }

      if (hovered) {
        setHoveredNode(hovered);
        // Translate node sim position to screen coordinates
        const screenX = hovered.x * transform.k + transform.x;
        const screenY = hovered.y * transform.k + transform.y;
        setHoveredPos({ x: screenX, y: screenY });
      } else {
        setHoveredNode(null);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDraggingNodeRef.current && typeof isDraggingNodeRef.current === "object") {
      const node = isDraggingNodeRef.current;
      node.fx = null;
      node.fy = null;
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0);
      }
    }
    isDraggingNodeRef.current = null;
  };

  // Zoom logic
  const handleZoom = (factor: number) => {
    setTransform((prev) => {
      const newK = Math.max(0.2, Math.min(4, prev.k * factor));
      // Zoom centered around the center of the canvas container
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;
      return {
        k: newK,
        x: cx - (cx - prev.x) * (newK / prev.k),
        y: cy - (cy - prev.y) * (newK / prev.k),
      };
    });
  };

  const handleResetZoom = () => {
    setTransform({ x: 0, y: 0, k: 1 });
  };

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains("dark");

    const render = () => {
      pulseTimeRef.current += 1.2;

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      ctx.save();
      // Apply interactive pan & zoom
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      if (simulationRef.current) {
        const d3Nodes = simulationRef.current.nodes();
        const d3Edges = simulationRef.current.force("link").links();

        // 1. Draw Edges (Connections)
        d3Edges.forEach((edge: any) => {
          if (!edge.source.x || !edge.target.x) return;

          ctx.beginPath();
          ctx.moveTo(edge.source.x, edge.source.y);
          ctx.lineTo(edge.target.x, edge.target.y);

          const weight = edge.weight || 1;
          ctx.lineWidth = Math.max(1, Math.min(8, weight / 2));
          // Use premium purple colored edge (primary color: #a855f7)
          ctx.strokeStyle = `rgba(168, 85, 247, ${Math.max(0.15, Math.min(0.75, weight / 10))})`;
          ctx.stroke();
        });

        // 2. Draw Nodes (Attendees)
        d3Nodes.forEach((node: any) => {
          if (!node.x || !node.y) return;

          const r = getNodeRadius(node.connections_count);

          // A. Draw glowing outer border for organizer or super connector
          if (node.is_organizer) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);

            // Pulsing violet circle ring
            const pulseRadius = r + 5 + Math.sin(pulseTimeRef.current * 0.05) * 3;
            ctx.beginPath();
            ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Main violet rim
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2);
            ctx.strokeStyle = "#a855f7"; // Neon purple
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "#a855f7";
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.restore();
          } else if (node.is_super_connector) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);

            // Pulsing gold circle ring
            const pulseRadius = r + 5 + Math.sin(pulseTimeRef.current * 0.05) * 3;
            ctx.beginPath();
            ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Main gold rim
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2);
            ctx.strokeStyle = "#eab308"; // Gold hex
            ctx.lineWidth = 2;
            ctx.shadowColor = "#eab308";
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.restore();
          }

          // B. Draw main node circle
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.clip();

          // Try drawing avatar image
          let drawFallback = true;
          if (node.avatar) {
            const cachedImg = imageCacheRef.current.get(node.avatar);
            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth !== 0) {
              ctx.drawImage(cachedImg, node.x - r, node.y - r, r * 2, r * 2);
              drawFallback = false;
            }
          }

          // Draw fallback background and initials if no avatar
          if (drawFallback) {
            // Assign deterministic background colors based on node id
            const colors = ["#4f46e5", "#7c3aed", "#2563eb", "#0284c7", "#0891b2", "#0d9488", "#059669"];
            const color = colors[node.id % colors.length];
            ctx.fillStyle = color;
            ctx.fill();

            // Initials text
            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.max(10, r * 0.7)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const initials = node.label ? node.label.slice(0, 2).toUpperCase() : "U";
            ctx.fillText(initials, node.x, node.y);
          }
          ctx.restore();

          // Border for the node (match obsidian purple border style)
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // C. Draw label text under the node
          ctx.fillStyle = node.is_organizer ? "#c084fc" : "rgba(241, 237, 247, 0.8)";
          ctx.font = node.is_organizer ? `bold 10px monospace` : `600 10px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          // Truncate name if long
          const labelText = node.label.length > 12 ? `${node.label.slice(0, 10)}...` : node.label;
          const displayLabel = node.is_organizer ? `👑 @${labelText}` : `@${labelText}`;
          ctx.fillText(displayLabel, node.x, node.y + r + 5);
        });
      }

      ctx.restore();

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [transform, dimensions, nodes, edges]);

  const hasGraphData = nodes.length > 0;

  return (
    <div
      ref={containerRef}
      className="premium-card p-5 md:p-6 flex flex-col relative overflow-hidden min-h-[450px]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-display font-extrabold uppercase text-foreground tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--accent-primary,#a855f7)]" />
            Social Connection Graph
          </h2>
          <p className="text-foreground/40 text-xs">Force-directed map of attendee peer-to-peer telemetry</p>
        </div>

        {/* Toolbar Controls */}
        {hasGraphData && (
          <div className="flex items-center gap-1.5 bg-foreground/5 border border-foreground/10 rounded-lg p-1">
            <button
              onClick={() => handleZoom(1.2)}
              className="p-1.5 rounded hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(0.8)}
              className="p-1.5 rounded hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {!hasGraphData ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-foreground/30 text-xs">
          <Users className="w-10 h-10 mb-2 opacity-25" />
          <span className="font-mono">Telemetry graph awaiting connection logs</span>
        </div>
      ) : (
        <div className="flex-1 relative border border-foreground/5 bg-black/40 rounded-xl overflow-hidden min-h-[350px]">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full block cursor-grab active:cursor-grabbing"
          />

          {/* Floating Hover Card Detail Tooltip */}
          {hoveredNode && (
            <div
              className="absolute pointer-events-none bg-[#0c0c0f]/95 border border-[#a855f7]/20 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-2 w-[190px] z-20 transition-all duration-100"
              style={{
                left: `${hoveredPos.x + 15}px`,
                top: `${hoveredPos.y - 70}px`,
              }}
            >
              {/* Profile Header */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full border border-foreground/10 overflow-hidden bg-foreground/5 shrink-0">
                  {hoveredNode.avatar ? (
                    <img src={hoveredNode.avatar} alt={hoveredNode.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#a855f7] text-foreground font-bold text-[10px] uppercase">
                      {hoveredNode.label.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-foreground truncate">@{hoveredNode.label}</div>
                  <div className="text-[9px] font-mono text-foreground/40">ID: #{hoveredNode.id}</div>
                </div>
              </div>

              {/* Status details */}
              <div className="h-[1px] bg-foreground/5 my-1" />

              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex justify-between items-center text-foreground/60">
                  <span>Connections:</span>
                  <span className="font-bold text-foreground">{hoveredNode.connections_count}</span>
                </div>
                <div className="flex justify-between items-center text-foreground/60">
                  <span>Reputation:</span>
                  <span className="font-bold text-[var(--accent-primary,#a855f7)]">+{hoveredNode.reputation_earned} Rep</span>
                </div>

                {hoveredNode.is_organizer && (
                  <div className="mt-2 text-[9px] tracking-wider text-[var(--accent-primary,#a855f7)] font-extrabold uppercase border border-[#a855f7]/20 bg-[#a855f7]/5 rounded px-1.5 py-0.5 text-center">
                    👑 Event Host / Organizer
                  </div>
                )}

                {hoveredNode.is_super_connector && (
                  <div className="mt-2 text-[9px] tracking-wider text-yellow-500 font-extrabold uppercase border border-yellow-500/20 bg-yellow-500/5 rounded px-1.5 py-0.5 text-center">
                    ⭐ Super Connector
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Guide Overlay */}
          <div className="absolute bottom-3 right-3 bg-[#0c0c0f]/90 backdrop-blur border border-foreground/10 rounded-lg p-2 text-[8px] font-mono text-foreground/40 flex flex-col gap-1 pointer-events-none select-none max-w-[150px]">
            <span className="font-bold uppercase text-foreground mb-0.5">Telemetry Instructions</span>
            <div>• Drag nodes to reorganize</div>
            <div>• Scroll / pinch to zoom</div>
            <div>• Drag canvas background to pan</div>
          </div>
        </div>
      )}
    </div>
  );
}
