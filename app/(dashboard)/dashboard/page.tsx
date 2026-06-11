"use client";

import { useEffect, useState } from "react";
import TopNav from "@/src/components/layout/TopNav";
import { getUserDetail } from "@/src/api/user.detail";
import { getHostedEvents, getEventAnalytics, getEventTopUsers, type TopUser } from "@/src/api/events";
import { FileText, Radio, Fingerprint, Award, ChevronRight, Activity, Star, ChevronDown, Users } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import TapHeatmap from "@/src/components/analytics/TapHeatmap";

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
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [isLoadingTopUsers, setIsLoadingTopUsers] = useState<boolean>(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const [profileData, eventsResponse] = await Promise.all([
          getUserDetail(undefined, true),
          getHostedEvents()
        ]);
        
        setUserProfile(profileData);
        
        const evts = eventsResponse.data || [];
        // Sort by create_at descending to get the latest first
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
        console.log(data)
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

  const selectedEvent = events.find(e => e.post_id === selectedEventId);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-8 transition-colors duration-200">
      <TopNav 
        title="Dashboard"
        userProfile={userProfile} 
      />

      <main className="px-4 md:px-8 flex-1 flex flex-col gap-6 mt-2">
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 md:gap-0">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-black/50 dark:text-white/50 text-sm font-medium">Event Analytics</span>
            </div>
            {events.length > 0 ? (
              <div className="relative inline-flex items-center group cursor-pointer max-w-full">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-black dark:text-white tracking-wide border-b-2 border-dashed border-black/20 dark:border-white/20 group-hover:border-black/50 dark:group-hover:border-white/50 transition-colors pb-0.5 truncate">
                  {selectedEvent?.about || 'Select Event'}
                </h1>
                <ChevronDown className="w-5 h-5 md:w-6 md:h-6 ml-2 shrink-0 text-black/40 dark:text-white/40 group-hover:text-black/70 dark:group-hover:text-white/70 transition-colors" />
                
                <select 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={selectedEventId || ''}
                  onChange={(e) => setSelectedEventId(Number(e.target.value))}
                >
                  {events.map(evt => (
                    <option key={evt.post_id} value={evt.post_id} className="text-base text-black dark:text-white bg-white dark:bg-[#0d0d12]">
                      {evt.about}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <h1 className="text-xl md:text-2xl font-bold text-black dark:text-white tracking-wide">Dashboard Overview</h1>
            )}
            <p className="text-black/50 dark:text-white/50 text-sm mt-2">Real-time statistics for your event.</p>
          </div>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-6"
        >
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Applications Card */}
            <motion.div variants={item} whileHover={{ y: -5 }} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200 cursor-default min-h-[160px]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-black/50 dark:text-white/50 text-xs font-semibold tracking-wider">EVENT REQUESTS</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg"><FileText className="w-4 h-4 text-black/60 dark:text-white/60" /></div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-2">
                  <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-full"></div>
                </div>
              ) : analytics ? (
                <>
                  <div className="text-3xl font-bold text-black dark:text-white mb-3 tracking-tight">
                    <CountUp to={analytics.total_requests || 0} />
                  </div>
                  
                  {/* Progress Bar Breakdown */}
                  <div className="w-full flex h-2 rounded-full overflow-hidden mb-3">
                    <div style={{ width: `${(analytics.accepted_requests / (analytics.total_requests || 1)) * 100}%` }} className="bg-[#00e0c2]"></div>
                    <div style={{ width: `${(analytics.rejected_requests / (analytics.total_requests || 1)) * 100}%` }} className="bg-[#ff6b6b]"></div>
                    <div style={{ width: `${((analytics.total_requests - analytics.accepted_requests - analytics.rejected_requests) / (analytics.total_requests || 1)) * 100}%` }} className="bg-black/10 dark:bg-white/20"></div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs font-medium flex-wrap">
                    <div className="flex items-center gap-1.5 text-[#00bda3] dark:text-[#00e0c2]">
                      <div className="w-1.5 h-1.5 bg-[#00bda3] dark:bg-[#00e0c2] rounded-full" />
                      <span><CountUp to={analytics.accepted_requests || 0} /> Accepted</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#e04545] dark:text-[#ff6b6b]">
                      <div className="w-1.5 h-1.5 bg-[#e04545] dark:bg-[#ff6b6b] rounded-full" />
                      <span><CountUp to={analytics.rejected_requests || 0} /> Rejected</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-black/40 dark:text-white/40">
                      <div className="w-1.5 h-1.5 bg-black/30 dark:bg-white/30 rounded-full" />
                      <span><CountUp to={Math.max(0, (analytics.total_requests || 0) - (analytics.accepted_requests || 0) - (analytics.rejected_requests || 0))} /> Pending</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-black/40 dark:text-white/40">No data</div>
              )}
            </motion.div>

            {/* NFC Check-ins Card */}
            <motion.div variants={item} whileHover={{ y: -5 }} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200 cursor-default min-h-[160px]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-black/50 dark:text-white/50 text-xs font-semibold tracking-wider">NFC CHECK-INS</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg"><Radio className="w-4 h-4 text-black/60 dark:text-white/60" /></div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-2">
                  <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                  <div className="h-2 bg-black/10 dark:bg-white/10 rounded w-full mt-4"></div>
                </div>
              ) : analytics ? (
                <>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-3xl font-bold text-black dark:text-white tracking-tight">
                      <CountUp to={analytics.nfc_checkins || 0} />
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#00e0c2]/20 dark:bg-[#00e0c2]/10 text-[#00bda3] dark:text-[#00e0c2] text-xs font-semibold flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Live
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (analytics.nfc_checkins / (analytics.total_requests || 1)) * 100)}%` }} transition={{ duration: 1, delay: 0.5, ease: "easeOut" }} className="h-full bg-[#00e0c2] shadow-[0_0_10px_rgba(0,224,194,0.3)] dark:shadow-[0_0_10px_rgba(0,224,194,0.5)] rounded-full"></motion.div>
                  </div>
                  <div className="text-xs text-black/40 dark:text-white/40 mt-2 font-medium">
                    {Math.round((analytics.nfc_checkins / (analytics.total_requests || 1)) * 100)}% conversion rate
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-black/40 dark:text-white/40">No data</div>
              )}
            </motion.div>

            {/* Total IRL Taps Card */}
            <motion.div variants={item} whileHover={{ y: -5 }} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200 cursor-default min-h-[160px]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-black/50 dark:text-white/50 text-xs font-semibold tracking-wider">TOTAL IRL TAPS</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg"><Fingerprint className="w-4 h-4 text-black/60 dark:text-white/60" /></div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-2">
                  <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-1/3"></div>
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-2/3"></div>
                </div>
              ) : analytics ? (
                <>
                  <div className="text-3xl font-bold text-black dark:text-white mb-2 tracking-tight drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                    <CountUp to={analytics.total_irl_taps || 0} />
                  </div>
                  <div className="text-black/50 dark:text-white/50 text-sm">Social connections forged via NFC</div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-black/40 dark:text-white/40">No data</div>
              )}
            </motion.div>

            {/* Total Rep Earned Card */}
            <motion.div variants={item} whileHover={{ y: -5 }} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] relative overflow-hidden transition-colors duration-200 cursor-default min-h-[160px]">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl z-0"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent z-0"></div>
              <div className="relative z-10 flex justify-between items-start mb-2">
                <h3 className="text-black/50 dark:text-white/50 text-xs font-semibold tracking-wider">TOTAL REP EARNED</h3>
                <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg"><Award className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="animate-pulse space-y-4 w-full mt-2 relative z-10">
                  <div className="h-8 bg-purple-500/20 rounded w-1/3"></div>
                  <div className="h-4 bg-purple-500/20 rounded w-2/3"></div>
                </div>
              ) : analytics ? (
                <>
                  <div className="relative z-10 text-3xl font-bold text-black dark:text-white mb-2 tracking-tight">
                    <CountUp to={analytics.total_reputation_earned || 0} format="k" />
                  </div>
                  <div className="relative z-10 text-purple-600 dark:text-purple-400 text-sm font-medium">Network reputation distributed</div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-black/40 dark:text-white/40 relative z-10">No data</div>
              )}
            </motion.div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
            {/* Spatial Heatmap */}
            <motion.div variants={item} className="lg:col-span-2 bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-4 md:p-6 flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
                <div>
                  <h2 className="text-lg font-semibold text-black dark:text-white">Spatial Heatmap</h2>
                  <p className="text-black/40 dark:text-white/40 text-sm">Real-time floorplan activity indexing</p>
                </div>
                <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1 border border-black/10 dark:border-white/10">
                  <button className="px-3 py-1 rounded-md bg-white dark:bg-white/10 text-black dark:text-white text-xs font-medium shadow-sm dark:shadow-none flex items-center gap-1.5">
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-red-500" /> Live
                  </button>
                </div>
              </div>
              
              {selectedEventId ? (
                <TapHeatmap postId={selectedEventId} />
              ) : (
                <div className="flex-1 min-h-[350px] rounded-xl bg-gray-100 dark:bg-black border border-black/5 dark:border-white/5 flex items-center justify-center text-sm text-black/40 dark:text-white/40">
                  Select an event to view heatmap
                </div>
              )}
            </motion.div>

            {/* Top Attendees */}
            <motion.div variants={item} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-4 md:p-6 flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Top Attendees
                </h2>
                <p className="text-black/40 dark:text-white/40 text-sm mt-1">Ranked by reputation & NFC taps</p>
              </div>

              <div className="flex-1 flex flex-col gap-5">
                {isLoadingTopUsers ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-2 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 bg-black/10 dark:bg-white/10 rounded" />
                        <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10" />
                        <div className="space-y-2">
                          <div className="h-3 w-20 bg-black/10 dark:bg-white/10 rounded" />
                          <div className="h-2 w-16 bg-black/10 dark:bg-white/10 rounded" />
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="h-3 w-14 bg-black/10 dark:bg-white/10 rounded ml-auto" />
                        <div className="h-2 w-12 bg-black/10 dark:bg-white/10 rounded ml-auto" />
                      </div>
                    </div>
                  ))
                ) : topUsers.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-black/40 dark:text-white/40 py-10">
                    <Users className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">No attendee data yet</p>
                  </div>
                ) : (
                  topUsers.slice(0, 5).map((user, i) => {
                    const rank = i + 1;
                    const colorClass = rank <= 3 ? "text-[#00bda3] dark:text-[#00e0c2]" : "text-black/70 dark:text-white/70";
                    const avatarGradients = [
                      "bg-gradient-to-tr from-green-500 to-emerald-900",
                      "bg-gradient-to-tr from-cyan-500 to-blue-900",
                      "bg-gradient-to-tr from-orange-500 to-red-900",
                      "bg-gradient-to-tr from-blue-400 to-indigo-900",
                      "bg-gradient-to-tr from-purple-500 to-pink-900",
                    ];
                    const formatRep = (val: number) => val >= 1000 ? (val / 1000).toFixed(1) + "k" : val.toString();
                    const walletShort = user.wallet_address
                      ? `${user.wallet_address.slice(0, 4)}...${user.wallet_address.slice(-4)}`
                      : "—";

                    return (
                      <motion.div
                        key={user.user_id}
                        whileHover={{ scale: 1.02, x: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="flex items-center justify-between group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className={`font-bold w-4 text-center ${rank <= 3 ? "text-yellow-500" : "text-black/40 dark:text-white/40"}`}>{rank}</span>
                          <div className={`w-10 h-10 rounded-full ${avatarGradients[i % avatarGradients.length]} relative border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden`}>
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full opacity-50 bg-cover" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}')` }} />
                            )}
                            {rank === 1 && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white dark:border-[#0d0d12] flex items-center justify-center">
                                <Star className="w-2 h-2 text-white dark:text-[#0d0d12] fill-white dark:fill-[#0d0d12]" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-black dark:text-white font-medium text-sm">{user.username}</div>
                            <div className="text-black/40 dark:text-white/40 text-xs font-mono">{walletShort}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-sm ${colorClass}`}>{user.total_taps} Taps</div>
                          <div className="text-black/50 dark:text-white/50 text-xs">{formatRep(user.total_reputation)} Rep</div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {topUsers.length > 5 && (
                <motion.button whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }} className="w-full mt-6 py-3 rounded-lg text-sm font-medium text-black/60 dark:text-white/60 hover:text-purple-600 dark:hover:text-purple-400 flex items-center justify-center gap-1 transition-colors border-t border-black/5 dark:border-white/5 pt-4">
                  View Full Leaderboard <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
