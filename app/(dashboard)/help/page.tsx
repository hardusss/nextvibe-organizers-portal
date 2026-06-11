"use client";

import { useState, useEffect } from "react";
import TopNav from "@/src/components/layout/TopNav";
import { getUserDetail } from "@/src/api/user.detail";
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Info,
  Layers,
  PhoneCall,
  Calendar,
  Fingerprint
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  q: string;
  a: string;
}

export default function HelpPage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive Walkthrough state
  const [activeStep, setActiveStep] = useState(0);
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    getUserDetail(undefined, true)
      .then((data) => setUserProfile(data))
      .catch(() => {});
  }, []);

  const faqs: FAQItem[] = [
    {
      q: "How does the Luma Verification Flow work?",
      a: "When creating an event, you paste your Luma event URL. The system generates a verification code (e.g. 'NV-472') that you must paste into your Luma description. Click verify, and our API checks if the description contains this code, guaranteeing ownership."
    },
    {
      q: "What is H3 Geocoding and how is it used?",
      a: "We use Uber's H3 spatial index at resolution level 7. Taps that occur outside the geofence area or are spoofed are caught by this filter. This ensures only genuine, physical check-ins and attendee exchanges receive reputation points."
    },
    {
      q: "How does automated Solana cNFT minting execute?",
      a: "When an attendee is successfully checked in at the door, the backend triggers an automated transaction using nextvibe nft-service. A compressed NFT (cNFT) is minted to the attendee's Solana wallet representing their attendance proof."
    },
    {
      q: "Can I edit or delete events once they are created?",
      a: "Yes! Navigate to the Events tab, click on any of your hosted events, and select the 'Edit Details' button to update locations, dates, or banners, or select 'Delete Event' to permanently remove it."
    }
  ];

  const steps = [
    {
      title: "1. Create & Verify",
      description: "Organizers paste a Luma event URL. NextVibe verify ownership via a generated code placed in the Luma description, linking the event automatically.",
      icon: Calendar,
      color: "from-purple-500 to-indigo-500",
      visual: (isDark: boolean) => (
        <div className="flex flex-col items-center justify-center p-4 h-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl gap-3">
          <div className="px-3 py-1 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 rounded-lg text-xs font-bold text-purple-600 dark:text-[#00e0c2]">
            Luma Event URL
          </div>
          <div className="w-full h-8 bg-black/10 dark:bg-white/10 rounded-lg flex items-center px-3 text-[10px] text-black/60 dark:text-white/60 font-mono select-none">
            https://lu.ma/solana-builders-kyiv
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold mt-1">
            <CheckCircle2 className="w-4 h-4" /> Code NV-842 Verified
          </div>
        </div>
      )
    },
    {
      title: "2. NFC Check-In",
      description: "When attendees arrive, the door host scans their NFC badges. NextVibe records the location coordinate, verifies validity, and awards +5 reputation points.",
      icon: Layers,
      color: "from-cyan-500 to-blue-500",
      visual: (isDark: boolean) => (
        <div className="flex flex-col items-center justify-center p-4 h-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl gap-2">
          <div className="relative w-12 h-12 bg-cyan-500/20 border border-cyan-500/30 rounded-full flex items-center justify-center animate-pulse">
            <Layers className="w-6 h-6 text-cyan-500" />
          </div>
          <span className="text-xs font-bold text-black dark:text-white">Badge Scanned</span>
          <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 text-[10px] font-extrabold rounded-full">+5 Rep Awarded</span>
        </div>
      )
    },
    {
      title: "3. IRL Networking Taps",
      description: "Attendees tap their badges together to connect. NextVibe tracks IRL interactions, exchanges profiles, and allocates +10 reputation points for new contacts.",
      icon: Fingerprint,
      color: "from-emerald-500 to-teal-500",
      visual: (isDark: boolean) => (
        <div className="flex items-center justify-center gap-4 p-4 h-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">@alex</div>
            <span className="text-[9px] text-black/50 dark:text-white/40">User A</span>
          </div>
          <span className="text-xl animate-bounce">⚡</span>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-600 dark:text-[#00e0c2]">@kate</div>
            <span className="text-[9px] text-black/50 dark:text-white/40">User B</span>
          </div>
        </div>
      )
    },
    {
      title: "4. Automated Minting",
      description: "Once checked in, the NextVibe backend automatically mints a Solana compressed NFT (cNFT) containing the event details directly to their wallet address.",
      icon: Sparkles,
      color: "from-orange-500 to-red-500",
      visual: (isDark: boolean) => (
        <div className="flex flex-col items-center justify-center p-4 h-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl gap-2 text-center">
          <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-orange-500" />
          </div>
          <span className="text-[10px] font-mono text-black/50 dark:text-white/40">Minting cNFT...</span>
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 justify-center"><CheckCircle2 className="w-3.5 h-3.5" /> Mint Complete</span>
        </div>
      )
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setIsSubmitting(true);
    // Simulate submission delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
      setTimeout(() => setIsSubmitted(false), 5000);
    }, 1800);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-8 transition-colors duration-200 bg-gray-50 dark:bg-[#050505]">
      
      <TopNav title="Help & Guides" userProfile={userProfile} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 w-full mt-4 space-y-6">
        
        {/* Intro Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/10 to-cyan-900/10 dark:from-purple-950/20 dark:to-cyan-950/20 border border-black/5 dark:border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 max-w-xl">
            <h3 className="font-extrabold text-lg sm:text-xl md:text-2xl text-black dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-[#00e0c2] animate-pulse" /> Welcome to NextVibe Support
            </h3>
            <p className="text-xs sm:text-sm text-black/70 dark:text-white/60 leading-relaxed">
              Here you can discover how the NextVibe hardware-software ecosystem performs on-site check-ins, networking coordinates tracking, and NFT rewards minting.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-[#0d0d12]/50 backdrop-blur rounded-2xl border border-black/10 dark:border-white/10 text-xs text-black/60 dark:text-white/60 font-semibold shadow-sm">
            <Info className="w-4 h-4 text-purple-600 dark:text-[#00e0c2]" />
            Frontend-only support client
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Flow Walkthrough & FAQ */}
          <div className="space-y-6">
            
            {/* Walkthrough Slider Card */}
            <div className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-black dark:text-white">Lifecycle Walkthrough</h3>
                  <p className="text-xs text-black/50 dark:text-white/40">Step-by-step attendee journey simulation</p>
                </div>
              </div>

              {/* Slider UI */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center border border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] p-5 rounded-2xl h-[200px] sm:h-[180px]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-[#00e0c2]"></span>
                      <h4 className="font-extrabold text-sm text-black dark:text-white">{steps[activeStep].title}</h4>
                    </div>
                    <p className="text-xs text-black/60 dark:text-white/50 leading-relaxed">{steps[activeStep].description}</p>
                  </div>
                  <div className="h-full">
                    {steps[activeStep].visual(document.documentElement.classList.contains("dark"))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {steps.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveStep(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${activeStep === idx ? "w-6 bg-purple-600 dark:bg-[#00e0c2]" : "bg-black/20 dark:bg-white/20"}`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                      disabled={activeStep === 0}
                      className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
                      disabled={activeStep === steps.length - 1}
                      className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Accordion FAQ */}
            <div className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-black dark:text-white">Frequently Asked Questions</h3>
                  <p className="text-xs text-black/50 dark:text-white/40">Answers to common queries & setups</p>
                </div>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => {
                  const isActive = activeFaq === idx;
                  return (
                    <div 
                      key={idx}
                      className="border border-black/5 dark:border-white/5 rounded-xl overflow-hidden bg-black/[0.005] dark:bg-white/[0.005]"
                    >
                      <button
                        onClick={() => setActiveFaq(isActive ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left font-bold text-xs sm:text-sm text-black dark:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <span>{faq.q}</span>
                        {isActive ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-[#00e0c2]" /> : <ChevronDown className="w-4 h-4 text-black/40 dark:text-white/40" />}
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <p className="px-4 pb-4 text-xs text-black/60 dark:text-white/50 leading-relaxed border-t border-black/5 dark:border-white/5 pt-3">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Support Form */}
          <div className="space-y-6">
            
            <div className="bg-white dark:bg-[#0d0d12] border border-black/5 dark:border-white/5 rounded-2xl p-6 shadow-sm h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-black dark:text-white">Contact & Feedback</h3>
                  <p className="text-xs text-black/50 dark:text-white/40">Submit feedback or raise support inquiries</p>
                </div>
              </div>

              {isSubmitted ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 border border-dashed border-black/10 dark:border-white/10 rounded-2xl bg-black/[0.01] dark:bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-black dark:text-white">Feedback Submitted</h4>
                    <p className="text-xs text-black/50 dark:text-white/40 mt-1 max-w-xs mx-auto">
                      Thank you! Your simulated request was received. We will get back to you shortly.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="text-xs font-bold text-purple-600 dark:text-[#00e0c2] hover:underline"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-2">Your Name</label>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full text-sm bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-black dark:text-white focus:outline-none focus:border-purple-600 dark:focus:border-[#00e0c2] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-2">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full text-sm bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-black dark:text-white focus:outline-none focus:border-purple-600 dark:focus:border-[#00e0c2] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-black/60 dark:text-white/60 mb-2">Message</label>
                      <textarea 
                        required
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Write your suggestions or details..."
                        className="w-full text-sm bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-black dark:text-white focus:outline-none focus:border-purple-600 dark:focus:border-[#00e0c2] transition-colors resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-6 py-3 bg-purple-600 dark:bg-[#00e0c2] text-white dark:text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-700 dark:hover:bg-[#00e0c2]/90 disabled:opacity-50 transition-all shadow-md active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                        Submitting...
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit Feedback
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
