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
import { useRole } from "@/src/contexts/RoleContext";

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
    <div className="flex items-center justify-between border-b border-foreground/5 bg-foreground/[0.01] px-5 py-4 flex-wrap gap-2">
      {STEPS.map((label, i) => {
        const step = (i + 1) as Step;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border transition-all duration-300 ${
              done ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-foreground" : active ? "border-[var(--accent-primary)] text-[var(--accent-primary)]" : "border-foreground/10 text-foreground/35"
            }`}>
              {step}
            </span>
            <span className={`text-[10px] font-display font-extrabold uppercase tracking-wider transition-colors duration-300 ${
              active ? "text-[var(--accent-primary)]" : "text-foreground/35"
            }`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-foreground/10 text-xs font-mono ml-1 hidden sm:inline">/</span>
            )}
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
      className="p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 transition-colors cursor-pointer"
    >
      {copied ? <Check className="w-4 h-4 text-[var(--accent-primary)]" /> : <Copy className="w-4 h-4 text-foreground/55" />}
    </button>
  );
}

/* ───── main component ───── */

export default function CreateEventModal({ isOpen, onClose, onEventCreated }: Props) {
  const [step, setStep] = useState<Step>(1);
  const { role, addSponsorEventId } = useRole();

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

      const newEventId = await createEventFull({
        lumaUrl: lumaUrl.trim(),
        about: about.trim(),
        location: location.trim() || undefined,
        coords: { lat, lng },
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        mediaFile: fileToUpload,
        onStep: (s) => setSubmitPhase(s),
      });

      if (role === "sponsor" && newEventId) {
        addSponsorEventId(newEventId);
      }

      setTimeout(() => { resetAll(); onClose(); onEventCreated?.(); }, 1500);
    } catch (e) {
      setError(extractBackendError(e));
      setSubmitPhase(null); setStep(3);
    }
  };

  /* ── render helpers ── */

  const code = previewData?.code || "";
  const ev = previewData?.event;

  const inputCls = "w-full px-4 py-3 rounded-xl bg-foreground/[0.02] border border-foreground/10 text-foreground placeholder-white/20 text-sm focus:outline-none focus:border-[var(--accent-primary)]/50 focus:bg-[var(--accent-primary)]/[0.01] transition-all";

  /* ──────────────────── JSX ──────────────────── */

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" onClick={handleClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c0c0f] border border-foreground/10 rounded-xl shadow-2xl max-w-lg w-[95%] md:w-full max-h-[90vh] flex flex-col overflow-hidden text-foreground">

            {/* Header */}
            <div className="p-4 md:p-5 border-b border-foreground/5 flex items-center justify-between bg-foreground/[0.02]">
              <h3 className="text-sm md:text-base font-display font-extrabold uppercase tracking-tight text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
                Create New Event
              </h3>
              <button onClick={handleClose} disabled={submitPhase !== null && submitPhase !== "done"}
                className="p-1.5 rounded-full hover:bg-foreground/10 text-foreground/50 transition-colors disabled:opacity-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <StepIndicator current={step} />

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 custom-scrollbar bg-black/20">
              <AnimatePresence mode="wait">

                {/* ═══ STEP 1: Paste Luma URL ═══ */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-foreground/55">
                      <Link2 className="w-4 h-4 text-[var(--accent-primary)]" />
                      Paste your <span className="font-semibold text-[var(--accent-primary)]">luma.com</span> event URL
                    </div>
                    <input type="url" value={lumaUrl} onChange={(e) => setLumaUrl(e.target.value)}
                      placeholder="https://luma.com/your-event" className={inputCls}
                      onKeyDown={(e) => { if (e.key === "Enter" && lumaUrl.trim()) handlePreview(); }} />

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ═══ STEP 2: Verify Code ═══ */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    {/* Event preview card */}
                    {ev && (
                      <div className="rounded-xl border border-foreground/10 bg-foreground/[0.01] overflow-hidden">
                        {ev.cover_image && (
                          <div className="relative h-32 w-full border-b border-foreground/5">
                            <img src={ev.cover_image} alt={ev.title || "Event"} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-3.5 space-y-1.5">
                          <p className="font-display font-extrabold uppercase text-sm tracking-tight text-foreground">{ev.title}</p>
                          {ev.location?.name && (
                            <p className="text-xs text-foreground/45 flex items-center gap-1.5 font-mono">
                              <MapPin className="w-3.5 h-3.5" />{ev.location.name}{ev.location.address ? ` — ${ev.location.address}` : ""}
                            </p>
                          )}
                          {ev.start_time && (
                            <p className="text-xs text-foreground/45 flex items-center gap-1.5 font-mono">
                              <Clock className="w-3.5 h-3.5" />{new Date(ev.start_time).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Code display */}
                    <div className="rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20 p-5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-[var(--accent-primary)]">
                        <Shield className="w-4 h-4" />
                        Verification Code
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-mono font-black tracking-widest text-[var(--accent-primary)]">
                          {code}
                        </span>
                        <CopyButton text={code} />
                      </div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40 leading-relaxed">
                        Add this code to your Luma event description, save it, then click <strong>Verify</strong>.
                        Expires in 15 mins.
                      </p>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ═══ STEP 3: Customize ═══ */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    {/* About */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-foreground/55">
                        <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea value={about} onChange={(e) => setAbout(e.target.value.slice(0, 255))}
                        placeholder="Describe your event…" rows={3} className={`${inputCls} resize-none`} />
                      <p className="text-[10px] text-right font-mono text-foreground/30">{about.length}/255</p>
                    </div>
                    {/* Location */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-foreground/55">
                        <MapPin className="w-4 h-4 text-[var(--accent-primary)]" /> Location
                      </label>
                      <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                        placeholder="Event location" className={inputCls} />
                    </div>
                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-foreground/55">
                          <Clock className="w-4 h-4 text-[var(--accent-primary)]" /> Start <span className="text-red-500">*</span>
                        </label>
                        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                          className={`${inputCls} [color-scheme:dark]`} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-foreground/55">
                          <Clock className="w-4 h-4 text-[var(--accent-primary)]" /> End <span className="text-red-500">*</span>
                        </label>
                        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                          min={startTime} className={`${inputCls} [color-scheme:dark]`} />
                      </div>
                    </div>
                    {/* Media */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-foreground/55">
                        <ImageIcon className="w-4 h-4 text-[var(--accent-primary)]" /> Cover Banner
                        <span className="text-red-500">*</span>
                      </label>
                      {mediaPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-foreground/10 group aspect-video">
                          <img src={mediaPreview} alt="Cover" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                            <button onClick={removeMedia}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 rounded-full text-foreground shadow-lg cursor-pointer">
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
                            isDragging ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : "border-foreground/15 hover:border-[var(--accent-primary)]/50 hover:bg-foreground/5"
                          }`}>
                          <Upload className={`w-5 h-5 ${isDragging ? "text-[var(--accent-primary)]" : "text-foreground/30"}`} />
                          <span className="text-xs text-foreground/40 font-mono uppercase tracking-wider font-bold">
                            {isDragging ? "Drop cover image" : "Drag cover image or click"}
                          </span>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ═══ STEP 4: Submitting ═══ */}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-3 py-6">
                    {(["creating", "uploading", "finalizing", "minting", "done"] as const).map((phase) => {
                      const labels = {
                        creating: "Creating event post…",
                        uploading: "Uploading media…",
                        finalizing: "Submitting for moderation…",
                        minting: "Minting event POAP…",
                        done: "Event created & POAP minted."
                      };
                      const order = ["creating", "uploading", "finalizing", "minting", "done"];
                      const ci = order.indexOf(submitPhase || "creating");
                      const pi = order.indexOf(phase);
                      const isDone = pi < ci || submitPhase === "done";
                      const isActive = pi === ci && submitPhase !== "done";
                      return (
                        <div key={phase} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                          isDone ? "bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/20" : isActive ? "bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/40" : "bg-foreground/[0.01] border-transparent opacity-30"
                        }`}>
                          {isDone ? <CheckCircle className="w-5 h-5 text-[var(--accent-primary)]" />
                            : isActive ? <Loader2 className="w-5 h-5 text-[var(--accent-primary)] animate-spin" />
                            : <div className="w-5 h-5 rounded-full border border-white/25" />}
                          <span className={`text-xs font-mono uppercase tracking-wider font-bold ${isDone ? "text-[var(--accent-primary)]" : isActive ? "text-foreground" : "text-foreground/30"}`}>
                            {labels[phase]}
                          </span>
                        </div>
                      );
                    })}
                    {submitPhase === "done" && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center gap-2 pt-4 text-[var(--accent-primary)] font-semibold text-sm font-display uppercase tracking-wider">
                        <Sparkles className="w-5 h-5" /> Live POAP Event registered.
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {step !== 4 && (
              <div className="p-4 md:p-5 border-t border-foreground/5 flex items-center justify-between gap-3 bg-foreground/[0.02]">
                <div>
                  {step > 1 && (
                    <button onClick={() => { setError(""); setStep((s) => (s - 1) as Step); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-display font-extrabold uppercase tracking-wider text-foreground/70 hover:bg-foreground/5 transition-all cursor-pointer">
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleClose}
                    className="px-4 py-2.5 rounded-xl font-display font-extrabold uppercase tracking-wider text-xs text-foreground/50 hover:bg-foreground/5 transition-all cursor-pointer">
                    Cancel
                  </button>

                  {step === 1 && (
                    <button
                      onClick={handlePreview} disabled={!lumaUrl.trim() || isPreviewing}
                      className={`px-5 py-2.5 rounded-xl font-display font-extrabold uppercase tracking-wider text-xs flex items-center gap-2 transition-all border border-foreground/10 ${
                        lumaUrl.trim() && !isPreviewing ? "hover:border-[var(--accent-primary)] hover:bg-foreground/5 text-foreground cursor-pointer" : "text-foreground/30 cursor-not-allowed opacity-50"
                      }`}>
                      {isPreviewing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</> : <><ArrowRight className="w-3.5 h-3.5" /> Preview</>}
                    </button>
                  )}

                  {step === 2 && (
                    <button
                      onClick={handleVerify} disabled={isVerifying}
                      className={`px-5 py-2.5 rounded-xl font-display font-extrabold uppercase tracking-wider text-xs flex items-center gap-2 transition-all border border-foreground/10 ${
                        !isVerifying ? "hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 text-[var(--accent-primary)] cursor-pointer" : "text-foreground/35 cursor-not-allowed opacity-50"
                      }`}>
                      {isVerifying ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</> : <><Shield className="w-3.5 h-3.5" /> Verify</>}
                    </button>
                  )}

                  {step === 3 && (
                    <button
                      onClick={handleSubmit} disabled={!isStep3Valid}
                      className={`px-5 py-2.5 rounded-xl font-display font-extrabold uppercase tracking-wider text-xs flex items-center gap-2 transition-all border border-foreground/10 ${
                        isStep3Valid ? "hover:border-[var(--accent-primary)] hover:bg-foreground/5 text-[var(--accent-primary)] cursor-pointer" : "text-foreground/30 cursor-not-allowed opacity-50"
                      }`}>
                      <Calendar className="w-3.5 h-3.5" /> Create Event
                    </button>
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
