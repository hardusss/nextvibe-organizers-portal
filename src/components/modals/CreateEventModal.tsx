"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Calendar, MapPin, Clock, FileText, Upload, ImageIcon,
  Loader2, CheckCircle, AlertCircle, Trash2, Link2, Copy,
  Check, ArrowRight, ArrowLeft, Shield, Sparkles,
} from "lucide-react";
import {
  previewLumaEvent, verifyLumaEvent, createEventFull,
  extractBackendError,
  type LumaEventPreview, type PreviewResult,
} from "@/src/api/events";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
}

type Step = 1 | 2 | 3 | 4;
type SubmitPhase = "creating" | "uploading" | "finalizing" | "minting" | "done" | null;

const STEPS = ["Paste URL", "Verify", "Customize", "Submit"];

/* ───── tiny sub-components ───── */

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1 px-5 pt-4">
      {STEPS.map((label, i) => {
        const step = (i + 1) as Step;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${
              done ? "bg-[#00e0c2]" : active ? "bg-purple-500" : "bg-black/10 dark:bg-white/10"
            }`} />
            <span className={`text-[10px] font-medium transition-colors ${
              active ? "text-purple-500 dark:text-purple-400" : done ? "text-[#00bda3]" : "text-black/30 dark:text-white/30"
            }`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-[#00e0c2]" /> : <Copy className="w-4 h-4 text-black/50 dark:text-white/50" />}
    </button>
  );
}

/* ───── main component ───── */

export default function CreateEventModal({ isOpen, onClose, onEventCreated }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [lumaUrl, setLumaUrl] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);

  // Step 2
  const [isVerifying, setIsVerifying] = useState(false);

  // Step 3
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 4
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>(null);

  // Shared
  const [error, setError] = useState("");

  /* ── helpers ── */

  const isoLocal = (iso: string | null | undefined) => {
    if (!iso) return "";
    try { return new Date(iso).toISOString().slice(0, 16); } catch { return ""; }
  };

  const resetAll = useCallback(() => {
    setStep(1); setLumaUrl(""); setIsPreviewing(false); setPreviewData(null);
    setIsVerifying(false); setAbout(""); setLocation(""); setStartTime("");
    setEndTime(""); setMediaFile(null); setMediaPreview(null); setSubmitPhase(null);
    setError(""); setIsDragging(false);
  }, []);

  const handleClose = useCallback(() => {
    if (submitPhase && submitPhase !== "done") return;
    resetAll(); onClose();
  }, [submitPhase, resetAll, onClose]);

  /* ── Step 1: Preview ── */

  const handlePreview = async () => {
    const url = lumaUrl.trim();
    if (!url) return;

    if (!url.includes("luma.com")) {
      setError("Please enter a valid luma.com URL.");
      return;
    }

    setError(""); setIsPreviewing(true);
    try {
      const result = await previewLumaEvent(url);
      setPreviewData(result);
      setStep(2);
    } catch (e) { setError(extractBackendError(e)); }
    finally { setIsPreviewing(false); }
  };

  /* ── Step 2: Verify ── */

  const handleVerify = async () => {
    setError(""); setIsVerifying(true);
    try {
      const result = await verifyLumaEvent(lumaUrl.trim());
      if (!result.verified) { setError("Code not found on the Luma page. Make sure you saved your changes."); return; }
      const ev = result.event;
      setAbout(ev.title || ev.description?.slice(0, 255) || "");
      setLocation(ev.location?.address || ev.location?.name || "");
      setStartTime(isoLocal(ev.start_time)); setEndTime(isoLocal(ev.end_time));
      if (ev.cover_image) setMediaPreview(ev.cover_image);
      setStep(3);
    } catch (e) { setError(extractBackendError(e)); }
    finally { setIsVerifying(false); }
  };

  /* ── Step 3 helpers ── */

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;
    setMediaFile(file); setMediaPreview(URL.createObjectURL(file));
  }, []);

  const removeMedia = useCallback(() => {
    setMediaFile(null);
    if (mediaPreview && mediaPreview.startsWith("blob:")) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [mediaPreview]);

  const isStep3Valid = about.trim() && startTime && endTime && (mediaFile || mediaPreview);

  /* ── Step 4: Submit pipeline ── */

  const handleSubmit = async () => {
    setError(""); setStep(4); setSubmitPhase("creating");
    try {
      const ev = previewData?.event;
      const lat = ev?.location?.lat ?? 0;
      const lng = ev?.location?.lng ?? 0;

      // If cover is from Luma URL (not local file), download it as a File
      let fileToUpload = mediaFile;
      if (!fileToUpload && mediaPreview && !mediaPreview.startsWith("blob:")) {
        try {
          const resp = await fetch(mediaPreview);
          const blob = await resp.blob();
          fileToUpload = new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" });
        } catch {
          throw new Error("Failed to download Luma cover image. Please upload a cover image manually.");
        }
      }

      if (!fileToUpload) {
        throw new Error("Event cover image (banner) is required.");
      }

      await createEventFull({
        lumaUrl: lumaUrl.trim(),
        about: about.trim(),
        location: location.trim() || undefined,
        coords: { lat, lng },
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        mediaFile: fileToUpload,
        onStep: (s) => setSubmitPhase(s),
      });

      setTimeout(() => { resetAll(); onClose(); onEventCreated?.(); }, 1500);
    } catch (e) {
      setError(extractBackendError(e));
      setSubmitPhase(null); setStep(3);
    }
  };

  /* ── render helpers ── */

  const code = previewData?.code || "";
  const ev = previewData?.event;

  const inputCls = "w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all";

  /* ──────────────────── JSX ──────────────────── */

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={handleClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0d0d12] border border-black/10 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-w-lg w-[95%] md:w-full max-h-[90vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="p-4 md:p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/5 to-cyan-500/5 dark:from-purple-500/10 dark:to-cyan-500/10">
              <h3 className="text-base md:text-lg font-bold text-black dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Create New Event
              </h3>
              <button onClick={handleClose} disabled={submitPhase !== null && submitPhase !== "done"}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-black/50 dark:text-white/50 transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <StepIndicator current={step} />

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 custom-scrollbar">
              <AnimatePresence mode="wait">

                {/* ═══ STEP 1: Paste Luma URL ═══ */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
                      <Link2 className="w-4 h-4 text-purple-500" />
                      Paste your <span className="font-semibold text-purple-500">luma.com</span> event URL to get started
                    </div>
                    <input type="url" value={lumaUrl} onChange={(e) => setLumaUrl(e.target.value)}
                      placeholder="https://luma.com/your-event" className={inputCls}
                      onKeyDown={(e) => { if (e.key === "Enter" && lumaUrl.trim()) handlePreview(); }} />

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#e04545] dark:text-[#ff6b6b] text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ═══ STEP 2: Verify Code ═══ */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-4">
                    {/* Event preview card */}
                    {ev && (
                      <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                        {ev.cover_image && (
                          <img src={ev.cover_image} alt={ev.title || "Event"} className="w-full h-32 object-cover" />
                        )}
                        <div className="p-3 space-y-1">
                          <p className="font-semibold text-sm text-black dark:text-white">{ev.title}</p>
                          {ev.location?.name && (
                            <p className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{ev.location.name}{ev.location.address ? ` — ${ev.location.address}` : ""}
                            </p>
                          )}
                          {ev.start_time && (
                            <p className="text-xs text-black/50 dark:text-white/50 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{new Date(ev.start_time).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Code display */}
                    <div className="rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
                        <Shield className="w-4 h-4" />
                        Verification Code
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
                          {code}
                        </span>
                        <CopyButton text={code} />
                      </div>
                      <p className="text-xs text-black/50 dark:text-white/40">
                        Add this code to your Luma event description, save it, then click <strong>Verify</strong>.
                        Code expires in 15 minutes.
                      </p>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#e04545] dark:text-[#ff6b6b] text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ═══ STEP 3: Customize ═══ */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-4">
                    {/* About */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                        <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea value={about} onChange={(e) => setAbout(e.target.value.slice(0, 255))}
                        placeholder="Describe your event..." rows={3} className={`${inputCls} resize-none`} />
                      <p className="text-xs text-right text-black/30 dark:text-white/30">{about.length}/255</p>
                    </div>
                    {/* Location */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                        <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Location
                      </label>
                      <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                        placeholder="Event location" className={inputCls} />
                    </div>
                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                          <Clock className="w-4 h-4 text-[#00bda3]" /> Start <span className="text-red-500">*</span>
                        </label>
                        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                          className={`${inputCls} [color-scheme:light] dark:[color-scheme:dark]`} />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                          <Clock className="w-4 h-4 text-[#e04545]" /> End <span className="text-red-500">*</span>
                        </label>
                        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                          min={startTime} className={`${inputCls} [color-scheme:light] dark:[color-scheme:dark]`} />
                      </div>
                    </div>
                    {/* Media */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                        <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Cover
                        <span className="text-red-500">*</span>
                      </label>
                      {mediaPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 group">
                          <img src={mediaPreview} alt="Cover" className="w-full h-36 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <button onClick={removeMedia}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500/90 rounded-full text-white shadow-lg">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                            isDragging ? "border-purple-500 bg-purple-500/10" : "border-black/15 dark:border-white/15 hover:border-purple-500/50 hover:bg-black/5 dark:hover:bg-white/5"
                          }`}>
                          <Upload className={`w-6 h-6 ${isDragging ? "text-purple-500" : "text-black/30 dark:text-white/30"}`} />
                          <span className="text-xs text-black/40 dark:text-white/40">
                            {isDragging ? "Drop here" : "Drag & drop or click"}
                          </span>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#e04545] dark:text-[#ff6b6b] text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ═══ STEP 4: Submitting ═══ */}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                    className="space-y-3 py-6">
                    {(["creating", "uploading", "finalizing", "minting", "done"] as const).map((phase) => {
                      const labels = {
                        creating: "Creating event post…",
                        uploading: "Uploading media…",
                        finalizing: "Submitting for moderation…",
                        minting: "Minting event cNFT…",
                        done: "Event created & cNFT minted!"
                      };
                      const order = ["creating", "uploading", "finalizing", "minting", "done"];
                      const ci = order.indexOf(submitPhase || "creating");
                      const pi = order.indexOf(phase);
                      const isDone = pi < ci || submitPhase === "done";
                      const isActive = pi === ci && submitPhase !== "done";
                      return (
                        <div key={phase} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isDone ? "bg-[#00e0c2]/10 border border-[#00e0c2]/20" : isActive ? "bg-purple-500/10 border border-purple-500/20" : "bg-black/5 dark:bg-white/5 border border-transparent opacity-40"
                        }`}>
                          {isDone ? <CheckCircle className="w-5 h-5 text-[#00e0c2]" />
                            : isActive ? <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                            : <div className="w-5 h-5 rounded-full border-2 border-black/20 dark:border-white/20" />}
                          <span className={`text-sm font-medium ${isDone ? "text-[#00bda3]" : isActive ? "text-purple-500" : "text-black/40 dark:text-white/40"}`}>
                            {labels[phase]}
                          </span>
                        </div>
                      );
                    })}
                    {submitPhase === "done" && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center gap-2 pt-4 text-[#00bda3] font-semibold">
                        <Sparkles className="w-5 h-5" /> Your event is live with cNFT!
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {step !== 4 && (
              <div className="p-4 md:p-5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
                <div>
                  {step > 1 && (
                    <button onClick={() => { setError(""); setStep((s) => (s - 1) as Step); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleClose}
                    className="px-4 py-2.5 rounded-xl font-medium text-sm text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    Cancel
                  </button>

                  {step === 1 && (
                    <motion.button whileHover={lumaUrl.trim() ? { scale: 1.02 } : {}} whileTap={lumaUrl.trim() ? { scale: 0.98 } : {}}
                      onClick={handlePreview} disabled={!lumaUrl.trim() || isPreviewing}
                      className={`px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-lg ${
                        lumaUrl.trim() && !isPreviewing ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20" : "bg-black/10 dark:bg-white/10 text-black/30 dark:text-white/30 cursor-not-allowed shadow-none"
                      }`}>
                      {isPreviewing ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</> : <><ArrowRight className="w-4 h-4" /> Preview</>}
                    </motion.button>
                  )}

                  {step === 2 && (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleVerify} disabled={isVerifying}
                      className={`px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-lg ${
                        !isVerifying ? "bg-[#00bda3] hover:bg-[#00a88f] text-white shadow-[#00bda3]/20" : "bg-black/10 dark:bg-white/10 text-black/30 dark:text-white/30 cursor-not-allowed shadow-none"
                      }`}>
                      {isVerifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <><Shield className="w-4 h-4" /> Verify</>}
                    </motion.button>
                  )}

                  {step === 3 && (
                    <motion.button whileHover={isStep3Valid ? { scale: 1.02 } : {}} whileTap={isStep3Valid ? { scale: 0.98 } : {}}
                      onClick={handleSubmit} disabled={!isStep3Valid}
                      className={`px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-lg ${
                        isStep3Valid ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20" : "bg-black/10 dark:bg-white/10 text-black/30 dark:text-white/30 cursor-not-allowed shadow-none"
                      }`}>
                      <Calendar className="w-4 h-4" /> Create Event
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
