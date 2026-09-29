"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractBackendError, getEventTaps, type EventTapsResult } from "../api/events";

const POLL_MS = 30_000;

/**
 * The event's taps (map + people-met leaderboard), refreshed in the background
 * every 30 s while the dashboard is open. Only the first load for an event
 * shows a loading state; background refreshes swap the data in quietly.
 */
export function useEventTaps(postId: number | null) {
  const [data, setData] = useState<EventTapsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentId = useRef(postId);

  const load = useCallback(async (id: number, initial: boolean) => {
    if (initial) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const res = await getEventTaps(id);
      if (currentId.current !== id) return;
      setData({
        ...res,
        taps: (res.taps || []).filter((t) => t.type === "checkin" || t.type === "networking"),
      });
      setError(null);
    } catch (err) {
      // A failed background refresh keeps the last good data on screen
      if (currentId.current === id && initial) {
        setError(extractBackendError(err) || "Failed to load tap data.");
      }
    } finally {
      if (currentId.current === id && initial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    currentId.current = postId;
    if (!postId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the event changes
    setData(null);
    load(postId, true);
    const timer = setInterval(() => load(postId, false), POLL_MS);
    return () => clearInterval(timer);
  }, [postId, load]);

  const refresh = useCallback(() => {
    if (postId) return load(postId, false);
  }, [postId, load]);

  return { data, isLoading, error, refresh };
}
