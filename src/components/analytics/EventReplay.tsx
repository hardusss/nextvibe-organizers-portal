"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY,
  type SimulationLinkDatum, type SimulationNodeDatum,
} from "d3-force";
import { cellToBoundary, cellToParent, cellsToMultiPolygon, getResolution, gridDisk, isValidCell } from "h3-js";
import { FastForward, Maximize2, Minimize2, Pause, Play, RotateCcw, X } from "lucide-react";
import type { EventTapsResult, SocialGraphData, SocialNode } from "@/src/api/events";
import { boundsOf, safeTimeZone } from "@/src/utils/eventTaps";
import { baseTiles, loadLeaflet } from "@/src/utils/leaflet";
import { buildTimeline, firedCount, formatSkip, INTRO_MS, jumpAt, realTimeAt, type Timeline } from "@/src/utils/replay";

const SPEEDS = [1, 2, 4] as const;
const EDGE_DRAW_MS = 450; // an edge grows from A to B
const FRESH_MS = 1_600; // a new edge, its people and its cell stay lit
const ACCENT = "168, 85, 247";

interface Props {
  title: string;
  graph: SocialGraphData;
  taps: EventTapsResult | null;
  onClose: () => void;
}

type Phase = "checkins" | "taps";

/**
 * The event played back: check-ins count up while the attendees appear
 * (no clock), then every tap at its real time, in order, on the cell map and
 * the graph, under a clock in the venue's time. Ends on the dashboard.
 */
