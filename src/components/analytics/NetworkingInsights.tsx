"use client";

import { useMemo, useState } from "react";
import { Camera, Clock, Handshake, ShieldCheck, UserX, Award } from "lucide-react";
import type { EventAnalyticsData, EventTapsResult } from "@/src/api/events";
import { safeTimeZone } from "@/src/utils/eventTaps";

interface Props {
  analytics: EventAnalyticsData | null;
  taps: EventTapsResult | null;
}

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");

function Tile({ icon: Icon, label, value, detail, children }: {
  icon: typeof Camera;
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="premium-card p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-foreground/50 text-[11px] font-semibold">{label}</h3>
        <Icon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
      </div>
      <div className="text-2xl font-bold text-foreground tracking-tight tabular-nums">{value}</div>
      {detail && <p className="text-[11px] text-foreground/45 leading-snug">{detail}</p>}
      {children}
    </div>
  );
}

/**
 * How well guests are meeting each other, for the organizer at the door:
 * who networked, who met nobody yet (go introduce them), selfies, Seeker
 * Verified guests, the busiest networking hour and POAPs on-chain vs saved.
 */
export default function NetworkingInsights({ analytics, taps }: Props) {
  const [showLonely, setShowLonely] = useState(false);
  const tz = safeTimeZone(taps?.timezone);

  const guests = useMemo(() => {
    const checkedIn = new Map<number, string>();
    const met = new Map<number, Set<number>>();
    for (const t of taps?.taps ?? []) {
      if (t.type === "checkin" && t.user) checkedIn.set(t.user.user_id, t.user.username);
      if (t.type === "networking" && t.user && t.given_by && t.user.user_id !== t.given_by.user_id) {
        const [a, b] = [t.user.user_id, t.given_by.user_id];
        if (!met.has(a)) met.set(a, new Set());
        if (!met.has(b)) met.set(b, new Set());
        met.get(a)!.add(b);
        met.get(b)!.add(a);
      }
    }
    const ids = [...checkedIn.keys()];
    const networked = ids.filter((id) => (met.get(id)?.size ?? 0) > 0);
    const lonely = ids.filter((id) => !met.get(id)?.size).map((id) => checkedIn.get(id)!).sort();
    const totalMet = ids.reduce((sum, id) => sum + (met.get(id)?.size ?? 0), 0);
    return { count: ids.length, networked: networked.length, lonely, avgMet: ids.length ? totalMet / ids.length : 0 };
  }, [taps]);

  const peakHour = useMemo(() => {
    const hours = analytics?.hourly_activity ?? [];
    const peak = hours.reduce<(typeof hours)[number] | null>(
      (best, h) => (h.networking > (best?.networking ?? 0) ? h : best), null);
    if (!peak) return null;
    const start = Date.parse(peak.hour);
    const time = (t: number) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(t);
    const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(start);
    return { label: `${time(start)}–${time(start + 3_600_000)}`, day, count: peak.networking };
  }, [analytics, tz]);

  if (!analytics && !taps) return null;

  const meets = analytics?.proof_of_meets;
  const selfies = analytics?.meets_with_selfie;
  const checkins = analytics?.nfc_checkins ?? guests.count;
  const seeker = analytics?.seeker_verified_guests;
  const poap = analytics?.poap_status;

  return (
    <section aria-label="Guest networking" className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground/70">Guest networking</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Tile
          icon={Handshake}
          label="Networking rate"
          value={pct(guests.networked, guests.count)}
          detail={`${guests.networked} of ${guests.count} checked-in guests have a Proof of Meet`}
        />
        <Tile
          icon={Award}
          label="Avg people met"
          value={guests.count ? guests.avgMet.toFixed(1) : "—"}
          detail="per checked-in guest"
        />
        <Tile
          icon={UserX}
          label="Met nobody yet"
          value={String(guests.lonely.length)}
          detail={guests.lonely.length ? "Go introduce them" : guests.count ? "Everyone has met someone" : undefined}
        >
          {guests.lonely.length > 0 && (
            <>
              <button
                onClick={() => setShowLonely((v) => !v)}
                className="self-start text-[11px] font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
                aria-expanded={showLonely}
              >
                {showLonely ? "Hide names" : "Show names"}
              </button>
              {showLonely && (
                <ul className="text-[11px] text-foreground/70 max-h-28 overflow-y-auto custom-scrollbar space-y-0.5">
                  {guests.lonely.map((name) => <li key={name} className="truncate">@{name}</li>)}
                </ul>
              )}
            </>
          )}
        </Tile>
        <Tile
          icon={Camera}
          label="Selfie rate"
          value={meets === undefined || selfies === undefined ? "—" : pct(selfies, meets)}
          detail={meets === undefined ? "Needs the latest API" : `${selfies ?? 0} of ${meets} Proof of Meets have a selfie`}
        />
        <Tile
          icon={ShieldCheck}
          label="Seeker Verified"
          value={seeker === undefined ? "—" : pct(seeker, checkins)}
          detail={seeker === undefined ? "Needs the latest API" : `${seeker} of ${checkins} checked-in guests`}
        />
        <Tile
          icon={Clock}
          label="Peak networking hour"
          value={peakHour ? peakHour.label : "—"}
          detail={peakHour ? `${peakHour.day} · ${peakHour.count} meets` : "No meets yet"}
        />
      </div>
      {poap && (
        <p className="text-[11px] text-foreground/50">
          POAPs: <span className="text-foreground/80 font-semibold">{poap.onchain} on-chain</span>
          {" · "}<span className="text-foreground/80 font-semibold">{poap.saved} saved</span> (no wallet yet)
          {poap.pending > 0 && <> · {poap.pending} minting</>}
          {poap.failed > 0 && <> · {poap.failed} failed</>}
        </p>
      )}
    </section>
  );
}
