"use client";

import { useState, useEffect } from "react";
import TopNav from "@/src/components/layout/TopNav";
import { getUserDetail } from "@/src/api/user.detail";
import { 
  Wallet, 
  Map, 
  Palette, 
  Check, 
  Copy, 
  Sun, 
  Moon, 
  Sparkles,
  VolumeX,
  Volume1
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
    const token = typeof window !== "undefined" ? localStorage.getItem("nextvibe_access") : null;
    if (token) {
      getUserDetail(undefined, true)
        .then((data) => setUserProfile(data))
        .catch(() => {});
    }

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
      cyan: { primary: "#00E5CC", hover: "#00c5aa", glow: "rgba(0,229,204,0.2)" },
      orange: { primary: "#f97316", hover: "#ea580c", glow: "rgba(249,115,22,0.2)" },
    };

    const currentConfig = accents[accent] || accents.cyan;
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
    { id: "purple", name: "Royal", bg: "bg-purple-600" },
    { id: "emerald", name: "Emerald", bg: "bg-emerald-500" },
    { id: "cyan", name: "Cyan", bg: "bg-[#00E5CC]" },
    { id: "orange", name: "Amber", bg: "bg-orange-500" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-8 transition-colors duration-200 relative">
      <style>{`
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
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 bg-black/90 dark:bg-[#0c0c0f] backdrop-blur-md border border-white/10 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-[#00e0c2]/10 border border-[#00e0c2]/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-[#00e0c2]" />
            </div>
            <div>
              <h4 className="text-xs font-display font-extrabold uppercase tracking-wide text-white">Preferences Saved</h4>
              <p className="text-[10px] font-mono text-white/50">Your changes are active across the app.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TopNav title="Settings" userProfile={userProfile} />

      <div className="max-w-4xl mx-auto px-4 md:px-8 w-full mt-4 space-y-6">
        
        {/* Title */}
        <div className="mb-2 flex flex-col gap-1">
          <span className="text-[10px] tracking-widest text-[#00e0c2] font-mono font-bold uppercase">preferences</span>
          <h2 className="text-2xl font-display font-extrabold uppercase text-black dark:text-white tracking-tight">
            Portal Settings
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1 */}
          <div className="space-y-6">
            
            {/* Card A: Solana Wallet Info */}
            <div className="bg-white/75 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <Wallet className="w-5 h-5 text-[#00e0c2]" />
                </div>
                <div>
                  <h3 className="font-display font-bold uppercase text-sm tracking-wide text-black dark:text-white">Active Wallet Credentials</h3>
                  <p className="text-[10px] font-mono text-black/50 dark:text-white/40">Connected Solana account address</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Solana Wallet Address</label>
                  <div className="flex gap-2">
                    <div className="flex-1 font-mono text-[11px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-black/70 dark:text-white/70 truncate flex items-center">
                      {walletAddress}
                    </div>
                    <button 
                      onClick={handleCopy}
                      className="p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-[#00e0c2]" /> : <Copy className="w-4 h-4 text-white/50" />}
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-black/40 dark:text-white/40 flex items-center gap-1.5 font-mono uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected to Solana mainnet
                </div>
              </div>
            </div>

            {/* Card B: Map & Audio configs */}
            <div className="bg-white/75 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <Map className="w-5 h-5 text-[#00e0c2]" />
                </div>
                <div>
                  <h3 className="font-display font-bold uppercase text-sm tracking-wide text-black dark:text-white">Map & Audio Preferences</h3>
                  <p className="text-[10px] font-mono text-black/50 dark:text-white/40">Presets for heatmap visuals & notification alerts</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Default Map Zoom</label>
                    <select 
                      value={mapZoom}
                      onChange={(e) => setMapZoom(e.target.value)}
                      className="w-full text-xs bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-black dark:text-white font-mono focus:outline-none focus:border-[#00e0c2]"
                    >
                      <option value="18" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">18 (Near)</option>
                      <option value="19" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">19 (Medium)</option>
                      <option value="20" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">20 (Close-Up)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Base Map Style</label>
                    <select 
                      value={mapStyle}
                      onChange={(e) => setMapStyle(e.target.value)}
                      className="w-full text-xs bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-black dark:text-white font-mono focus:outline-none focus:border-[#00e0c2]"
                    >
                      <option value="dark" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">Carto Dark Matter</option>
                      <option value="light" className="bg-white dark:bg-[#0d0d12] text-black dark:text-white">Carto Voyager Light</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    {playSound ? <Volume1 className="w-5 h-5 text-[#00e0c2]" /> : <VolumeX className="w-5 h-5 text-white/30" />}
                    <div>
                      <h4 className="text-xs font-display font-bold uppercase text-black dark:text-white tracking-wide">Audio Check-in Alerts</h4>
                      <p className="text-[9px] font-mono text-black/40 dark:text-white/40">Synthesize alert beep on incoming scans</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleTestSound}
                      className={`px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-[9px] font-mono uppercase tracking-wider text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer ${alertPlaying ? "scale-95 bg-[#00e0c2]/10" : ""}`}
                    >
                      Test Sound
                    </button>
                    
                    {/* Custom Toggle Switch */}
                    <button
                      onClick={() => setPlaySound(!playSound)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-white/10 transition-colors duration-200 ease-in-out focus:outline-none ${
                        playSound ? "bg-[#00e0c2]" : "bg-white/5"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white transition duration-200 ease-in-out ${
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
            <div className="bg-white/75 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <Palette className="w-5 h-5 text-[#00e0c2]" />
                </div>
                <div>
                  <h3 className="font-display font-bold uppercase text-sm tracking-wide text-black dark:text-white">Theme & Palette Accents</h3>
                  <p className="text-[10px] font-mono text-black/50 dark:text-white/40">Personalize styling, theme, and contrast accents</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">General Theme Mode</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setTheme("dark")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-display font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        theme === "dark" 
                          ? "bg-white/5 border-[#00e0c2] text-white" 
                          : "bg-transparent border-white/10 text-white/40 hover:bg-white/5"
                      }`}
                    >
                      <Moon className="w-4 h-4" /> Dark
                    </button>
                    <button 
                      onClick={() => setTheme("light")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-display font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        theme === "light" 
                          ? "bg-black/5 border-[#00e0c2] text-black" 
                          : "bg-transparent border-black/10 text-black/40 hover:bg-black/5"
                      }`}
                    >
                      <Sun className="w-4 h-4" /> Light
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-3">Custom System Accent Color</label>
                  
                  {/* Organic circular swatch layout */}
                  <div className="flex items-center justify-between px-2 py-3 bg-white/[0.01] border border-white/5 rounded-xl">
                    {accentColors.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setAccent(color.id)}
                        className="relative p-1 rounded-full border border-transparent hover:border-white/10 transition-all cursor-pointer flex items-center justify-center group"
                        title={color.name}
                      >
                        <div className={`w-9 h-9 rounded-full ${color.bg} border border-white/10 transition-transform duration-350 group-hover:scale-105 shadow-md flex items-center justify-center text-black font-extrabold`}>
                          {accent === color.id && (
                            <Check className="w-4 h-4 text-white drop-shadow-md" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Style Preview Card */}
                <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-white/40 block mb-3">Accent Style Applied</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="px-4 py-2 text-[10px] font-display font-extrabold uppercase tracking-wider text-white rounded-xl shadow-md transition-all dynamic-accent-btn cursor-pointer">
                      Active Button
                    </button>
                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase border dynamic-accent-border dynamic-accent-text dynamic-accent-ring">
                      Accent Badge
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold dynamic-accent-text cursor-pointer hover:underline">
                      Link Element
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
            className="flex items-center gap-2 px-6 py-3.5 text-xs font-display font-extrabold uppercase tracking-wider text-white rounded-xl shadow-lg transition-all dynamic-accent-btn active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-white" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
