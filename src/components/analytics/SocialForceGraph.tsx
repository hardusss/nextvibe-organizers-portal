"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY,
  type Simulation, type SimulationLinkDatum, type SimulationNodeDatum,
} from "d3-force";
import { Activity, Maximize2, Users, ZoomIn, ZoomOut } from "lucide-react";

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
  source: number | { id: number };
  target: number | { id: number };
  weight: number;
}

interface Props {
  nodes: SocialNode[];
  edges: SocialEdge[];
}

type GNode = SimulationNodeDatum & SocialNode & { r: number; isolated: boolean };
type GLink = SimulationLinkDatum<GNode> & { weight: number };
type View = { x: number; y: number; k: number };

const ACCENT = "168, 85, 247";
const GOLD = "#eab308";
const AVATAR_COLORS = ["#4f46e5", "#7c3aed", "#2563eb", "#0284c7", "#0891b2", "#0d9488", "#059669"];
const LABELED = 12; // names shown without hovering: the most connected people

const radiusFor = (n: SocialNode) =>
  n.connections_count > 0 ? Math.min(26, 7 + Math.sqrt(n.connections_count) * 3.4) : 5;

function useDarkMode() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/**
 * Who met whom at the event. People are sized by how many others they met;
 * the organizer has a violet ring, super connectors (3+ people) a gold one,
 * and guests who tapped no one wait in a faint outer ring. Hover a person
 * to see their connections; drag to move, Ctrl/⌘ + scroll to zoom.
 */
