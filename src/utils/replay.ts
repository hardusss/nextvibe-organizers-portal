import type { ReplayTap } from "../api/events";

// ─── Event replay timeline ───────────────────────────────────────────────────
//
// Phase 1 (check-ins) is a fixed intro with no clock. Phase 2 plays every tap
// at its real time, in order, with real time compressed by one factor so the
// whole phase lasts about TARGET_MS; a quiet stretch longer than IDLE_GAP_MS
// becomes a JUMP_MS skip instead. Playback positions are milliseconds at 1x.

export const INTRO_MS = 2_000;
export const TARGET_MS = 25_000;
export const IDLE_GAP_MS = 10 * 60_000;
export const JUMP_MS = 700;
const LEAD_MS = 600; // clock on screen before the first tap
const TAIL_MS = 1_500; // final state before the replay ends

export interface TimedTap {
  tap: ReplayTap;
  /** Real time, ms since epoch */
  real: number;
  /** Phase-2 playback position */
  at: number;
}

export interface Jump {
  from: number;
  to: number;
  /** Real time skipped, ms */
  skipped: number;
}

export interface Timeline {
  taps: TimedTap[];
  jumps: Jump[];
  /** Playback ms per real ms outside the jumps */
  scale: number;
  /** Phase-2 length */
  duration: number;
}

export function buildTimeline(input: ReplayTap[]): Timeline {
  // Chronological; ties keep the server's order (Array.prototype.sort is stable)
  const timed = input
    .map((tap) => ({ tap, real: Date.parse(tap.time), at: 0 }))
    .filter((t) => !Number.isNaN(t.real))
    .sort((a, b) => a.real - b.real);
  if (timed.length === 0) return { taps: [], jumps: [], scale: 0, duration: 0 };

  let active = 0;
  let idle = 0;
  for (let i = 1; i < timed.length; i++) {
    const gap = timed[i].real - timed[i - 1].real;
    if (gap > IDLE_GAP_MS) idle++;
    else active += gap;
  }
  // Many quiet stretches get shorter jumps, so they never take over 30% of it
  const jumpMs = idle > 0 ? Math.min(JUMP_MS, (TARGET_MS * 0.3) / idle) : JUMP_MS;
  const scale = active > 0 ? (TARGET_MS - idle * jumpMs) / active : 0;

  const jumps: Jump[] = [];
  timed[0].at = LEAD_MS;
  for (let i = 1; i < timed.length; i++) {
    const gap = timed[i].real - timed[i - 1].real;
    if (gap > IDLE_GAP_MS) {
      timed[i].at = timed[i - 1].at + jumpMs;
      jumps.push({ from: timed[i - 1].at, to: timed[i].at, skipped: gap });
    } else {
      timed[i].at = timed[i - 1].at + gap * scale;
    }
  }
  return { taps: timed, jumps, scale, duration: timed[timed.length - 1].at + TAIL_MS };
}

/** How many taps have happened at playback position p. */
export function firedCount(tl: Timeline, p: number): number {
  let lo = 0;
  let hi = tl.taps.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tl.taps[mid].at <= p) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The jump being played at p, if any. */
export function jumpAt(tl: Timeline, p: number): Jump | null {
  return tl.jumps.find((j) => p > j.from && p < j.to) ?? null;
}

/**
 * Real time on the clock at p: it runs at the compressed rate between taps,
 * holds during a jump and lands on the real time of the tap after it.
 */
export function realTimeAt(tl: Timeline, p: number): number | null {
  const taps = tl.taps;
  if (taps.length === 0) return null;
  const n = firedCount(tl, p);
  if (n === 0) return taps[0].real;
  const prev = taps[n - 1];
  if (n === taps.length || tl.scale === 0) return prev.real;
  if (jumpAt(tl, p)) return prev.real;
  return Math.min(prev.real + (p - prev.at) / tl.scale, taps[n].real);
}

/** "2h 14m" / "35m" */
export function formatSkip(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
