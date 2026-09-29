import type { EventTap, TopUser } from "../api/events";

// ─── Map focus ───────────────────────────────────────────────────────────────

type LatLng = { lat: number; lng: number };
export type Bounds = [[number, number], [number, number]];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Rough metres between two points; plenty for a venue-sized area. */
const metres = (a: LatLng, b: LatLng) => {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.hypot(dLat, dLng);
};

export function boundsOf(points: LatLng[]): Bounds | null {
  if (points.length === 0) return null;
  let [minLat, minLng, maxLat, maxLng] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return [[minLat, minLng], [maxLat, maxLng]];
}

/**
 * Bounds of where the taps concentrate: taps further than 2x the median
 * distance from the median point (with a 25 m floor, so a tight crowd isn't
 * cut) are dropped as outliers — a phone with bad GPS or someone tapping
 * from the parking lot shouldn't zoom the map out.
 */
export function tapFocusBounds(taps: LatLng[]): Bounds | null {
  if (taps.length < 3) return boundsOf(taps);
  const mid = { lat: median(taps.map((t) => t.lat)), lng: median(taps.map((t) => t.lng)) };
  const dist = taps.map((t) => metres(t, mid));
  const limit = Math.max(2 * median(dist), 25);
  const kept = taps.filter((_, i) => dist[i] <= limit);
  return boundsOf(kept.length > 0 ? kept : taps);
}

// ─── Event days ──────────────────────────────────────────────────────────────

/** A valid IANA zone for Intl, or undefined (= the viewer's own zone). */
export function safeTimeZone(tz?: string | null): string | undefined {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

/** "YYYY-MM-DD" of an instant in the given zone. */
export function dayKey(iso: string, tz?: string): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
}

/** "Thu, Oct 1" for a day key. */
export function dayLabel(key: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })
    .format(Date.parse(`${key}T12:00:00Z`));
}

/**
 * The event's days in its local time: every day from start to end (when the
 * event has times and spans at most two weeks) plus any day that has taps.
 */
export function eventDays(
  taps: EventTap[],
  tz: string | undefined,
  start?: string | null,
  end?: string | null,
): string[] {
  const days = new Set<string>();
  const from = start ? Date.parse(start) : NaN;
  const to = end ? Date.parse(end) : NaN;
  if (!Number.isNaN(from) && !Number.isNaN(to) && to >= from && to - from <= 14 * 86_400_000) {
    for (let t = from; t <= to + 86_400_000; t += 6 * 3_600_000) {
      const k = dayKey(new Date(Math.min(t, to)).toISOString(), tz);
      if (k) days.add(k);
    }
  }
  for (const tap of taps) {
    const k = tap.created_at ? dayKey(tap.created_at, tz) : null;
    if (k) days.add(k);
  }
  return [...days].sort();
}

// ─── People met leaderboard ──────────────────────────────────────────────────

export interface MeetLeader {
  user_id: number;
  username: string;
  avatar: string | null;
  wallet_address: string | null;
  total_reputation: number;
  /** Distinct people this attendee made a Proof of Meet with */
  people_met: number;
}

/**
 * Ranks attendees by how many different people they met through Tap to Meet
 * (distinct counterparts in networking taps), optionally on one event day.
 * The API returns one networking tap per pair, so both sides get a count.
 * Attendees who met nobody are left out.
 */
export function peopleMetLeaderboard(
  taps: EventTap[],
  topUsers: TopUser[],
  day: string | null,
  tz: string | undefined,
): MeetLeader[] {
  const met = new Map<number, Set<number>>();
  const profiles = new Map<number, { username: string; avatar: string | null }>();
  const meet = (a: number, b: number) => {
    if (a === b) return;
    if (!met.has(a)) met.set(a, new Set());
    met.get(a)!.add(b);
  };

  for (const tap of taps) {
    if (tap.type !== "networking" || !tap.user || !tap.given_by) continue;
    if (day && (!tap.created_at || dayKey(tap.created_at, tz) !== day)) continue;
    meet(tap.user.user_id, tap.given_by.user_id);
    meet(tap.given_by.user_id, tap.user.user_id);
    profiles.set(tap.user.user_id, tap.user);
    profiles.set(tap.given_by.user_id, tap.given_by);
  }

  const known = new Map(topUsers.map((u) => [u.user_id, u]));
  return [...met.entries()]
    .map(([userId, people]) => {
      const top = known.get(userId);
      const profile = profiles.get(userId);
      return {
        user_id: userId,
        username: top?.username || profile?.username || "anonymous",
        avatar: top?.avatar || profile?.avatar || null,
        wallet_address: top?.wallet_address || null,
        total_reputation: top?.total_reputation ?? 0,
        people_met: people.size,
      };
    })
    .sort((a, b) =>
      b.people_met - a.people_met ||
      b.total_reputation - a.total_reputation ||
      a.username.localeCompare(b.username));
}
