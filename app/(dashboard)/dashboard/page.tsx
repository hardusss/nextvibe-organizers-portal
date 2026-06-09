"use client";

import { useEffect, useState } from "react";
import TopNav from "@/src/components/layout/TopNav";
import { getUserDetail } from "@/src/api/user.detail";
import { FileText, Radio, Fingerprint, Award, ChevronRight, Activity, Star } from "lucide-react";
import { motion } from "framer-motion";

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

export default function AnalyticsPage() {
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    // Fetch the current user profile on mount
    const fetchUser = async () => {
      try {
        const data = await getUserDetail(undefined, true);
        setUserProfile(data);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-8 transition-colors duration-200">
      <TopNav title="Event Analytics: NextVibe Summit" userProfile={userProfile} />

      <main className="px-8 flex-1 flex flex-col gap-6 mt-2">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-6"
        >
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Applications Card */}
            <motion.div variants={item} whileHover={{ y: -5 }} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200 cursor-default">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-black/50 dark:text-white/50 text-xs font-semibold tracking-wider">APPLICATIONS</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg"><FileText className="w-4 h-4 text-black/60 dark:text-white/60" /></div>
              </div>
              <div className="text-3xl font-bold text-black dark:text-white mb-4 tracking-tight">12,450</div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-[#00bda3] dark:text-[#00e0c2]">
                  <div className="w-3 h-3 rounded-full border border-[#00bda3] dark:border-[#00e0c2] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#00bda3] dark:bg-[#00e0c2] rounded-full" />
                  </div>
                  <span>8.2k Accepted</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#e04545] dark:text-[#ff6b6b]">
                  <div className="w-3 h-3 rounded-full border border-[#e04545] dark:border-[#ff6b6b] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#e04545] dark:bg-[#ff6b6b] rounded-full" />
                  </div>
                  <span>4.2k Rejected</span>
                </div>
              </div>
            </motion.div>

            {/* NFC Check-ins Card */}
            <motion.div variants={item} whileHover={{ y: -5 }} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200 cursor-default">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-black/50 dark:text-white/50 text-xs font-semibold tracking-wider">NFC CHECK-INS</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg"><Radio className="w-4 h-4 text-black/60 dark:text-white/60" /></div>
              </div>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold text-black dark:text-white tracking-tight">7,892</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00e0c2]/20 dark:bg-[#00e0c2]/10 text-[#00bda3] dark:text-[#00e0c2] text-xs font-semibold flex items-center gap-1">
                  <Activity className="w-3 h-3" /> +14%
                </span>
              </div>
              <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: "65%" }} transition={{ duration: 1, delay: 0.5, ease: "easeOut" }} className="h-full bg-[#00e0c2] shadow-[0_0_10px_rgba(0,224,194,0.3)] dark:shadow-[0_0_10px_rgba(0,224,194,0.5)] rounded-full"></motion.div>
              </div>
            </motion.div>

            {/* Total IRL Taps Card */}
            <motion.div variants={item} whileHover={{ y: -5 }} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200 cursor-default">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-black/50 dark:text-white/50 text-xs font-semibold tracking-wider">TOTAL IRL TAPS</h3>
                <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg"><Fingerprint className="w-4 h-4 text-black/60 dark:text-white/60" /></div>
              </div>
              <div className="text-3xl font-bold text-black dark:text-white mb-4 tracking-tight drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">45,210</div>
              <div className="text-black/40 dark:text-white/40 text-sm">Social connections forged</div>
            </motion.div>

            {/* Total Rep Earned Card */}
            <motion.div variants={item} whileHover={{ y: -5 }} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] relative overflow-hidden transition-colors duration-200 cursor-default">
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
              <div className="relative z-10 text-3xl font-bold text-black dark:text-white mb-4 tracking-tight">1.2M</div>
              <div className="relative z-10 text-purple-600 dark:text-purple-400 text-sm font-medium">Network reputation distributed</div>
            </motion.div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
            {/* Spatial Heatmap */}
            <motion.div variants={item} className="lg:col-span-2 bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-6 flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-black dark:text-white">Spatial Heatmap</h2>
                  <p className="text-black/40 dark:text-white/40 text-sm">Real-time floorplan activity indexing</p>
                </div>
                <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1 border border-black/10 dark:border-white/10">
                  <button className="px-3 py-1 rounded-md bg-white dark:bg-white/10 text-black dark:text-white text-xs font-medium shadow-sm dark:shadow-none flex items-center gap-1.5">
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-red-500" /> Live
                  </button>
                  <button className="px-3 py-1 rounded-md text-black/50 dark:text-white/50 text-xs font-medium hover:text-black dark:hover:text-white">24h</button>
                </div>
              </div>
              
              <div className="flex-1 bg-gray-100 dark:bg-black rounded-xl border border-black/5 dark:border-white/5 relative flex items-center justify-center overflow-hidden min-h-[300px]">
                <div className="absolute inset-0 opacity-10 dark:opacity-20 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                
                {/* Animated Heatmap Nodes */}
                <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.7, 0.9, 0.7] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[60%] left-[30%] w-16 h-16" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", background: "linear-gradient(135deg, rgba(0,224,194,0.1), rgba(0,224,194,0.4))", boxShadow: "inset 0 0 10px rgba(0,224,194,1)" }}>
                  <div className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full shadow-[0_0_10px_#00e0c2,0_0_20px_#00e0c2]"></div>
                </motion.div>
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }} className="absolute top-[40%] left-[45%] w-10 h-10 opacity-30" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", background: "rgba(139,92,246,0.5)" }}></motion.div>
                <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} className="absolute top-[45%] left-[50%] w-10 h-10" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", background: "rgba(139,92,246,0.5)" }}></motion.div>
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3.5, repeat: Infinity, delay: 0.2 }} className="absolute top-[60%] left-[60%] w-12 h-12 opacity-50" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.6))" }}></motion.div>
                
                {/* Animated Paths */}
                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 0.6, width: "3rem" }} transition={{ duration: 1.5, delay: 1 }} className="absolute top-[50%] left-[75%] h-2 rounded-full" style={{ background: "linear-gradient(90deg, rgba(217,70,239,0.2), rgba(217,70,239,0.8), rgba(217,70,239,0.2))", boxShadow: "0 0 15px rgba(217,70,239,0.6)" }}></motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ duration: 2, delay: 1.5 }} className="absolute top-[65%] left-[55%] w-12 h-[1px] bg-purple-500"></motion.div>

                <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-[#0d0d12]/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 flex gap-4 shadow-sm">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-black/30 dark:bg-white/30" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}></div><span className="text-black/60 dark:text-white/60 text-xs">Low</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-purple-500" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}></div><span className="text-black/60 dark:text-white/60 text-xs">Mid</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-[#00e0c2]" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}></div><span className="text-black/60 dark:text-white/60 text-xs">High</span></div>
                </div>
              </div>
            </motion.div>

            {/* Top Attendees */}
            <motion.div variants={item} className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-6 flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors duration-200">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Top Attendees
                </h2>
                <p className="text-black/40 dark:text-white/40 text-sm mt-1">Ranked by overall ecosystem engagement</p>
              </div>

              <div className="flex-1 flex flex-col gap-5">
                {[
                  { rank: 1, name: "Crypt...", address: "7xKp...9qZy", taps: "842 Taps", rep: "12.4k Rep", color: "text-[#00bda3] dark:text-[#00e0c2]", avatar: "bg-gradient-to-tr from-green-500 to-emerald-900" },
                  { rank: 2, name: "VibeM...", address: "3aJm...2xPw", taps: "710 Taps", rep: "9.8k Rep", color: "text-[#00bda3] dark:text-[#00e0c2]", avatar: "bg-gradient-to-tr from-cyan-500 to-blue-900" },
                  { rank: 3, name: "Alice...", address: "9vBc...1rLk", taps: "654 Taps", rep: "8.1k Rep", color: "text-[#00bda3] dark:text-[#00e0c2]", avatar: "bg-gradient-to-tr from-orange-500 to-red-900" },
                  { rank: 4, name: "Bob.sol", address: "5kTr...8nMo", taps: "512 Taps", rep: "6.5k Rep", color: "text-black/70 dark:text-white/70", avatar: "bg-gradient-to-tr from-blue-400 to-indigo-900" },
                  { rank: 5, name: "DeFi_...", address: "2pQw...7yUi", taps: "489 Taps", rep: "5.9k Rep", color: "text-black/70 dark:text-white/70", avatar: "bg-gradient-to-tr from-purple-500 to-pink-900" },
                ].map((user, i) => (
                  <motion.div 
                    key={user.rank} 
                    whileHover={{ scale: 1.02, x: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center justify-between group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`font-bold w-4 text-center ${user.rank <= 3 ? "text-yellow-500" : "text-black/40 dark:text-white/40"}`}>{user.rank}</span>
                      <div className={`w-10 h-10 rounded-full ${user.avatar} relative border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden`}>
                        <div className="w-full h-full opacity-50 bg-cover" style={{ backgroundImage: `url('https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}')` }}></div>
                        {user.rank === 1 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white dark:border-[#0d0d12] flex items-center justify-center">
                            <Star className="w-2 h-2 text-white dark:text-[#0d0d12] fill-white dark:fill-[#0d0d12]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-black dark:text-white font-medium text-sm">{user.name}</div>
                        <div className="text-black/40 dark:text-white/40 text-xs font-mono">{user.address}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-sm ${user.color}`}>{user.taps}</div>
                      <div className="text-black/50 dark:text-white/50 text-xs">{user.rep}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }} className="w-full mt-6 py-3 rounded-lg text-sm font-medium text-black/60 dark:text-white/60 hover:text-purple-600 dark:hover:text-purple-400 flex items-center justify-center gap-1 transition-colors border-t border-black/5 dark:border-white/5 pt-4">
                View Full Leaderboard <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
