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
  Layers,
  PhoneCall,
  Calendar,
  Fingerprint,
  Loader2
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
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nextvibe_access") : null;
    if (token) {
      getUserDetail(undefined, true)
        .then((data) => setUserProfile(data))
        .catch(() => {});
    }
  }, []);

  // Load Forminit SDK
  useEffect(() => {
    if (!document.querySelector('script[src="https://forminit.com/sdk/v1/forminit.js"]')) {
      const script = document.createElement("script");
      script.src = "https://forminit.com/sdk/v1/forminit.js";
      script.async = true;
      document.head.appendChild(script);
    }
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
      description: "Organizers paste a Luma event URL. NextVibe verifies ownership via a generated code placed in the Luma description, linking the event automatically.",
      icon: Calendar,
      visual: () => (
        <div className="flex flex-col items-center justify-center p-4 h-full bg-white/[0.01] border border-white/5 rounded-xl gap-2.5">
          <div className="px-2.5 py-1 bg-[#00e0c2]/10 border border-[#00e0c2]/20 rounded text-[9px] font-mono font-bold text-[#00e0c2] uppercase tracking-wider">
            Luma Event Link
          </div>
          <div className="w-full h-8 bg-white/5 rounded-lg flex items-center px-3 text-[10px] text-white/50 font-mono select-none border border-white/5 truncate">
            https://lu.ma/solana-builders-kyiv
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono uppercase tracking-wider mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Code verified
          </div>
        </div>
      )
    },
    {
      title: "2. NFC Check-In",
      description: "When attendees arrive, the door host scans their NFC badges. NextVibe records the location coordinate, verifies validity, and awards +5 reputation points.",
      icon: Layers,
      visual: () => (
        <div className="flex flex-col items-center justify-center p-4 h-full bg-white/[0.01] border border-white/5 rounded-xl gap-2 text-center">
          <div className="relative w-10 h-10 bg-[#00e0c2]/10 border border-[#00e0c2]/20 rounded-full flex items-center justify-center animate-pulse">
            <Layers className="w-5 h-5 text-[#00e0c2]" />
          </div>
          <span className="text-[10px] font-mono uppercase font-bold text-white tracking-wide">Badge Scanned</span>
          <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 text-[9px] font-mono uppercase tracking-wide rounded-lg">+5 Rep Awarded</span>
        </div>
      )
    },
    {
      title: "3. IRL Networking Taps",
      description: "Attendees tap their badges together to connect. NextVibe tracks IRL interactions, exchanges profiles, and allocates +10 reputation points for new contacts.",
      icon: Fingerprint,
      visual: () => (
        <div className="flex items-center justify-center gap-4 p-4 h-full bg-white/[0.01] border border-white/5 rounded-xl">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-[#00e0c2]">@alex</div>
            <span className="text-[9px] font-mono text-white/30">User A</span>
          </div>
          <span className="text-sm animate-bounce text-[#00e0c2]">⚡</span>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-[#00e0c2]">@kate</div>
            <span className="text-[9px] font-mono text-white/30">User B</span>
          </div>
        </div>
      )
    },
    {
      title: "4. Automated Minting",
      description: "Once checked in, the NextVibe backend automatically mints a Solana compressed NFT (cNFT) containing the event details directly to their wallet address.",
      icon: Sparkles,
      visual: () => (
        <div className="flex flex-col items-center justify-center p-4 h-full bg-white/[0.01] border border-white/5 rounded-xl gap-2 text-center">
          <div className="w-8 h-8 bg-[#00e0c2]/10 border border-[#00e0c2]/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#00e0c2]" />
          </div>
          <span className="text-[9px] font-mono text-white/40 uppercase tracking-wide">Minting cNFT...</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 flex items-center gap-1 justify-center"><CheckCircle2 className="w-3.5 h-3.5" /> Minted</span>
        </div>
      )
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    const ForminitSDK = (window as any).Forminit;
    if (!ForminitSDK) {
      setSubmitError("Form SDK is still loading. Please try again in a moment.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const forminit = new ForminitSDK();
      const FORM_ID = "0g3q0bitemw";
      const formData = new FormData();

      formData.append("fi-text-name", name.trim());
      formData.append("fi-text-email", email.trim());
      formData.append("fi-text-message", message.trim());

      const { error } = await forminit.submit(FORM_ID, formData);

      if (error) {
        console.error("Forminit API Error:", error);
        setSubmitError(error.message || "Submission failed.");
      } else {
        setIsSubmitted(true);
        setName("");
        setEmail("");
        setMessage("");
      }
    } catch (err: any) {
      console.error("Form submission error:", err);
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-8 transition-colors duration-200">
      
      <TopNav title="Help & Guides" userProfile={userProfile} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 w-full mt-4 space-y-6">
        
        {/* Intro Hero Section */}
        <div className="relative overflow-hidden bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm backdrop-blur-md">
          <div className="space-y-2 max-w-xl">
            <h3 className="font-display font-extrabold text-lg sm:text-xl text-black dark:text-white uppercase tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#00e0c2] animate-pulse" /> Support Portal
            </h3>
            <p className="text-xs text-black/70 dark:text-white/60 leading-relaxed">
              Explore how the NextVibe hardware-software ecosystem performs on-site check-ins, networking coordinates tracking, and NFT rewards minting.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white/5 dark:bg-white/5 backdrop-blur-md rounded-xl border border-black/10 dark:border-white/10 text-[10px] text-black/60 dark:text-white/60 font-mono uppercase tracking-wider shadow-sm">
            Frontend Client Active
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Flow Walkthrough & FAQ */}
          <div className="space-y-6">
            
            {/* Walkthrough Slider Card */}
            <div className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <Layers className="w-5 h-5 text-[#00e0c2]" />
                </div>
                <div>
                  <h3 className="font-display font-bold uppercase text-sm tracking-wide text-black dark:text-white">Lifecycle Walkthrough</h3>
                  <p className="text-[10px] font-mono text-black/50 dark:text-white/40">Step-by-step attendee journey simulation</p>
                </div>
              </div>

              {/* Slider UI */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center border border-black/5 dark:border-white/5 bg-black/[0.005] dark:bg-white/[0.005] p-5 rounded-xl h-[230px] sm:h-[190px]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00e0c2]"></span>
                      <h4 className="font-display font-bold uppercase text-xs text-black dark:text-white tracking-wide">{steps[activeStep].title}</h4>
                    </div>
                    <p className="text-[11px] text-black/60 dark:text-white/50 leading-relaxed">{steps[activeStep].description}</p>
                  </div>
                  <div className="h-full">
                    {steps[activeStep].visual()}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {steps.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveStep(idx)}
                        className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activeStep === idx ? "w-6 bg-[#00e0c2]" : "bg-white/20"}`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                      disabled={activeStep === 0}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-white/70 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
                      disabled={activeStep === steps.length - 1}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-white/70 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Accordion FAQ */}
            <div className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                  <HelpCircle className="w-5 h-5 text-[#00e0c2]" />
                </div>
                <div>
                  <h3 className="font-display font-bold uppercase text-sm tracking-wide text-black dark:text-white">Frequently Asked Questions</h3>
                  <p className="text-[10px] font-mono text-black/50 dark:text-white/40">Answers to common queries & setups</p>
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
                        className="w-full flex items-center justify-between p-4 text-left font-display font-bold text-xs uppercase tracking-wide text-black dark:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        {isActive ? <ChevronUp className="w-4 h-4 text-[#00e0c2]" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
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
            
            <div className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-6 shadow-sm backdrop-blur-md h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                    <PhoneCall className="w-5 h-5 text-[#00e0c2]" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold uppercase text-sm tracking-wide text-black dark:text-white">Contact & Feedback</h3>
                    <p className="text-[10px] font-mono text-black/50 dark:text-white/40">Submit feedback or raise support inquiries</p>
                  </div>
                </div>

                {isSubmitted ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-4 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold uppercase text-xs text-white tracking-wide">Feedback Submitted</h4>
                      <p className="text-[10px] font-mono text-white/50 mt-1 max-w-xs mx-auto">
                        Thank you! Your simulated request was received. We will get back to you shortly.
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsSubmitted(false)}
                      className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#00e0c2] hover:underline cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Your Name</label>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full text-sm bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00e0c2]/50 focus:bg-[#00e0c2]/[0.01] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full text-sm bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00e0c2]/50 focus:bg-[#00e0c2]/[0.01] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-black/60 dark:text-white/60 mb-2">Message</label>
                      <textarea 
                        required
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Write your suggestions or details..."
                        className="w-full text-sm bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00e0c2]/50 focus:bg-[#00e0c2]/[0.01] transition-all resize-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-transparent border border-white/10 hover:border-[#00e0c2] text-white font-display font-extrabold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Submitting...
                        </span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Submit Feedback
                        </>
                      )}
                    </button>

                    {submitError && (
                      <p className="text-xs text-red-400 text-center mt-2">
                        {submitError}
                      </p>
                    )}
                  </form>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
