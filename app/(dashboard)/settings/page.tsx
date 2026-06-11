"use client";

import { useState, useEffect } from "react";
import TopNav from "@/src/components/layout/TopNav";
import { getUserDetail } from "@/src/api/user.detail";
import { 
  Wallet, 
  Map, 
  Volume2, 
  Palette, 
  Check, 
  Copy, 
  Sun, 
  Moon, 
  Sparkles,
  VolumeX,
  Volume1,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const { theme, setTheme } = useTheme();
  
  // Wallet states
  const [walletAddress, setWalletAddress] = useState("4k3DyjzvzpEs41D6y289as71bM4rD8z9zKk27a819b10");
  const [copied, setCopied] = useState(false);
  
  // Map settings
  const [mapZoom, setMapZoom] = useState("19");
  const [mapStyle, setMapStyle] = useState("dark");
  
  // Audio state
  const [playSound, setPlaySound] = useState(true);
  const [alertPlaying, setAlertPlaying] = useState(false);
  
  // Accent color state
  const [accent, setAccent] = useState("purple");
  const [showToast, setShowToast] = useState(false);

  // Initialize data
  useEffect(() => {
    // Get backend profile for top bar
    getUserDetail(undefined, true)
      .then((data) => setUserProfile(data))
      .catch(() => {});

    setWalletAddress(localStorage.getItem("nextvibe_wallet") || "4k3DyjzvzpEs41D6y289as71bM4rD8z9zKk27a819b10");
    setMapZoom(localStorage.getItem("nextvibe_map_zoom") || "19");
    setMapStyle(localStorage.getItem("nextvibe_map_style") || "dark");
    setPlaySound(localStorage.getItem("nextvibe_play_sound") !== "false");
    setAccent(localStorage.getItem("nextvibe_accent") || "purple");
  }, []);

  // Sync Accent variables to Document Element
  useEffect(() => {
    const accents: Record<string, { primary: string; hover: string; glow: string }> = {
      purple: { primary: "#8b5cf6", hover: "#7c3aed", glow: "rgba(139,92,246,0.2)" },
      emerald: { primary: "#10b981", hover: "#059669", glow: "rgba(16,185,129,0.2)" },
      cyan: { primary: "#06b6d4", hover: "#0891b2", glow: "rgba(6,182,212,0.2)" },
      orange: { primary: "#f97316", hover: "#ea580c", glow: "rgba(249,115,22,0.2)" },
    };

    const currentConfig = accents[accent] || accents.purple;
    document.documentElement.style.setProperty("--accent-primary", currentConfig.primary);
    document.documentElement.style.setProperty("--accent-hover", currentConfig.hover);
    document.documentElement.style.setProperty("--accent-glow", currentConfig.glow);
  }, [accent]);

  // Save Settings handler
  const handleSave = () => {
    localStorage.setItem("nextvibe_map_zoom", mapZoom);
    localStorage.setItem("nextvibe_map_style", mapStyle);
    localStorage.setItem("nextvibe_play_sound", playSound ? "true" : "false");
    localStorage.setItem("nextvibe_accent", accent);

    // Dispatch event to update AccentLoader instantly
    window.dispatchEvent(new Event("nextvibe_accent_changed"));

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Copy wallet address helper
  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Synthesis of Alert Sound using Web Audio API
  const handleTestSound = () => {
    setAlertPlaying(true);
    setTimeout(() => setAlertPlaying(false), 300);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
      
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Sound blocked or context unavailable", e);
    }
  };

  // Accent configuration color styles
  const accentColors = [
    { id: "purple", name: "Royal Purple", bg: "bg-purple-600" },
    { id: "emerald", name: "Emerald Green", bg: "bg-emerald-500" },
    { id: "cyan", name: "Neon Cyan", bg: "bg-cyan-500" },
    { id: "orange", name: "Amber Gold", bg: "bg-orange-500" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-8 transition-colors duration-200 bg-gray-50 dark:bg-[#050505] relative">
      <style>{`
        :root {
          --accent-primary: #8b5cf6;
          --accent-hover: #7c3aed;
          --accent-glow: rgba(139,92,246,0.15);
        }
        .dynamic-accent-btn {
          background-color: var(--accent-primary) !important;
        }
        .dynamic-accent-btn:hover {
          background-color: var(--accent-hover) !important;
        }
        .dynamic-accent-text {
          color: var(--accent-primary) !important;
        }
        .dynamic-accent-border {
          border-color: var(--accent-primary) !important;
        }
        .dynamic-accent-ring {
          box-shadow: 0 0 0 2px var(--accent-glow) !important;
        }
      `}</style>

      {/* Floating toast notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 bg-black/90 dark:bg-[#0d0d12]/95 backdrop-blur border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Preferences Saved</h4>
              <p className="text-[10px] text-white/50">Your changes are active across the app.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TopNav title="Settings" userProfile={userProfile} />

      <div className="max-w-4xl mx-auto px-4 md:px-8 w-full mt-4 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1 */}
          <div className="space-y-6">
            
            {/* Card A: Solana Wallet Info */}
            <div className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-black dark:text-white">Active Wallet Credentials</h3>
                  <p className="text-xs text-black/50 dark:text-white/40">Connected Solana account address</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-2">Solana Wallet Address</label>
                  <div className="flex gap-2">
                    <div className="flex-1 font-mono text-xs bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-black/70 dark:text-white/70 truncate flex items-center">
                      {walletAddress}
                    </div>
                    <button 
                      onClick={handleCopy}
                      className="p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-black/40 dark:text-white/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected to Solana network
                </div>
              </div>
            </div>

            {/* Card B: Map & Audio configs */}
            <div className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-black dark:text-white">Map & Audio Preferences</h3>
                  <p className="text-xs text-black/50 dark:text-white/40">Presets for heatmap visuals & notification alerts</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-2">Default Map Zoom</label>
                    <select 
                      value={mapZoom}
                      onChange={(e) => setMapZoom(e.target.value)}
                      className="w-full text-xs bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-black dark:text-white font-semibold focus:outline-none focus:border-purple-600 dark:focus:border-[#00e0c2]"
                    >
                      <option value="18" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">18 (Near)</option>
                      <option value="19" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">19 (Medium)</option>
                      <option value="20" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">20 (Close-Up)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-2">Base Map Style</label>
                    <select 
                      value={mapStyle}
                      onChange={(e) => setMapStyle(e.target.value)}
                      className="w-full text-xs bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-black dark:text-white font-semibold focus:outline-none focus:border-purple-600 dark:focus:border-[#00e0c2]"
                    >
                      <option value="dark" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">Carto Dark Matter</option>
                      <option value="light" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">Carto Voyager Light</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    {playSound ? <Volume1 className="w-5 h-5 text-purple-600 dark:text-[#00e0c2]" /> : <VolumeX className="w-5 h-5 text-black/30 dark:text-white/30" />}
                    <div>
                      <h4 className="text-xs font-bold text-black dark:text-white">Audio Check-in Alerts</h4>
                      <p className="text-[10px] text-black/40 dark:text-white/40">Synthesize alert beep on incoming scans</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleTestSound}
                      className={`px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-[10px] font-bold text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 transition-all ${alertPlaying ? "scale-95 bg-purple-600/10" : ""}`}
                    >
                      Test Sound
                    </button>
                    <button
                      onClick={() => setPlaySound(!playSound)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        playSound ? "bg-purple-600 dark:bg-[#00e0c2]" : "bg-black/20 dark:bg-white/20"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          playSound ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Column 2 */}
          <div className="space-y-6">

            {/* Card C: Accent / Theme controls */}
            <div className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-black dark:text-white">Theme & Palette Accents</h3>
                  <p className="text-xs text-black/50 dark:text-white/40">Personalize styling, theme, and contrast accents</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-2">General Theme Mode</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setTheme("dark")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                        theme === "dark" 
                          ? "bg-black/10 dark:bg-white/10 border-purple-600 dark:border-[#00e0c2] text-black dark:text-white" 
                          : "bg-transparent border-black/10 dark:border-white/10 text-black/60 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <Moon className="w-4 h-4" /> Dark Mode
                    </button>
                    <button 
                      onClick={() => setTheme("light")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                        theme === "light" 
                          ? "bg-black/10 dark:bg-white/10 border-purple-600 dark:border-[#00e0c2] text-black dark:text-white" 
                          : "bg-transparent border-black/10 dark:border-white/10 text-black/60 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <Sun className="w-4 h-4" /> Light Mode
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-3">Custom System Accent Color</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {accentColors.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setAccent(color.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                          accent === color.id
                            ? "border-black dark:border-white bg-black/[0.02] dark:bg-white/[0.02] shadow-[0_0_12px_rgba(139,92,246,0.1)] animate-pulse"
                            : "border-black/5 dark:border-white/5 bg-transparent hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${color.bg} border border-white/20 shadow-sm`} />
                        <span className="text-[10px] font-bold text-black/70 dark:text-white/70">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Style Preview Card */}
                <div className="border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] p-4 rounded-xl">
                  <span className="text-[10px] font-bold text-black/40 dark:text-white/40 block mb-3 uppercase tracking-wider">Accent Style Applied</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all dynamic-accent-btn">
                      Active Button
                    </button>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border dynamic-accent-border dynamic-accent-text dynamic-accent-ring">
                      Accent Badge
                    </span>
                    <span className="text-xs font-bold dynamic-accent-text cursor-pointer hover:underline">
                      Dynamic Link
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end pt-4 border-t border-black/5 dark:border-white/5">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 text-xs font-bold text-white rounded-xl shadow-lg transition-all dynamic-accent-btn active:scale-95"
          >
            <Sparkles className="w-4 h-4 animate-pulse" /> Save All Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