export default function SocialForceGraph({ nodes = [], edges = [] }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const graphRef = useRef<{ nodes: GNode[]; links: GLink[]; byId: Map<number, GNode>; neighbors: Map<number, Set<number>> }>(
    { nodes: [], links: [], byId: new Map(), neighbors: new Map() },
  );
  const positions = useRef(new Map<number, { x: number; y: number }>());
  const images = useRef(new Map<string, HTMLImageElement>());
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const touched = useRef(false); // the person moved the view: stop auto-fitting
  const frame = useRef<number | null>(null);
  const dark = useDarkMode();
  // Canvas fonts can't read CSS variables: use the page's resolved family
  const family = useRef("sans-serif");
  useEffect(() => {
    family.current = getComputedStyle(document.body).fontFamily || "sans-serif";
  }, []);

  const [size, setSize] = useState({ w: 600, h: 440 });
  const [hovered, setHovered] = useState<{ node: GNode; met: number } | null>(null);
  const hoveredRef = useRef<GNode | null>(null);

  // People without a duplicate id, and connections between people who exist
  const data = useMemo(() => {
    const byId = new Map<number, SocialNode>();
    for (const n of nodes) if (n && typeof n.id === "number" && !byId.has(n.id)) byId.set(n.id, n);
    const seen = new Set<string>();
    const links: { source: number; target: number; weight: number }[] = [];
    for (const e of edges) {
      if (!e) continue;
      const s = typeof e.source === "object" ? e.source.id : e.source;
      const t = typeof e.target === "object" ? e.target.id : e.target;
      const key = [s, t].sort((a, b) => a - b).join(":");
      if (s === t || !byId.has(s) || !byId.has(t) || seen.has(key)) continue;
      seen.add(key);
      links.push({ source: s, target: t, weight: e.weight || 1 });
    }
    return { nodes: [...byId.values()], links };
  }, [nodes, edges]);

  const labeledIds = useMemo(() => {
    const ranked = [...data.nodes].filter((n) => n.connections_count > 0)
      .sort((a, b) => b.connections_count - a.connections_count).slice(0, LABELED);
    return new Set([...ranked.map((n) => n.id), ...data.nodes.filter((n) => n.is_organizer).map((n) => n.id)]);
  }, [data.nodes]);

  // ── Drawing (on demand, not every frame) ──
  const draw = useCallback(() => {
    frame.current = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    const { nodes: gNodes, links, neighbors } = graphRef.current;
    const { x, y, k } = view.current;
    const focus = hoveredRef.current;
    const near = focus ? neighbors.get(focus.id) ?? new Set<number>() : null;
    const lit = (id: number) => !focus || id === focus.id || near!.has(id);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);

    for (const link of links) {
      const s = link.source as GNode;
      const t = link.target as GNode;
      if (s.x == null || t.x == null) continue;
      const active = focus && (s.id === focus.id || t.id === focus.id);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y!);
      ctx.lineTo(t.x, t.y!);
      ctx.lineWidth = (active ? 2.2 : 1 + Math.min(2, Math.log2(link.weight + 1) * 0.35)) / Math.sqrt(k);
      ctx.strokeStyle = active
        ? `rgba(${ACCENT}, 0.95)`
        : `rgba(${ACCENT}, ${focus ? 0.06 : dark ? 0.32 : 0.38})`;
      ctx.stroke();
    }

    for (const n of gNodes) {
      if (n.x == null || n.y == null) continue;
      const on = lit(n.id);
      ctx.globalAlpha = on ? (n.isolated && !focus ? 0.45 : 1) : 0.15;
      if (n.is_organizer || n.is_super_connector) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = n.is_organizer ? `rgb(${ACCENT})` : GOLD;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.clip();
      const img = n.avatar ? images.current.get(n.avatar) : undefined;
      if (img?.complete && img.naturalWidth > 0 && n.r * k >= 6) {
        ctx.drawImage(img, n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
      } else {
        ctx.fillStyle = AVATAR_COLORS[n.id % AVATAR_COLORS.length];
        ctx.fill();
        if (n.r * k >= 9) {
          ctx.fillStyle = "#ffffff";
          ctx.font = `600 ${Math.round(n.r * 0.75)}px ${family.current}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText((n.label || "?").slice(0, 2).toUpperCase(), n.x, n.y + 0.5);
        }
      }
      ctx.restore();
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1 / k;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Names in screen space, so they stay readable at any zoom
    ctx.font = `600 11px ${family.current}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const placed: [number, number, number, number][] = [];
    const byRank = [...gNodes].sort((a, b) =>
      Number(b.id === focus?.id) - Number(a.id === focus?.id) || b.connections_count - a.connections_count);
    for (const n of byRank) {
      if (n.x == null || n.y == null) continue;
      const show = focus ? lit(n.id) && !n.isolated : labeledIds.has(n.id) || (k > 1.8 && !n.isolated);
      if (!show) continue;
      const text = `@${n.label.length > 14 ? `${n.label.slice(0, 13)}…` : n.label}`;
      const sx = n.x * k + x;
      const sy = (n.y + n.r) * k + y + 11;
      const w = ctx.measureText(text).width + 10;
      // A less connected person's name gives way to one already drawn
      const box: [number, number, number, number] = [sx - w / 2, sy - 8, sx + w / 2, sy + 8];
      if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      ctx.fillStyle = dark ? "rgba(7, 6, 12, 0.78)" : "rgba(255, 255, 255, 0.88)";
      ctx.beginPath();
      ctx.roundRect(sx - w / 2, sy - 8, w, 16, 8);
      ctx.fill();
      ctx.fillStyle = n.is_organizer ? "#c084fc" : dark ? "rgba(241, 237, 247, 0.92)" : "#1d1a24";
      ctx.fillText(text, sx, sy + 0.5);
    }
  }, [size, dark, labeledIds]);

  const requestDraw = useCallback(() => {
    if (frame.current == null) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    requestDraw();
  }, [requestDraw]);

  // ── Fit everyone in view ──
  const fit = useCallback(() => {
    const ns = graphRef.current.nodes.filter((n) => n.x != null);
    if (ns.length === 0) return;
    const minX = Math.min(...ns.map((n) => n.x! - n.r));
    const maxX = Math.max(...ns.map((n) => n.x! + n.r));
    const minY = Math.min(...ns.map((n) => n.y! - n.r));
    const maxY = Math.max(...ns.map((n) => n.y! + n.r + 22));
    const pad = 28;
    const k = Math.min((size.w - 2 * pad) / Math.max(maxX - minX, 1), (size.h - 2 * pad) / Math.max(maxY - minY, 1), 2.2);
    view.current = { k, x: size.w / 2 - ((minX + maxX) / 2) * k, y: size.h / 2 - ((minY + maxY) / 2) * k };
    requestDraw();
  }, [size, requestDraw]);
  const fitRef = useRef(fit);
  useEffect(() => {
    fitRef.current = fit;
  }, [fit]);

  // ── Size ──
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      const w = box.clientWidth;
      setSize({ w, h: w < 640 ? 360 : 460 });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // The canvas mounts with the first person: size it then and on every resize
  const hasData = data.nodes.length > 0;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    if (!touched.current) fitRef.current();
    requestDraw();
  }, [size, requestDraw, hasData]);

  // ── Avatars ──
  useEffect(() => {
    for (const n of data.nodes) {
      if (!n.avatar || images.current.has(n.avatar)) continue;
      const img = new Image();
      img.onload = () => requestDraw();
      img.src = n.avatar;
      images.current.set(n.avatar, img);
    }
  }, [data.nodes, requestDraw]);

  // ── Layout: positions kept across refreshes, so a sync doesn't reshuffle ──
  useEffect(() => {
    if (data.nodes.length === 0) return;
    const degree = new Map<number, number>();
    for (const l of data.links) {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    }
    const gNodes: GNode[] = [...data.nodes].sort((a, b) => a.id - b.id).map((n, i) => {
      const kept = positions.current.get(n.id);
      // Sunflower spiral: a stable, even start without randomness
      const angle = i * 2.39996;
      const dist = 14 * Math.sqrt(i + 1);
      return {
        ...n,
        r: radiusFor(n),
        isolated: !degree.get(n.id),
        x: kept?.x ?? Math.cos(angle) * dist,
        y: kept?.y ?? Math.sin(angle) * dist,
      };
    });
    const byId = new Map(gNodes.map((n) => [n.id, n]));
    const links: GLink[] = data.links.map((l) => ({ ...l }));
    const neighbors = new Map<number, Set<number>>();
    for (const l of data.links) {
      if (!neighbors.has(l.source)) neighbors.set(l.source, new Set());
      if (!neighbors.has(l.target)) neighbors.set(l.target, new Set());
      neighbors.get(l.source)!.add(l.target);
      neighbors.get(l.target)!.add(l.source);
    }
    graphRef.current = { nodes: gNodes, links, byId, neighbors };

    // The crowd (people who met someone) is simulated, stretched to the panel's shape
    const crowd = gNodes.filter((n) => !n.isolated);
    const aspect = Math.max(1, Math.min(2.2, size.w / size.h));
    const sim = forceSimulation<GNode>(crowd)
      .force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance((l) => 30 + (l.source as GNode).r + (l.target as GNode).r).strength(0.6))
      .force("charge", forceManyBody<GNode>().strength(-180).distanceMax(360))
      .force("x", forceX<GNode>(0).strength(0.05 / aspect))
      .force("y", forceY<GNode>(0).strength(0.05 * aspect))
      .force("collide", forceCollide<GNode>((n) => n.r + (labeledIds.has(n.id) ? 12 : 5)).iterations(3))
      .stop();

    // Settle it now (milliseconds), so it never wobbles on screen; a sync
    // starts from the kept positions and only needs a short nudge
    const fresh = crowd.some((n) => !positions.current.has(n.id));
    sim.alpha(fresh ? 1 : 0.3);
    for (let i = 0; i < (fresh ? 300 : 100); i++) sim.tick();

    // People who tapped no one wait on an ellipse just outside the crowd
    const loners = gNodes.filter((n) => n.isolated);
    const halfW = Math.max(60, ...crowd.map((n) => Math.abs(n.x!) + n.r));
    const halfH = Math.max(40, ...crowd.map((n) => Math.abs(n.y!) + n.r));
    const ry = halfH + 34;
    const rx = Math.max(halfW + 34, ry * aspect);
    loners.forEach((n, i) => {
      const angle = (i / loners.length) * Math.PI * 2 + 0.3;
      n.x = Math.cos(angle) * rx;
      n.y = Math.sin(angle) * ry;
    });

    for (const n of gNodes) positions.current.set(n.id, { x: n.x!, y: n.y! });
    if (!touched.current) fitRef.current();
    requestDraw();

    // Live again only while someone drags a person
    sim.on("tick", () => {
      for (const n of gNodes) positions.current.set(n.id, { x: n.x!, y: n.y! });
      requestDraw();
    });
    simRef.current = sim;
    return () => {
      sim.stop();
    };
  }, [data, labeledIds, requestDraw, size]);

  // ── Pointer: drag a person, pan the background, hover for connections ──
  const drag = useRef<{ node: GNode | null; startX: number; startY: number; view: View; moved: boolean } | null>(null);

  const toGraph = (sx: number, sy: number) => ({ x: (sx - view.current.x) / view.current.k, y: (sy - view.current.y) / view.current.k });
  const nodeAt = (sx: number, sy: number) => {
    const p = toGraph(sx, sy);
    const ns = graphRef.current.nodes;
    for (let i = ns.length - 1; i >= 0; i--) {
      const n = ns[i];
      if (n.x != null && Math.hypot(n.x - p.x, n.y! - p.y) <= n.r + 3 / view.current.k) return n;
    }
    return null;
  };
  const local = (e: React.PointerEvent | PointerEvent | WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  };
  const setHover = (n: GNode | null) => {
    if (hoveredRef.current === n) return;
    hoveredRef.current = n;
    // Shown in the corner, so it never covers the people it's about
    setHovered(n ? { node: n, met: graphRef.current.neighbors.get(n.id)?.size ?? 0 } : null);
    requestDraw();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { sx, sy } = local(e);
    const node = nodeAt(sx, sy);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { node, startX: sx, startY: sy, view: { ...view.current }, moved: false };
    if (node && !node.isolated) {
      node.fx = node.x;
      node.fy = node.y;
      simRef.current?.alphaTarget(0.2).restart();
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { sx, sy } = local(e);
    const d = drag.current;
    if (!d) {
      setHover(e.pointerType === "mouse" ? nodeAt(sx, sy) : null);
      return;
    }
    if (Math.hypot(sx - d.startX, sy - d.startY) > 3) d.moved = true;
    if (!d.moved) return;
    touched.current = true;
    if (d.node?.isolated) {
      // Not in the simulation: just move them
      const p = toGraph(sx, sy);
      d.node.x = p.x;
      d.node.y = p.y;
    } else if (d.node) {
      const p = toGraph(sx, sy);
      d.node.fx = p.x;
      d.node.fy = p.y;
    } else {
      view.current = { ...d.view, x: d.view.x + sx - d.startX, y: d.view.y + sy - d.startY };
    }
    requestDraw();
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    drag.current = null;
    if (d?.node) {
      d.node.fx = null;
      d.node.fy = null;
      simRef.current?.alphaTarget(0);
      // A tap on a phone shows that person's connections
      if (!d.moved && e.pointerType !== "mouse") setHover(hoveredRef.current === d.node ? null : d.node);
    } else if (d && !d.moved && e.pointerType !== "mouse") {
      setHover(null);
    }
  };

  const zoomAt = useCallback((factor: number, sx = size.w / 2, sy = size.h / 2) => {
    const v = view.current;
    const k = Math.max(0.2, Math.min(5, v.k * factor));
    view.current = { k, x: sx - ((sx - v.x) * k) / v.k, y: sy - ((sy - v.y) * k) / v.k };
    touched.current = true;
    requestDraw();
  }, [size, requestDraw]);

  // Ctrl/⌘ + scroll (and trackpad pinch) zooms; plain scroll keeps scrolling the page
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { sx, sy } = local(e);
      zoomAt(Math.exp(-e.deltaY * 0.0025), sx, sy);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [zoomAt, hasData]);

  const resetView = () => {
    touched.current = false;
    fit();
  };

  // ── Header numbers ──
  const people = data.nodes.length;
  const isolated = data.nodes.filter((n) => !data.links.some((l) => l.source === n.id || l.target === n.id)).length;

  return (
    <div ref={boxRef} className="premium-card p-5 md:p-6 flex flex-col relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-display font-extrabold uppercase text-foreground tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--accent-primary,#a855f7)]" />
            Social Connection Graph
          </h2>
          <p className="text-foreground/50 text-xs mt-0.5">
            {people > 0
              ? `${people} people, ${data.links.length} connections${isolated ? `; ${isolated} haven't tapped anyone yet` : ""}`
              : "Who met whom at the event"}
          </p>
        </div>

        {people > 0 && (
          <div className="flex items-center gap-1 bg-foreground/5 border border-foreground/10 rounded-lg p-1 self-start">
            <button onClick={() => zoomAt(1.25)} className={tool} title="Zoom in" aria-label="Zoom in"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => zoomAt(0.8)} className={tool} title="Zoom out" aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={resetView} className={tool} title="Fit everyone in view" aria-label="Fit everyone in view"><Maximize2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {people === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground/40 text-xs gap-2 text-center">
          <Users className="w-10 h-10 opacity-30" />
          <span>No one has tapped yet. Connections show up here as guests tap phones.</span>
        </div>
      ) : (
        <div
          className="relative rounded-xl overflow-hidden border border-foreground/5 bg-[#f7f5fb] dark:bg-[#07060c]"
          style={{ height: size.h }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: size.w, height: size.h, touchAction: "none" }}
            className={`block ${hovered ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={(e) => e.pointerType === "mouse" && !drag.current && setHover(null)}
            aria-label={`Connection graph of ${people} people`}
            role="img"
          />

          {hovered && (
            <div
              className="absolute top-2.5 right-2.5 pointer-events-none w-[200px] rounded-xl border border-[#a855f7]/25 bg-white/95 dark:bg-[#0c0b12]/95 backdrop-blur p-3 shadow-xl text-xs"
            >
              <div className="font-semibold text-foreground truncate">@{hovered.node.label}</div>
              <div className="mt-1.5 grid grid-cols-2 gap-y-1 text-foreground/60">
                <span>Met</span>
                <span className="text-right font-semibold text-foreground">{hovered.met} {hovered.met === 1 ? "person" : "people"}</span>
                <span>REP here</span>
                <span className="text-right font-semibold text-[var(--accent-primary,#a855f7)]">+{hovered.node.reputation_earned}</span>
              </div>
              {(hovered.node.is_organizer || hovered.node.is_super_connector) && (
                <div className={`mt-2 text-[11px] font-semibold ${hovered.node.is_organizer ? "text-[#c084fc]" : "text-yellow-500"}`}>
                  {hovered.node.is_organizer ? "Organizer" : "Super connector: met 3 or more people"}
                </div>
              )}
            </div>
          )}

          <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/85 dark:bg-[#07060c]/80 backdrop-blur px-2.5 py-1.5 text-[11px] text-foreground/60 pointer-events-none">
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full border-2 border-[#a855f7]" />Organizer</span>
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full border-2 border-yellow-500" />Met 3+ people</span>
            <span className="hidden sm:inline">Bigger circle, more people met</span>
            <span className="hidden md:inline text-foreground/40">Ctrl/⌘ + scroll to zoom</span>
          </div>
        </div>
      )}
    </div>
  );
}

const tool = "p-1.5 rounded hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors cursor-pointer";
