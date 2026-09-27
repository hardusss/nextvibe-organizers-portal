"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Clock, FileText,
  Loader2, CheckCircle, AlertCircle, Sparkles,
  Layers,
} from "lucide-react";
import { updateEventPost, extractBackendError } from "@/src/api/events";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  onEventUpdated?: () => void;
}

export default function EditEventModal({ isOpen, onClose, event, onEventUpdated }: Props) {
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalSupply, setTotalSupply] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill fields when event changes
  useEffect(() => {
    if (event) {
      setAbout(event.about || "");
      setLocation(event.location || "");
      
      const coords = event.coords || {};
      const latVal = coords.lat ?? event.lat ?? event.latitude ?? "";
      const lngVal = coords.lng ?? event.lng ?? event.longitude ?? "";
      setLat(String(latVal));
      setLng(String(lngVal));

      // Format ISO string to datetime-local expected format: YYYY-MM-DDThh:mm
      const formatForInput = (isoString?: string) => {
        if (!isoString) return "";
        try {
          const d = new Date(isoString);
          if (isNaN(d.getTime())) return "";
          // Return local time formatted as YYYY-MM-DDTHH:mm
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
          return "";
        }
      };

      setStartTime(formatForInput(event.luma_event_start_time || event.start_time));
      setEndTime(formatForInput(event.luma_event_end_time || event.end_time));
      setTotalSupply(event.total_supply ? String(event.total_supply) : "100");
      
      setError(null);
      setSuccess(false);
    }
  }, [event, isOpen]);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!about.trim()) {
      setError("Description is required.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Start and end times are required.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: any = {
        about,
        location,
        luma_event_start_time: new Date(startTime).toISOString(),
        luma_event_end_time: new Date(endTime).toISOString(),
        total_supply: totalSupply ? Number(totalSupply) : 100,
        resolution: 11,
      };

      if (lat && lng) {
        payload.coords = {
          lat: Number(lat),
          lng: Number(lng),
        };
      }

      await updateEventPost(event.post_id || event.id, payload);
      setSuccess(true);
      setTimeout(() => {
        onEventUpdated?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(extractBackendError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = `w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 text-sm focus:outline-none focus:border-purple-500 transition-colors`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-[#0d0d12] border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
            <div>
              <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Edit event
              </h3>
              <p className="text-xs text-black/50 dark:text-white/40 mt-0.5">Modify your event details and POAP supply</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-black/50 dark:text-white/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-[#00bda3] space-y-3"
              >
                <CheckCircle className="w-16 h-16 animate-bounce" />
                <span className="font-bold text-lg">Event updated successfully.</span>
              </motion.div>
            ) : (
              <>
                {/* Description */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value.slice(0, 255))}
                    placeholder="Describe your event…"
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                  <p className="text-xs text-right text-black/30 dark:text-white/30">{about.length}/255</p>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                    <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Event location"
                    className={inputCls}
                  />
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-black/50 dark:text-white/50">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="e.g. 50.45"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-black/50 dark:text-white/50">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="e.g. 30.52"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Start / End Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                      <Clock className="w-4 h-4 text-[#00bda3]" /> Start <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={`${inputCls} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                      <Clock className="w-4 h-4 text-[#e04545]" /> End <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      min={startTime}
                      className={`${inputCls} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                  </div>
                </div>

                {/* Total NFT Supply */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-black/70 dark:text-white/70">
                    <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Total POAP supply
                  </label>
                  <input
                    type="number"
                    value={totalSupply}
                    onChange={(e) => setTotalSupply(e.target.value)}
                    placeholder="e.g. 100"
                    className={inputCls}
                  />
                  <p className="text-[11px] text-black/40 dark:text-white/40">The total number of POAPs this event can give out.</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#e04545] dark:text-[#ff6b6b] text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-4 border-t border-black/5 dark:border-white/5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-black dark:text-white text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors min-w-[120px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