export default function EventReplay({ title, graph, taps: tapsData, onClose }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const timeline = useMemo(() => buildTimeline(graph.taps ?? []), [graph.taps]);
  const end = INTRO_MS + timeline.duration;
  const totalCheckins = graph.total_checkins ?? 0;

  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [pos, setPos] = useState(() => (reducedMotion ? end : 0));
  const [playing, setPlaying] = useState(!reducedMotion);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [presenting, setPresenting] = useState(false);
  const [controlsShown, setControlsShown] = useState(true);

  const phase: Phase = pos < INTRO_MS ? "checkins" : "taps";
  const p = pos - INTRO_MS; // phase-2 position
  const fired = phase === "taps" ? firedCount(timeline, p) : 0;

  // ── Playback ──
  const finish = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    onClose();
  }, [onClose]);

  // The playing loop reads and writes the position through a ref
  const posRef = useRef(pos);
  const seek = useCallback((v: number) => {
    posRef.current = v;
    setPos(v);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min(now - last, 100); // a background tab doesn't skip ahead
      last = now;
      const next = Math.min(posRef.current + dt * speed, end);
      seek(next);
      if (next >= end) {
        setPlaying(false);
        finish();
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, end, finish, seek]);

  const restart = () => {
    seek(0);
    setPlaying(true);
  };
  const togglePlay = () => {
    if (posRef.current >= end) return restart();
    setPlaying((v) => !v);
  };

  // ── Presentation (fullscreen, nothing else on screen) ──
  const togglePresent = async () => {
    if (presenting) {
      if (document.fullscreenElement) await document.exitFullscreen?.().catch(() => {});
      setPresenting(false);
      return;
    }
    setPresenting(true);
    await stageRef.current?.requestFullscreen?.().catch(() => {});
  };
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Controls fade out while presenting, back on mouse move
  useEffect(() => {
    if (!presenting) {
      setControlsShown(true);
      return;
    }
    let timer = setTimeout(() => setControlsShown(false), 2000);
    const wake = () => {
      setControlsShown(true);
      clearTimeout(timer);
      timer = setTimeout(() => setControlsShown(false), 2000);
    };
    window.addEventListener("mousemove", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
    };
  }, [presenting]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Buttons and fields handle their own keys
      if ((e.target as HTMLElement)?.closest?.("button, input, select, textarea")) return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((v) => !v);
      } else if (e.key === "Escape" && !document.fullscreenElement) {
        if (presenting) setPresenting(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, presenting]);

  // ── What's on screen ──
  const tz = safeTimeZone(tapsData?.timezone);
  const real = phase === "taps" ? realTimeAt(timeline, p) : null;
  const jump = phase === "taps" ? jumpAt(timeline, p) : null;
  const introProgress = Math.min(pos / INTRO_MS, 1);
  const checkins = phase === "checkins" ? Math.round(totalCheckins * easeOut(introProgress)) : totalCheckins;

  return (
    <div
      ref={stageRef}
      className={
        presenting
          ? "fixed inset-0 z-[100] bg-[#05040a] text-[#f1edf7] p-6 md:p-10 flex flex-col gap-5"
          : "premium-card p-4 md:p-6 flex flex-col gap-4"
      }
      style={presenting && !controlsShown ? { cursor: "none" } : undefined}
    >
      {/* Header: title, clock, counters */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[10px] tracking-widest text-[var(--accent-primary,#a855f7)] font-mono font-bold uppercase">
            event replay · {phase === "checkins" ? "check-ins" : "Tap to Meet"}
          </span>
          <h2 className={`${presenting ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"} font-display font-extrabold uppercase tracking-tight truncate`}>
            {title}
          </h2>
        </div>

        <div className="flex items-end gap-6 md:gap-10">
          <Clock real={real} tz={tz} jump={jump?.skipped ?? null} big={presenting} />
          <Counter label="Checked in" value={checkins} big={presenting} />
          <Counter label="Meets" value={fired} big={presenting} accent />
        </div>
      </div>

      {reducedMotion && (
        <p className="text-xs text-foreground/50">Reduced motion is on, so this shows how the event ended. Press play to watch it.</p>
      )}

      {/* Stage: cell map and graph */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${presenting ? "flex-1 min-h-0" : ""}`}>
        <ReplayMap timeline={timeline} p={phase === "taps" ? p : -1} taps={tapsData} tall={presenting} />
        <ReplayGraph
          nodes={graph.nodes}
          timeline={timeline}
          p={phase === "taps" ? p : -1}
          intro={introProgress}
          tall={presenting}
        />
      </div>

      {/* Controls */}
      <div
        className={`flex flex-wrap items-center gap-3 transition-opacity duration-300 ${controlsShown ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <button onClick={togglePlay} className={btn} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button onClick={restart} className={btn} aria-label="Play from the start" title="From the start">
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex rounded-lg border border-foreground/10 p-0.5" role="group" aria-label="Speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              aria-pressed={speed === s}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold cursor-pointer ${speed === s ? "bg-[var(--accent-primary,#a855f7)] text-white" : "text-foreground/60 hover:text-foreground"}`}
            >
              {s}x
            </button>
          ))}
        </div>

        <label className="flex-1 min-w-[160px] flex items-center gap-2 text-[10px] font-mono uppercase text-foreground/40">
          <FastForward className="w-3.5 h-3.5 shrink-0" />
          <input
            type="range"
            min={0}
            max={Math.max(timeline.duration, 1)}
            step={10}
            value={Math.max(0, p)}
            disabled={timeline.duration === 0}
            onChange={(e) => seek(INTRO_MS + Number(e.target.value))}
            className="w-full accent-[#a855f7] cursor-pointer"
            aria-label="Tap timeline"
          />
        </label>

        <button onClick={togglePresent} className={btn} title={presenting ? "Leave presentation" : "Present fullscreen"}>
          {presenting ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="text-[11px] font-bold uppercase">{presenting ? "Exit" : "Present"}</span>
        </button>
        <button onClick={finish} className={btn} aria-label="Close replay" title="Back to the dashboard">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const btn =
  "px-2.5 py-2 rounded-lg border border-foreground/10 hover:border-[var(--accent-primary,#a855f7)]/40 text-foreground/70 hover:text-foreground flex items-center gap-1.5 cursor-pointer transition-colors";

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Header pieces ───────────────────────────────────────────────────────────

function zoneLabel(tz?: string) {
  const city = (tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone).split("/").pop()!.replace(/_/g, " ");
  return `${city === "Kiev" ? "Kyiv" : city} time`;
}

function Clock({ real, tz, jump, big }: { real: number | null; tz?: string; jump: number | null; big: boolean }) {
  // No clock during the check-ins phase
  if (real === null) return <div aria-hidden className={big ? "w-40" : "w-28"} />;
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(real);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(real);
  return (
    <div className="text-right">
      <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">
        {jump !== null ? <span className="text-[var(--accent-primary,#a855f7)]">⏩ skipping {formatSkip(jump)}</span> : `${day} · ${zoneLabel(tz)}`}
      </div>
      <div className={`${big ? "text-5xl md:text-6xl" : "text-3xl"} font-mono font-bold tabular-nums tracking-tight`}>{time}</div>
    </div>
  );
}

function Counter({ label, value, big, accent }: { label: string; value: number; big: boolean; accent?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">{label}</div>
      <div className={`${big ? "text-5xl md:text-6xl" : "text-3xl"} font-mono font-bold tabular-nums tracking-tight ${accent ? "text-[var(--accent-primary,#a855f7)]" : ""}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

// ─── Cell map ────────────────────────────────────────────────────────────────

interface Cell {
  id: string;
  /** Indexes into timeline.taps, ascending */
  taps: number[];
  /** Coarser than the display resolution (e.g. an IRL tap's res-9 cell) */
  coarse: boolean;
}

function displayRes(eventCell?: string | null) {
  if (eventCell && isValidCell(eventCell)) return Math.min(13, Math.max(9, getResolution(eventCell) + 1));
  return 12;
}

function ReplayMap({ timeline, p, taps, tall }: { timeline: Timeline; p: number; taps: EventTapsResult | null; tall: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polysRef = useRef<Map<string, any>>(new Map());
  const fitRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);

  const res = displayRes(taps?.h3_geo);
  const cells = useMemo(() => {
    const byId = new Map<string, Cell>();
    timeline.taps.forEach(({ tap }, i) => {
      if (!tap.h3 || !isValidCell(tap.h3)) return;
      const own = getResolution(tap.h3);
      const id = own > res ? cellToParent(tap.h3, res) : tap.h3;
      if (!byId.has(id)) byId.set(id, { id, taps: [], coarse: own < res });
      byId.get(id)!.taps.push(i);
    });
    return [...byId.values()];
  }, [timeline, res]);
  const maxCount = Math.max(1, ...cells.map((c) => c.taps.length));

  // Create the map and draw the zone and cells (hidden until their first tap)
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const isDark = document.documentElement.classList.contains("dark");
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true });
      mapRef.current = map;
      const { carto, esri } = baseTiles(isDark);
      const tiles = carto ?? esri;
      const layer = L.tileLayer(tiles.url, { maxZoom: 20, maxNativeZoom: tiles.maxNativeZoom, attribution: tiles.attribution }).addTo(map);
      if (carto) layer.once("tileerror", () => {
        map.removeLayer(layer);
        L.tileLayer(esri.url, { maxZoom: 20, maxNativeZoom: esri.maxNativeZoom, attribution: esri.attribution }).addTo(map);
      });

      const points: { lat: number; lng: number }[] = [];
      if (taps?.h3_geo && isValidCell(taps.h3_geo)) {
        const zone = cellsToMultiPolygon(gridDisk(taps.h3_geo, taps.zone_rings ?? 2), false);
        L.polygon(zone, { color: "#8B5CF6", weight: 1.5, dashArray: "6 6", fillOpacity: 0.04, interactive: false }).addTo(map);
        zone.flat(2).forEach(([lat, lng]) => points.push({ lat, lng }));
      }
      for (const cell of cells) {
        const ring = cellToBoundary(cell.id);
        if (!cell.coarse) ring.forEach(([lat, lng]) => points.push({ lat, lng }));
        polysRef.current.set(cell.id, L.polygon(ring, { stroke: false, fillOpacity: 0, interactive: false }).addTo(map));
      }
      const b = boundsOf(points);
      fitRef.current = () => {
        map.invalidateSize();
        if (b) map.fitBounds(b, { padding: [24, 24], maxZoom: 19 });
        else if (taps?.center) map.setView([taps.center.lat, taps.center.lng], 18);
        else map.setView([50.4501, 30.5234], 16);
      };
      fitRef.current();
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      polysRef.current = new Map();
    };
    // Drawn once per replay: the data doesn't change while it plays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Presenting resizes the map: look at the same area again
  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => fitRef.current());
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Each frame: a cell's brightness follows its taps so far, and flashes on a new one
  useEffect(() => {
    if (!ready) return;
    for (const cell of cells) {
      const poly = polysRef.current.get(cell.id);
      if (!poly) continue;
      let count = 0;
      while (count < cell.taps.length && timeline.taps[cell.taps[count]].at <= p) count++;
      if (count === 0) {
        poly.setStyle({ fillOpacity: 0, stroke: false });
        continue;
      }
      const ratio = count / maxCount;
      const since = p - timeline.taps[cell.taps[count - 1]].at;
      const flash = Math.max(0, 1 - since / FRESH_MS);
      const dim = cell.coarse ? 0.35 : 1;
      poly.setStyle({
        fillColor: mix([168, 85, 247], [244, 63, 94], ratio),
        fillOpacity: Math.min(0.9, (0.2 + 0.5 * ratio + 0.35 * flash) * dim),
        stroke: flash > 0,
        color: "#ffffff",
        weight: 2,
        opacity: flash,
      });
    }
  }, [ready, cells, timeline, p, maxCount]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-foreground/5 bg-black ${tall ? "min-h-[300px] h-full" : "h-[380px]"}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {cells.length === 0 && (
        <div className="absolute bottom-3 left-3 z-[500] text-[10px] font-mono uppercase text-white/60 bg-black/60 rounded px-2 py-1">
          No tap locations
        </div>
      )}
    </div>
  );
}

function mix(a: number[], b: number[], t: number) {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// ─── Graph ───────────────────────────────────────────────────────────────────

type SimNode = SimulationNodeDatum & { id: number };

interface Placed {
  node: SocialNode;
  x: number;
  y: number;
  /** When it appears during the check-ins phase, 0..1 */
  appear: number;
}

/** A settled force layout of everyone, computed once so nothing jumps while it plays. */
function layout(nodes: SocialNode[], timeline: Timeline): Map<number, Placed> {
  const byId = new Map<number, SocialNode>();
  nodes.forEach((n) => byId.set(n.id, n));
  for (const { tap } of timeline.taps) {
    for (const id of [tap.user_a, tap.user_b]) {
      if (!byId.has(id)) {
        byId.set(id, { id, label: `#${id}`, avatar: null, connections_count: 0, reputation_earned: 0, is_super_connector: false });
      }
    }
  }
  const sim: SimNode[] = [...byId.values()].map((n) => ({ id: n.id }));
  const seen = new Set<string>();
  const links: SimulationLinkDatum<SimNode>[] = [];
  for (const { tap } of timeline.taps) {
    const key = [tap.user_a, tap.user_b].sort((a, b) => a - b).join(":");
    if (seen.has(key) || tap.user_a === tap.user_b) continue;
    seen.add(key);
    links.push({ source: tap.user_a, target: tap.user_b });
  }
  const s = forceSimulation(sim)
    .force("link", forceLink<SimNode, SimulationLinkDatum<SimNode>>(links).id((d) => d.id).distance(40).strength(0.4))
    .force("charge", forceManyBody().strength(-60))
    .force("x", forceX(0).strength(0.06))
    .force("y", forceY(0).strength(0.06))
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide(9))
    .stop();
  for (let i = 0; i < 300; i++) s.tick();

  // Attendees appear in a stable shuffled order during the intro
  const order = [...sim].sort((a, b) => hash(a.id) - hash(b.id));
  const placed = new Map<number, Placed>();
  order.forEach((d, i) => {
    placed.set(d.id, { node: byId.get(d.id)!, x: d.x ?? 0, y: d.y ?? 0, appear: (i / Math.max(order.length, 1)) * 0.85 });
  });
  return placed;
}

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function ReplayGraph({ nodes, timeline, p, intro, tall }: {
  nodes: SocialNode[]; timeline: Timeline; p: number; intro: number; tall: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef<Map<string, HTMLImageElement>>(new Map());
  const [size, setSize] = useState({ w: 600, h: 380 });
  const placed = useMemo(() => layout(nodes, timeline), [nodes, timeline]);

  useEffect(() => {
    nodes.forEach((n) => {
      if (n.avatar && !images.current.has(n.avatar)) {
        const img = new Image();
        img.src = n.avatar;
        images.current.set(n.avatar, img);
      }
    });
  }, [nodes]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => setSize({ w: box.clientWidth, h: box.clientHeight }));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    const all = [...placed.values()];
    if (all.length === 0) return;
    const count = all.length;
    const base = count > 120 ? 4 : count > 60 ? 6 : 9;
    const labels = count <= 40;

    // Fit the layout into the canvas
    const xs = all.map((n) => n.x);
    const ys = all.map((n) => n.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const pad = base + (labels ? 22 : 12);
    const k = Math.min((size.w - 2 * pad) / Math.max(maxX - minX, 1), (size.h - 2 * pad) / Math.max(maxY - minY, 1), 3);
    const ox = size.w / 2 - ((minX + maxX) / 2) * k;
    const oy = size.h / 2 - ((minY + maxY) / 2) * k;
    const at = (n: Placed) => [n.x * k + ox, n.y * k + oy] as const;

    // Taps so far: edges, degree, who was just in one
    const n = p >= 0 ? firedCount(timeline, p) : 0;
    const degree = new Map<number, number>();
    const fresh = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const { tap, at: when } = timeline.taps[i];
      const grow = Math.min(1, (p - when) / EDGE_DRAW_MS);
      const glow = Math.max(0, 1 - (p - when) / FRESH_MS);
      const a = placed.get(tap.user_a);
      const b = placed.get(tap.user_b);
      if (!a || !b) continue;
      const [ax, ay] = at(a);
      const [bx, by] = at(b);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (bx - ax) * grow, ay + (by - ay) * grow);
      ctx.strokeStyle = glow > 0 ? `rgba(244, 114, 182, ${0.35 + 0.65 * glow})` : `rgba(${ACCENT}, 0.45)`;
      ctx.lineWidth = 1.2 + 2 * glow;
      ctx.stroke();
      degree.set(tap.user_a, (degree.get(tap.user_a) ?? 0) + 1);
      degree.set(tap.user_b, (degree.get(tap.user_b) ?? 0) + 1);
      fresh.set(tap.user_a, Math.max(fresh.get(tap.user_a) ?? 0, glow));
      fresh.set(tap.user_b, Math.max(fresh.get(tap.user_b) ?? 0, glow));
    }

    for (const node of all) {
      // Pops in during the intro; everyone is there once taps play
      const shown = p >= 0 ? 1 : Math.min(1, Math.max(0, (intro - node.appear) / 0.12));
      if (shown <= 0) continue;
      const [x, y] = at(node);
      const r = (base + Math.min(6, Math.sqrt(degree.get(node.node.id) ?? 0) * 1.6)) * easeOut(shown);
      const glow = fresh.get(node.node.id) ?? 0;

      if (glow > 0) {
        ctx.beginPath();
        ctx.arc(x, y, r + 3 + 6 * glow, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 114, 182, ${0.35 * glow})`;
        ctx.fill();
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      const img = node.node.avatar ? images.current.get(node.node.avatar) : undefined;
      if (img && img.complete && img.naturalWidth > 0 && r >= 6) {
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
      } else {
        ctx.fillStyle = ["#4f46e5", "#7c3aed", "#2563eb", "#0284c7", "#0891b2", "#0d9488"][node.node.id % 6];
        ctx.fill();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = node.node.is_organizer ? "#c084fc" : `rgba(${ACCENT}, 0.5)`;
      ctx.lineWidth = node.node.is_organizer ? 2 : 1;
      ctx.stroke();

      if (labels && shown >= 1) {
        ctx.fillStyle = "rgba(241, 237, 247, 0.75)";
        ctx.font = "600 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const label = node.node.label.length > 12 ? `${node.node.label.slice(0, 10)}…` : node.node.label;
        ctx.fillText(`@${label}`, x, y + r + 3);
      }
    }
  }, [placed, timeline, p, intro, size]);

  return (
    <div ref={boxRef} className={`relative rounded-xl overflow-hidden border border-foreground/5 bg-black/60 ${tall ? "min-h-[300px] h-full" : "h-[380px]"}`}>
      <canvas ref={canvasRef} style={{ width: size.w, height: size.h }} className="block" />
    </div>
  );
}
