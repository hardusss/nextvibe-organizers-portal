"use client";

import { useState } from "react";
import { Send, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { sendEventBroadcast } from "@/src/api/events";

interface Props {
  eventId: number | null;
}

export default function BroadcastPanel({ eventId }: Props) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  const maxChars = 255;
  const charsRemaining = maxChars - message.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    if (!message.trim()) {
      setStatus({ type: "error", text: "Please write a broadcast message." });
      return;
    }
    if (message.length > maxChars) {
      setStatus({ type: "error", text: `Message cannot exceed ${maxChars} characters.` });
      return;
    }

    setIsSending(true);
    setStatus({ type: null, text: "" });

    try {
      const res = await sendEventBroadcast(eventId, message.trim());
      if (res.success) {
        setStatus({
          type: "success",
          text: `Broadcast sent to ${res.recipients_count} approved attendees.`,
        });
        setMessage(""); // Reset textarea
      } else {
        setStatus({
          type: "error",
          text: res.message || "Failed to deliver broadcast notifications.",
        });
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        "An unexpected error occurred.";
      setStatus({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 md:p-6 flex flex-col justify-between shadow-sm backdrop-blur-md relative overflow-hidden transition-all min-h-[300px]">
      <div>
        <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">broadcast communications</h3>
        <h4 className="text-sm font-semibold text-black dark:text-white mt-1">Direct Push Notifications</h4>
      </div>

      {!eventId ? (
        <div className="flex-1 flex items-center justify-center text-xs text-black/30 dark:text-white/30 font-mono py-12">
          Select an event to enable broadcasting
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 mt-4 justify-between">
          
          {/* Warning Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-mono leading-relaxed text-amber-600 dark:text-amber-400 font-semibold uppercase">
              Warning: This will send a direct push notification to all approved attendees of this event.
            </p>
          </div>

          {/* Text Area */}
          <div className="flex-1 flex flex-col gap-1.5 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Speaker on the Main Stage is starting in 5 minutes! Don't miss it!"
              disabled={isSending}
              className="flex-1 min-h-[90px] w-full bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5 focus:border-[var(--accent-primary,#8b5cf6)] focus:outline-none rounded-xl p-3 text-xs text-black dark:text-white placeholder-black/30 dark:placeholder-white/25 resize-none transition-colors"
            />
            <div className="flex justify-between items-center text-[9px] font-mono text-black/40 dark:text-white/30 px-1 font-bold">
              <span>{message.length} / {maxChars} chars</span>
              <span className={charsRemaining < 0 ? "text-red-500" : ""}>
                {charsRemaining >= 0 ? `${charsRemaining} remaining` : `${Math.abs(charsRemaining)} over limit`}
              </span>
            </div>
          </div>

          {/* Status Messages */}
          {status.type && (
            <div
              className={`rounded-xl p-2.5 flex items-center gap-2 text-[10px] font-mono font-bold uppercase ${
                status.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border border-red-500/25 text-red-500"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" />
              )}
              <span className="leading-snug">{status.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSending || !message.trim() || message.length > maxChars}
            className={`w-full py-3 rounded-xl font-display text-xs uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isSending
                ? "bg-black/5 dark:bg-white/5 border border-black/15 dark:border-white/10 text-black/45 dark:text-white/40 cursor-not-allowed"
                : !message.trim() || message.length > maxChars
                ? "bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-black/25 dark:text-white/20 cursor-not-allowed"
                : "bg-black dark:bg-white hover:bg-black/80 dark:hover:bg-white/90 text-white dark:text-black shadow-md hover:shadow-lg active:scale-[0.99]"
            }`}
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending Broadcast...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Send Broadcast
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
