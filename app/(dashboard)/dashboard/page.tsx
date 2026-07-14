"use client";

import { useEffect, useState } from "react";
import TopNav from "@/src/components/layout/TopNav";
import { getUserDetail } from "@/src/api/user.detail";
import {
  getHostedEvents,
  getEventAnalytics,
  getEventTopUsers,
  getEventSocialGraph,
  type TopUser,
  type EventAnalyticsData,
  type SocialGraphData
} from "@/src/api/events";
import {
  FileText, Radio, Fingerprint, Award, ChevronRight, Activity, Star, ChevronDown, Users,
  Tv, X, ShieldAlert, AlertCircle, Volume2, TrendingUp, Calendar
} from "lucide-react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import TapHeatmap from "@/src/components/analytics/TapHeatmap";
import EcosystemDonutChart from "@/src/components/analytics/EcosystemDonutChart";
import ActivityTimelineChart from "@/src/components/analytics/ActivityTimelineChart";
import SocialForceGraph from "@/src/components/analytics/SocialForceGraph";
import BroadcastPanel from "@/src/components/analytics/BroadcastPanel";
import AttendeeRaffle from "@/src/components/analytics/AttendeeRaffle";
import EventPostsSection from "@/src/components/analytics/EventPostsSection";
import { useRole } from "@/src/contexts/RoleContext";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const CountUp = ({ to, format }: { to: number, format?: "number" | "k" }) => {
  const count = useMotionValue(0);
  const display = useTransform(count, (latest) => {
    if (format === "k" && to >= 1000) {
      return (latest / 1000).toFixed(1) + "k";
    }
    return Math.round(latest).toLocaleString();
  });

  useEffect(() => {
    const controls = animate(count, to, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [to, count]);

  return <motion.span>{display}</motion.span>;
};

function Sparkline() {
  return (
    <div className="w-full h-10 mt-3 relative overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Fill area */}
        <motion.path
          d="M 0 20 Q 15 5 35 15 T 70 8 T 100 12 L 100 20 Z"
          fill="url(#sparklineGradient)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        {/* Stroke line */}
        <motion.path
          d="M 0 20 Q 15 5 35 15 T 70 8 T 100 12"
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        {/* Pulsing telemetry dot at path end */}
        <circle cx="98" cy="12" r="1.5" fill="var(--accent-primary)" className="animate-pulse" />
      </svg>
    </div>
  );
}

export default function AnalyticsPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<EventAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [isLoadingTopUsers, setIsLoadingTopUsers] = useState<boolean>(false);
  const [socialGraph, setSocialGraph] = useState<SocialGraphData>({ nodes: [], edges: [] });
  const [isLoadingSocialGraph, setIsLoadingSocialGraph] = useState<boolean>(false);

  // Leaderboard states
  const [leaderboardMode, setLeaderboardMode] = useState<"private" | "public">("private");
  const [isFullscreenLeaderboardOpen, setIsFullscreenLeaderboardOpen] = useState<boolean>(false);
  const [isFullLeaderboardModalOpen, setIsFullLeaderboardModalOpen] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);

  const { role, isSponsorEvent } = useRole();

  const visibleEvents = events.filter((evt: any) => {
    if (role === "sponsor") {
      return isSponsorEvent(evt.post_id);
    }
    return true;
  });

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nextvibe_access") : null;
    if (!token) return;

    const initData = async () => {
      try {
        const [profileData, eventsResponse] = await Promise.all([
          getUserDetail(undefined, true),
          getHostedEvents()
        ]);

        setUserProfile(profileData);

        const evts = eventsResponse.data || [];
        evts.sort((a: any, b: any) => new Date(b.create_at).getTime() - new Date(a.create_at).getTime());

        setEvents(evts);
      } catch (error) {
        console.error("Failed to initialize dashboard data:", error);
      }
    };
    initData();
  }, []);

  // Update selected event ID when role or event lists change
  useEffect(() => {
    if (visibleEvents.length > 0) {
      if (!selectedEventId || !visibleEvents.some((e) => e.post_id === selectedEventId)) {
        setSelectedEventId(visibleEvents[0].post_id);
      }
    } else {
      setSelectedEventId(null);
    }
  }, [role, events, selectedEventId, visibleEvents]);

  // Sync / Auto-refresh for Fullscreen Leaderboard
  useEffect(() => {
    if (!isFullscreenLeaderboardOpen || !selectedEventId) return;

    const interval = setInterval(async () => {
      try {
        const data = await getEventTopUsers(selectedEventId);
        setTopUsers(data);
        setCountdown(5);
      } catch (error) {
        console.error("Failed to sync leaderboard:", error);
      }
    }, 5000);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 5));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [isFullscreenLeaderboardOpen, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;

    const fetchAnalytics = async () => {
      setIsLoadingAnalytics(true);
      try {
        const data = await getEventAnalytics(selectedEventId);
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch event analytics:", error);
        setAnalytics(null);
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    fetchAnalytics();
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;

    const fetchTopUsers = async () => {
      setIsLoadingTopUsers(true);
      try {
        const data = await getEventTopUsers(selectedEventId);
        setTopUsers(data);
      } catch (error) {
        console.error("Failed to fetch top users:", error);
        setTopUsers([]);
      } finally {
        setIsLoadingTopUsers(false);
      }
    };

    fetchTopUsers();
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;

    const fetchSocialGraph = async () => {
      setIsLoadingSocialGraph(true);
      try {
        const data = await getEventSocialGraph(selectedEventId);
        setSocialGraph(data);
      } catch (error) {
        console.error("Failed to fetch event social graph:", error);
        setSocialGraph({ nodes: [], edges: [] });
      } finally {
        setIsLoadingSocialGraph(false);
      }
    };

    fetchSocialGraph();
  }, [selectedEventId]);

  const selectedEvent = visibleEvents.find(e => e.post_id === selectedEventId);

  const getLastHourNetworking = () => {
    if (!analytics?.hourly_activity || analytics.hourly_activity.length === 0) return 0;
    const lastItem = analytics.hourly_activity[analytics.hourly_activity.length - 1];
    const lastHourDate = new Date(lastItem.hour);
    const now = new Date();
    
    // Check if the last activity hour is within the last 2 hours (to account for timezone/hour boundaries)
    const isRecent = (now.getTime() - lastHourDate.getTime()) < 2 * 60 * 60 * 1000;
    return isRecent ? lastItem.networking : 0;
  };

  const lastHourNetworking = getLastHourNetworking();

  // If sponsor has no side events, show empty state prompt
  if (role === "sponsor" && visibleEvents.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden transition-colors duration-200">
        <TopNav title="Dashboard" userProfile={userProfile} />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-8 shadow-sm backdrop-blur-md text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center mx-auto text-[var(--accent-primary)]">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] tracking-widest text-[var(--accent-primary)] font-mono font-bold uppercase">No Side-Events</span>
              <h2 className="text-xl font-display font-extrabold uppercase text-black dark:text-white tracking-tight">Sponsor Campaign Required</h2>
              <p className="text-xs text-black/50 dark:text-white/40 leading-relaxed font-mono">
                You don't have any side-events registered. Create a new event using the sidebar option to view analytics.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-8 transition-colors duration-200">

      {/* Fullscreen Projected Screen Leaderboard */}
      <AnimatePresence>
        {isFullscreenLeaderboardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#050505] text-white p-8 md:p-12 flex flex-col justify-between font-mono select-none overflow-hidden"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-6">
              <div className="space-y-1">
                <span className="text-xs text-[#00e0c2] tracking-[0.2em] uppercase font-bold flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e0c2] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e0c2]"></span>
                  </span>
                  live connection board
                </span>
                <h1 className="text-2xl md:text-3xl font-display font-extrabold uppercase tracking-tight text-white">
                  {selectedEvent?.about || "Event Leaderboard"}
                </h1>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[9px] text-white/40 block uppercase tracking-wider">next sync in</span>
                  <span className="text-sm font-bold text-[#00e0c2]">{countdown}s</span>
                </div>
                <button
                  onClick={() => setIsFullscreenLeaderboardOpen(false)}
                  className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all cursor-pointer text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 my-8 max-w-5xl mx-auto w-full flex flex-col justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {topUsers.slice(0, 10).map((user, i) => {
                  const rank = i + 1;
                  const isTop3 = rank <= 3;
                  const rankColors = [
                    "border-[#00e0c2]/30 bg-[#00e0c2]/5 text-[#00e0c2]",
                    "border-[#8b5cf6]/30 bg-[#8b5cf6]/5 text-[#8b5cf6]",
                    "border-cyan-400/30 bg-cyan-400/5 text-cyan-400"
                  ];
                  const rankColor = isTop3 ? rankColors[rank - 1] : "border-white/10 bg-white/[0.02] text-white/80";

                  return (
                    <motion.div
                      key={user.user_id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-xl border ${rankColor} transition-all shadow-md`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold w-6 text-center font-mono">
                          #{rank}
                        </span>
                        <div className="w-12 h-12 rounded-full relative border border-white/10 flex items-center justify-center overflow-hidden bg-white/5">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full opacity-60 bg-cover" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}')` }} />
                          )}
                        </div>
                        <span className="text-base font-display font-extrabold uppercase tracking-tight text-white">
                          {user.username}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-bold font-mono tracking-tight text-white block">
                          {user.total_taps}
                        </span>
                        <span className="text-[9px] text-white/40 uppercase tracking-wider block">connections</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[9px] text-white/30 uppercase tracking-widest font-bold">
              <span>powered by nextvibe telemetry</span>
              <span>sync status: active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Leaderboard Popup Modal */}
      <AnimatePresence>
        {isFullLeaderboardModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setIsFullLeaderboardModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0c0c0f] border border-white/10 rounded-xl shadow-2xl max-w-lg w-[95%] md:w-full max-h-[85vh] flex flex-col overflow-hidden font-mono"
            >
              <div className="p-4 md:p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-base font-display font-extrabold uppercase tracking-tight text-white flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-[#00e0c2]" />
                  Event Leaderboard
                </h3>
                <button
                  onClick={() => setIsFullLeaderboardModalOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                {topUsers.map((user, i) => {
                  const rank = i + 1;
                  const isTop3 = rank <= 3;
                  const walletShort = user.wallet_address
                    ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-6)}`
                    : "—";
                  const rankColors = [
                    "border-[#00e0c2]/35 bg-[#00e0c2]/5 text-[#00e0c2]",
                    "border-[#8b5cf6]/35 bg-[#8b5cf6]/5 text-[#8b5cf6]",
                    "border-cyan-400/35 bg-cyan-400/5 text-cyan-400"
                  ];
                  const rankColor = isTop3 ? rankColors[rank - 1] : "border-white/10 bg-white/[0.01] text-white/80";

                  return (
                    <div
                      key={user.user_id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border ${rankColor} transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold w-6 text-center text-xs">
                          #{rank}
                        </span>
                        <div className="w-9 h-9 rounded-full relative border border-white/10 flex items-center justify-center overflow-hidden bg-white/5">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full opacity-60 bg-cover" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}')` }} />
                          )}
                        </div>
                        <div>
                          <div className="font-display font-extrabold uppercase text-xs text-white">{user.username}</div>
                          <div className="text-[9px] text-white/40">{walletShort}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-white">
                          {user.total_taps} T
                        </div>
                        <div className="text-[9px] text-white/40">
                          {user.total_reputation} R
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TopNav
        title="Dashboard"
        userProfile={userProfile}
      />

      <main className="px-4 md:px-8 flex-1 flex flex-col gap-8 mt-2">

        {/* Editorial Event Selector Header */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] tracking-widest text-[#00e0c2] font-mono font-bold uppercase">active session telemetry</span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {visibleEvents.length > 0 ? (
              <div className="relative inline-flex items-center group cursor-pointer">
                <h1 className="text-2xl md:text-3xl font-display font-extrabold uppercase text-black dark:text-white tracking-tight hover:text-white/80 transition-colors flex items-center gap-3">
                  {selectedEvent?.about || 'Select Event'}
                  <ChevronDown className="w-5 h-5 text-black/35 dark:text-white/35 group-hover:text-black/70 dark:group-hover:text-white/70 transition-colors" />
                </h1>

                <select
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={selectedEventId || ''}
                  onChange={(e) => setSelectedEventId(Number(e.target.value))}
                >
                  {visibleEvents.map(evt => (
                    <option key={evt.post_id} value={evt.post_id} className="text-base text-black bg-white dark:bg-[#0c0c0f]">
                      {evt.about}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <h1 className="text-2xl md:text-3xl font-display font-extrabold uppercase text-black dark:text-white tracking-tight">Overview</h1>
            )}

            <p className="text-black/50 dark:text-white/50 text-xs font-medium max-w-xs sm:text-right">
              Live statistics and connection heatmaps synced with the Solana ledger.
            </p>
          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-8"
        >
          {/* ASYMMETRICAL STAT CARDS GRID WITH HERO METRIC */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Promoted leftmost Hero Card (col-span-5) */}
            <motion.div
              variants={item}
              whileHover={{ y: -4 }}
              className="lg:col-span-5 bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 flex flex-col justify-between shadow-sm backdrop-blur-md relative overflow-hidden transition-all duration-250 cursor-default min-h-[200px]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-glow)] rounded-full blur-[50px] opacity-60 pointer-events-none" />
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-0.5">
                  <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">
                    {role === "sponsor" ? "what happened next" : "networking between people"}
                  </h3>
                  <p className="text-[9px] text-black/50 dark:text-white/40 font-mono uppercase tracking-wide leading-normal">
                    {role === "sponsor"
                      ? "Peer connections made by attendees after visiting your booth/event"
                      : "Attendee ↔ attendee networking taps (earns reputation)"}
                  </p>
                </div>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 shrink-0 ml-4">
                  {role === "sponsor" ? (
                    <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
                  ) : (
                    <Fingerprint className="w-5 h-5 text-[var(--accent-primary)]" />
                  )}
                </div>
              </div>

              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-6 relative z-10">
                  <div className="h-10 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                  <div className="h-6 bg-black/10 dark:bg-white/10 rounded w-full"></div>
                </div>
              ) : analytics ? (
                <div className="mt-6 space-y-3 relative z-10">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-5xl font-mono font-bold text-black dark:text-white tracking-tight">
                      <CountUp to={analytics.total_irl_taps || 0} />
                    </span>

                    {/* Live trend badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-500 uppercase tracking-wider">
                      <TrendingUp className="w-3 h-3" />
                      +{lastHourNetworking} last hr
                    </span>
                  </div>

                  <Sparkline />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-white/30 relative z-10">No data</div>
              )}
            </motion.div>

            {/* Other 4 cards grouped beside/below the hero card (col-span-7) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Card 1: Event Requests (Compact) */}
              <motion.div
                variants={item}
                whileHover={{ y: -4 }}
                className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-sm backdrop-blur-md transition-all duration-250 cursor-default min-h-[160px]"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">event requests</h3>
                  <div className="p-1.5 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5"><FileText className="w-3.5 h-3.5 text-black/60 dark:text-white/60" /></div>
                </div>

                {isLoadingAnalytics ? (
                  <div className="animate-pulse space-y-3 w-full mt-3">
                    <div className="h-6 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                    <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-full"></div>
                  </div>
                ) : analytics ? (
                  <div className="mt-3 space-y-3">
                    <div className="text-3xl font-mono font-bold text-black dark:text-white tracking-tight">
                      <CountUp to={analytics.total_requests || 0} />
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full flex h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                      <div style={{ width: `${(analytics.accepted_requests / (analytics.total_requests || 1)) * 100}%` }} className="bg-[#00e0c2]"></div>
                      <div style={{ width: `${(analytics.rejected_requests / (analytics.total_requests || 1)) * 100}%` }} className="bg-red-500"></div>
                    </div>

                    <div className="flex items-center gap-2.5 text-[9px] font-mono font-bold uppercase flex-wrap">
                      <span className="text-[#00e0c2]"><CountUp to={analytics.accepted_requests || 0} /> Acc</span>
                      <span className="text-red-500"><CountUp to={analytics.rejected_requests || 0} /> Rej</span>
                      <span className="text-white/30"><CountUp to={Math.max(0, (analytics.total_requests || 0) - (analytics.accepted_requests || 0) - (analytics.rejected_requests || 0))} /> Pend</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-white/30">No data</div>
                )}
              </motion.div>

              {/* Card 2: Event Check-ins (Compact) */}
              <motion.div
                variants={item}
                whileHover={{ y: -4 }}
                className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-sm backdrop-blur-md transition-all duration-250 cursor-default min-h-[160px]"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">event check-ins</h3>
                    <p className="text-[8px] text-black/50 dark:text-white/30 font-mono uppercase tracking-wide leading-tight">
                      Organizer/sponsor ↔ attendee taps (entry to event or side-event)
                    </p>
                  </div>
                  <div className="p-1.5 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 shrink-0 ml-2"><Radio className="w-3.5 h-3.5 text-black/60 dark:text-white/60" /></div>
                </div>

                {isLoadingAnalytics ? (
                  <div className="animate-pulse space-y-3 w-full mt-3">
                    <div className="h-6 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                    <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-full"></div>
                  </div>
                ) : analytics ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl font-mono font-bold text-black dark:text-white tracking-tight">
                        <CountUp to={analytics.nfc_checkins || 0} />
                      </span>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e0c2] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00e0c2]"></span>
                      </span>
                    </div>

                    <div className="w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (analytics.nfc_checkins / (analytics.total_requests || 1)) * 100)}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-[#00e0c2] rounded-full"></motion.div>
                    </div>
                    <div className="text-[9px] font-mono text-white/40 uppercase font-bold">
                      {Math.round((analytics.nfc_checkins / (analytics.total_requests || 1)) * 100)}% Conv Rate
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-white/30">No data</div>
                )}
              </motion.div>

              {/* Card 3: Rep Earned (Compact) */}
              <motion.div
                variants={item}
                whileHover={{ y: -4 }}
                className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-sm backdrop-blur-md relative overflow-hidden transition-all duration-250 cursor-default min-h-[160px]"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--accent-glow)] rounded-full blur-[30px] opacity-40 pointer-events-none" />
                <div className="flex justify-between items-start relative z-10">
                  <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">rep earned</h3>
                  <div className="p-1.5 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5"><Award className="w-3.5 h-3.5 text-[var(--accent-primary)]" /></div>
                </div>

                {isLoadingAnalytics ? (
                  <div className="animate-pulse space-y-3 w-full mt-3 relative z-10">
                    <div className="h-6 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                  </div>
                ) : analytics ? (
                  <div className="mt-3 space-y-1 relative z-10">
                    <div className="text-3xl font-mono font-bold text-black dark:text-white tracking-tight">
                      <CountUp to={analytics.total_reputation_earned || 0} format="k" />
                    </div>
                    <p className="text-[9px] font-mono uppercase font-bold text-[var(--accent-primary)]">Points Issued</p>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-white/30 relative z-10">No data</div>
                )}
              </motion.div>

              {/* Card 4: POAP Claims (Compact) */}
              <motion.div
                variants={item}
                whileHover={{ y: -4 }}
                className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-sm backdrop-blur-md transition-all duration-250 cursor-default min-h-[160px]"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">poap claims</h3>
                  <div className="p-1.5 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5"><Award className="w-3.5 h-3.5 text-cyan-400" /></div>
                </div>

                {isLoadingAnalytics ? (
                  <div className="animate-pulse space-y-3 w-full mt-3">
                    <div className="h-6 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                  </div>
                ) : analytics ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-2xl font-mono font-bold text-black dark:text-white tracking-tight">
                        {analytics.cnft_claim_rate ? `${Math.round(analytics.cnft_claim_rate)}%` : "0%"}
                      </div>
                      <p className="text-[8px] font-mono uppercase font-bold text-black/35 dark:text-white/35">
                        {analytics.cnft_claims_count || 0} of {analytics.nfc_checkins || 0}
                      </p>
                    </div>

                    {/* Circular progress SVG */}
                    <div className="relative w-11 h-11 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-black/5 dark:text-white/5"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <defs>
                          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#9945FF" />
                            <stop offset="100%" stopColor="#00e0c2" />
                          </linearGradient>
                        </defs>
                        <path
                          className="transition-all duration-500 ease-out"
                          strokeWidth="3.5"
                          strokeDasharray={`${analytics.cnft_claim_rate || 0}, 100`}
                          strokeLinecap="round"
                          stroke="url(#gaugeGradient)"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-white/30">No data</div>
                )}
              </motion.div>

            </div>
          </div>

          {/* SECTION 2: MAP & LEADERBOARD SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Spatial Heatmap Box (col-span-8) */}
            <motion.div
              variants={item}
              className="lg:col-span-8 bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 md:p-6 flex flex-col shadow-sm backdrop-blur-md"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-lg font-display font-extrabold uppercase text-black dark:text-white tracking-tight">Spatial Heatmap</h2>
                  <p className="text-black/40 dark:text-white/40 text-xs">Real-time coordinates density visualizer</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-red-500">Telemetry Feed</span>
                </div>
              </div>

              {selectedEventId ? (
                <TapHeatmap postId={selectedEventId} />
              ) : (
                <div className="flex-1 flex items-center justify-center min-h-[350px] rounded-xl bg-black/10 border border-white/5 text-xs text-white/30">
                  Select an event to view telemetry heatmap
                </div>
              )}
            </motion.div>

            {/* Top Attendees Box with Live Leaderboard switch (col-span-4) */}
            <motion.div
              variants={item}
              className="lg:col-span-4 bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 md:p-6 flex flex-col shadow-sm backdrop-blur-md"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-display font-extrabold uppercase text-black dark:text-white tracking-tight flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#00e0c2]" />
                    Top Attendees
                  </h2>
                  <p className="text-black/40 dark:text-white/40 text-xs">
                    {leaderboardMode === "public" ? "Projected scoreboard telemetry" : "Ranked leaderboard by connection volume"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-black/10 dark:bg-white/5 p-0.5 rounded-lg border border-black/5 dark:border-white/5 font-mono text-[9px] font-bold uppercase tracking-wider">
                    <button
                      onClick={() => setLeaderboardMode("private")}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${leaderboardMode === "private"
                          ? "bg-[var(--accent-primary)] text-white font-extrabold"
                          : "text-black/40 dark:text-white/40 hover:text-white"
                        }`}
                    >
                      Priv
                    </button>
                    <button
                      onClick={() => setLeaderboardMode("public")}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${leaderboardMode === "public"
                          ? "bg-[var(--accent-primary)] text-white font-extrabold"
                          : "text-black/40 dark:text-white/40 hover:text-white"
                        }`}
                    >
                      Pub
                    </button>
                  </div>

                  <button
                    onClick={() => setIsFullscreenLeaderboardOpen(true)}
                    className="p-1.5 bg-black/10 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/10 rounded-lg border border-black/5 dark:border-white/5 transition-colors cursor-pointer text-black/60 dark:text-white/60 hover:text-[#00e0c2]"
                    title="Launch Fullscreen Public Leaderboard"
                  >
                    <Tv className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                {isLoadingTopUsers ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-2 animate-pulse border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-white/5 rounded" />
                        <div className="w-9 h-9 rounded-full bg-white/5" />
                        <div className="space-y-1">
                          <div className="h-3 w-16 bg-white/5 rounded" />
                          <div className="h-2 w-12 bg-white/5 rounded" />
                        </div>
                      </div>
                      <div className="h-3 w-10 bg-white/5 rounded" />
                    </div>
                  ))
                ) : topUsers.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-white/30 py-10">
                    <Users className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs">No scan activity recorded</p>
                  </div>
                ) : (
                  topUsers.slice(0, 5).map((user, i) => {
                    const rank = i + 1;
                    const isTop3 = rank <= 3;
                    const walletShort = user.wallet_address
                      ? `${user.wallet_address.slice(0, 4)}...${user.wallet_address.slice(-4)}`
                      : "—";

                    // Public Mode strips wallet and rep data
                    if (leaderboardMode === "public") {
                      return (
                        <motion.div
                          key={user.user_id}
                          whileHover={{ x: 4 }}
                          className="flex items-center justify-between p-2 rounded-xl transition-all border border-transparent hover:border-white/5 hover:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`font-mono text-xs font-bold w-4 text-center ${isTop3 ? "text-[#00e0c2]" : "text-white/35"}`}>
                              {rank}
                            </span>

                            <div className="w-9 h-9 rounded-full relative border border-white/10 flex items-center justify-center overflow-hidden bg-white/5">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full opacity-60 bg-cover" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}')` }} />
                              )}
                              {rank === 1 && (
                                <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-yellow-500 rounded-full border border-black flex items-center justify-center">
                                  <Star className="w-1.5 h-1.5 text-black fill-black" />
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="text-black dark:text-white font-semibold text-xs tracking-tight">{user.username}</div>
                              <div className="text-black/35 dark:text-white/35 text-[9px] font-mono uppercase tracking-wider">verified peer</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`font-mono text-xs font-bold ${isTop3 ? "text-[#00e0c2]" : "text-white/80"}`}>
                              {user.total_taps} T
                            </div>
                            <div className="text-[9px] text-white/30 font-mono uppercase tracking-wider">connections</div>
                          </div>
                        </motion.div>
                      );
                    }

                    // Standard Private Mode
                    return (
                      <motion.div
                        key={user.user_id}
                        whileHover={{ x: 4 }}
                        className="flex items-center justify-between p-2 rounded-xl transition-all border border-transparent hover:border-white/5 hover:bg-white/[0.02] cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-xs font-bold w-4 text-center ${isTop3 ? "text-[#00e0c2]" : "text-white/35"}`}>
                            {rank}
                          </span>

                          <div className="w-9 h-9 rounded-full relative border border-white/10 flex items-center justify-center overflow-hidden bg-white/5">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full opacity-60 bg-cover" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}')` }} />
                            )}
                            {rank === 1 && (
                              <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-yellow-500 rounded-full border border-black flex items-center justify-center">
                                <Star className="w-1.5 h-1.5 text-black fill-black" />
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-black dark:text-white font-semibold text-xs tracking-tight">{user.username}</div>
                            <div className="text-black/35 dark:text-white/35 text-[10px] font-mono">{walletShort}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-mono text-xs font-bold ${isTop3 ? "text-[#00e0c2]" : "text-white/80"}`}>
                            {user.total_taps} T
                          </div>
                          <div className="text-black/40 dark:text-white/40 text-[10px] font-mono">
                            {user.total_reputation >= 1000 ? (user.total_reputation / 1000).toFixed(1) + "k" : user.total_reputation} R
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {topUsers.length > 0 && (
                <button
                  onClick={() => setIsFullLeaderboardModalOpen(true)}
                  className="w-full mt-6 py-3 border-t border-black/5 dark:border-white/5 text-xs font-display font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-[#00e0c2] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  View Full Leaderboard <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          </div>

          {/* SECTION 3: ECOSYSTEM & TIMELINE SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Ecosystem Split (col-span-4) */}
            <div className="lg:col-span-4">
              <EcosystemDonutChart
                mwaPercentage={analytics?.ecosystem_stats?.mwa_percentage ?? 0}
                web2Percentage={analytics?.ecosystem_stats?.web2_percentage ?? 0}
                mwaUsers={analytics?.ecosystem_stats?.mwa_wallet_users ?? 0}
                web2Users={analytics?.ecosystem_stats?.web2_users ?? 0}
              />
            </div>

            {/* Peak Activity Timeline (col-span-8) */}
            <div className="lg:col-span-8">
              <ActivityTimelineChart
                hourlyActivity={analytics?.hourly_activity ?? []}
              />
            </div>
          </div>

          {/* SECTION 4: SOCIAL GRAPH & BROADCAST SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Social Force Graph (col-span-8) */}
            <div className="lg:col-span-8">
              <SocialForceGraph
                nodes={socialGraph.nodes}
                edges={socialGraph.edges}
              />
            </div>

            {/* Broadcast Panel (col-span-4) */}
            <div className="lg:col-span-4">
              <BroadcastPanel
                eventId={selectedEventId}
                recipientCount={analytics?.accepted_requests || 0}
              />
            </div>
          </div>

          {/* SECTION 5: EVENT POSTS FROM ATTENDEES */}
          <EventPostsSection postId={selectedEventId} />

          {/* SECTION 6: ATTENDEE RAFFLE & GIVEAWAY SECTION */}
          <AttendeeRaffle
            key={selectedEventId ?? "no-event"}
            attendees={topUsers}
            isLoading={isLoadingTopUsers}
            selectedEventId={selectedEventId}
          />

        </motion.div>
      </main>
    </div>
  );
}
