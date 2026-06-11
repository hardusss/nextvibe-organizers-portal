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
import { FileText, Radio, Fingerprint, Award, ChevronRight, Activity, Star, ChevronDown, Users } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import TapHeatmap from "@/src/components/analytics/TapHeatmap";
import EcosystemDonutChart from "@/src/components/analytics/EcosystemDonutChart";
import ActivityTimelineChart from "@/src/components/analytics/ActivityTimelineChart";
import SocialForceGraph from "@/src/components/analytics/SocialForceGraph";
import BroadcastPanel from "@/src/components/analytics/BroadcastPanel";

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

  useEffect(() => {
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
        if (evts.length > 0) {
          setSelectedEventId(evts[0].post_id);
        }
      } catch (error) {
        console.error("Failed to initialize dashboard data:", error);
      }
    };
    initData();
  }, []);

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

  const selectedEvent = events.find(e => e.post_id === selectedEventId);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-8 transition-colors duration-200">
      <TopNav 
        title="Dashboard"
        userProfile={userProfile} 
      />

      <main className="px-4 md:px-8 flex-1 flex flex-col gap-8 mt-2">
        
        {/* Editorial Event Selector Header */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] tracking-widest text-[#00e0c2] font-mono font-bold uppercase">active session telemetry</span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {events.length > 0 ? (
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
                  {events.map(evt => (
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
          {/* ASYMMETRICAL STAT CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6">
            
            {/* Card 1: Applications (Wide - col-span-3) */}
            <motion.div 
               variants={item} 
               whileHover={{ y: -4 }} 
               className="lg:col-span-3 bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 flex flex-col justify-between shadow-sm backdrop-blur-md transition-all duration-250 cursor-default min-h-[180px]"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">event requests</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5"><FileText className="w-4 h-4 text-black/60 dark:text-white/60" /></div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-4">
                  <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-full"></div>
                </div>
              ) : analytics ? (
                <div className="mt-4 space-y-4">
                  <div className="text-4xl font-mono font-bold text-black dark:text-white tracking-tight">
                    <CountUp to={analytics.total_requests || 0} />
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full flex h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div style={{ width: `${(analytics.accepted_requests / (analytics.total_requests || 1)) * 100}%` }} className="bg-[#00e0c2]"></div>
                    <div style={{ width: `${(analytics.rejected_requests / (analytics.total_requests || 1)) * 100}%` }} className="bg-red-500"></div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[10px] font-mono font-bold uppercase flex-wrap">
                    <span className="text-[#00e0c2]"><CountUp to={analytics.accepted_requests || 0} /> Accepted</span>
                    <span className="text-red-500"><CountUp to={analytics.rejected_requests || 0} /> Rejected</span>
                    <span className="text-white/30"><CountUp to={Math.max(0, (analytics.total_requests || 0) - (analytics.accepted_requests || 0) - (analytics.rejected_requests || 0))} /> Pending</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-white/30">No data</div>
              )}
            </motion.div>

            {/* Card 2: NFC Check-ins (Standard - col-span-2) */}
            <motion.div 
              variants={item} 
              whileHover={{ y: -4 }} 
              className="lg:col-span-2 bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 flex flex-col justify-between shadow-sm backdrop-blur-md transition-all duration-250 cursor-default min-h-[180px]"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">nfc check-ins</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5"><Radio className="w-4 h-4 text-black/60 dark:text-white/60" /></div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-4">
                  <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-full"></div>
                </div>
              ) : analytics ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                     <span className="text-4xl font-mono font-bold text-black dark:text-white tracking-tight">
                       <CountUp to={analytics.nfc_checkins || 0} />
                     </span>
                     
                     {/* Glowing pulsating badge */}
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e0c2] opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e0c2]"></span>
                     </span>
                  </div>
                  
                  <div className="w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (analytics.nfc_checkins / (analytics.total_requests || 1)) * 100)}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-[#00e0c2] rounded-full"></motion.div>
                  </div>
                  <div className="text-[10px] font-mono text-white/40 uppercase font-bold">
                    {Math.round((analytics.nfc_checkins / (analytics.total_requests || 1)) * 100)}% Conversion Rate
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-white/30">No data</div>
              )}
            </motion.div>

            {/* Card 3: Total IRL Taps (Compact - col-span-2) */}
            <motion.div 
              variants={item} 
              whileHover={{ y: -4 }} 
              className="lg:col-span-2 bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 flex flex-col justify-between shadow-sm backdrop-blur-md transition-all duration-250 cursor-default min-h-[180px]"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">irl taps</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5"><Fingerprint className="w-4 h-4 text-black/60 dark:text-white/60" /></div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-4">
                  <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-2/3"></div>
                </div>
              ) : analytics ? (
                <div className="mt-4 space-y-2">
                  <div className="text-4xl font-mono font-bold text-black dark:text-white tracking-tight">
                    <CountUp to={analytics.total_irl_taps || 0} />
                  </div>
                  <p className="text-[10px] font-mono uppercase font-bold text-white/30">Total Connections</p>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-white/30">No data</div>
              )}
            </motion.div>

            {/* Card 4: Total Rep Earned (Standard - col-span-2) */}
            <motion.div 
              variants={item} 
              whileHover={{ y: -4 }} 
              className="lg:col-span-2 bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 flex flex-col justify-between shadow-sm backdrop-blur-md relative overflow-hidden transition-all duration-250 cursor-default min-h-[180px]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-glow)] rounded-full blur-[40px]" />
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">rep earned</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5"><Award className="w-4 h-4 text-[var(--accent-primary)]" /></div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-4 relative z-10">
                  <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                </div>
              ) : analytics ? (
                <div className="mt-4 space-y-2 relative z-10">
                  <div className="text-4xl font-mono font-bold text-black dark:text-white tracking-tight">
                    <CountUp to={analytics.total_reputation_earned || 0} format="k" />
                  </div>
                  <p className="text-[10px] font-mono uppercase font-bold text-[var(--accent-primary)]">Points Issued</p>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-white/30 relative z-10">No data</div>
              )}
            </motion.div>

            {/* Card 5: cNFT Claim Rate (col-span-3) */}
            <motion.div 
              variants={item} 
              whileHover={{ y: -4 }} 
              className="lg:col-span-3 bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 flex flex-col justify-between shadow-sm backdrop-blur-md transition-all duration-250 cursor-default min-h-[180px]"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">cnft claims</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5"><Award className="w-4 h-4 text-cyan-400" /></div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-4">
                  <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                </div>
              ) : analytics ? (
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-3xl font-mono font-bold text-black dark:text-white tracking-tight">
                      {analytics.cnft_claim_rate ? `${Math.round(analytics.cnft_claim_rate)}%` : "0%"}
                    </div>
                    <p className="text-[10px] font-mono uppercase font-bold text-black/30 dark:text-white/30">
                      {analytics.cnft_claims_count || 0} of {analytics.nfc_checkins || 0} claimed
                    </p>
                  </div>

                  {/* Circular progress SVG */}
                  <div className="relative w-14 h-14 shrink-0">
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
                <div className="flex-1 min-h-[350px] rounded-xl bg-black/10 border border-white/5 flex items-center justify-center text-xs text-white/30">
                  Select an event to view telemetry heatmap
                </div>
              )}
            </motion.div>

            {/* Top Attendees Box (col-span-4) */}
            <motion.div 
              variants={item} 
              className="lg:col-span-4 bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 md:p-6 flex flex-col shadow-sm backdrop-blur-md"
            >
              <div className="mb-6">
                <h2 className="text-lg font-display font-extrabold uppercase text-black dark:text-white tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#00e0c2]" />
                  Top Attendees
                </h2>
                <p className="text-black/40 dark:text-white/40 text-xs">Ranked leaderboard by connection volume</p>
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

              {topUsers.length > 5 && (
                <button className="w-full mt-6 py-3 border-t border-black/5 dark:border-white/5 text-xs font-display font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-[#00e0c2] flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
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
              />
            </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}
