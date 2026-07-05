"use client";

import { useState } from "react";
import { Send, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { sendEventBroadcast } from "@/src/api/events";

interface Props {
  eventId: number | null;
  recipientCount?: number;
}

export default function BroadcastPanel({ eventId, recipientCount }: Props) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  const maxChars = 255;
  const charsRemaining = maxChars - message.length;
  const totalRecipients = recipientCount || 942;

  const handleSendClick = (e: React.FormEvent) => {
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
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    setStatus({ type: null, text: "" });

    try {
      const res = await sendEventBroadcast(eventId!, message.trim());
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-white dark:bg-[#0c0d12] border border-black/10 dark:border-white/10 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-display font-extrabold uppercase text-black dark:text-white tracking-tight">Confirm Broadcast</h3>
              <p className="text-xs text-black/60 dark:text-white/40 leading-relaxed font-mono">
                Send to {totalRecipients} attendees?
              </p>
            </div>

            <div className="bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl p-3 text-xs text-black/70 dark:text-white/60 font-mono italic max-h-32 overflow-y-auto custom-scrollbar">
              "{message}"
            </div>

            <div className="flex gap-3 font-mono text-[10px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="flex-1 py-3 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-lg transition-all cursor-pointer shadow-md hover:shadow-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">broadcast communications</h3>
        <h4 className="text-sm font-semibold text-black dark:text-white mt-1">Direct Push Notifications</h4>
      </div>

      {!eventId ? (
        <div className="flex-1 flex items-center justify-center text-xs text-black/30 dark:text-white/30 font-mono py-12">
          Select an event to enable broadcasting
        </div>
      ) : (
        <form onSubmit={handleSendClick} className="flex-1 flex flex-col gap-4 mt-4 justify-between">

          {/* Text Area */}
          <div className="flex-1 flex flex-col gap-2 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Speaker on the Main Stage is starting in 5 minutes! Don't miss it!"
              disabled={isSending}
              className="flex-1 min-h-[90px] w-full bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5 focus:border-[var(--accent-primary,#8b5cf6)] focus:outline-none rounded-xl p-3 text-xs text-black dark:text-white placeholder-black/30 dark:placeholder-white/25 resize-none transition-colors"
            />
            <p className="text-[10px] text-black/40 dark:text-white/45 font-mono px-1">
              This will be sent to all approved attendees of this event.
            </p>
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
              className={`rounded-xl p-2.5 flex items-center gap-2 text-[10px] font-mono font-bold uppercase ${status.type === "success"
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
            className={`w-full py-3 rounded-xl font-display text-xs uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${isSending
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
