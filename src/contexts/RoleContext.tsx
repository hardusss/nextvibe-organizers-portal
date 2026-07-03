"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { storage } from "@/src/utils/storage";

export type UserRole = "organizer" | "sponsor";

const ROLE_STORAGE_KEY = "nextvibe_role";
const SPONSOR_EVENTS_KEY = "nextvibe_sponsor_events";

interface RoleContextState {
  role: UserRole;
  sponsorEventIds: number[];
  setRole: (role: UserRole) => void;
  addSponsorEventId: (eventId: number) => void;
  isSponsorEvent: (eventId: number) => boolean;
}

const RoleContext = createContext<RoleContextState>({
  role: "organizer",
  sponsorEventIds: [],
  setRole: () => {},
  addSponsorEventId: () => {},
  isSponsorEvent: () => false,
});

export const useRole = () => useContext(RoleContext);

export default function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("organizer");
  const [sponsorEventIds, setSponsorEventIds] = useState<number[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = storage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
      if (storedRole === "organizer" || storedRole === "sponsor") {
        setRoleState(storedRole);
      }

      const storedEvents = storage.getItem(SPONSOR_EVENTS_KEY);
      if (storedEvents) {
        try {
          const parsed = JSON.parse(storedEvents);
          if (Array.isArray(parsed)) {
            setSponsorEventIds(parsed.map(Number));
          }
        } catch (e) {
          console.error("Failed to parse sponsor events:", e);
        }
      }
      setIsHydrated(true);
    }
  }, []);

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    storage.setItem(ROLE_STORAGE_KEY, newRole);
    // Custom event to notify other components/API layer if needed
    window.dispatchEvent(new CustomEvent("nextvibe-role-changed", { detail: newRole }));
  }, []);

  const addSponsorEventId = useCallback((eventId: number) => {
    setSponsorEventIds((prev) => {
      if (prev.includes(eventId)) return prev;
      const next = [...prev, eventId];
      storage.setItem(SPONSOR_EVENTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isSponsorEvent = useCallback((eventId: number) => {
    // In demo mode, if the user hasn't added any sponsor events yet, designate 9993 as the default sponsor event.
    if (sponsorEventIds.length === 0 && storage.getItem("demo_mode") === "true") {
      return eventId === 9993;
    }
    return sponsorEventIds.includes(eventId);
  }, [sponsorEventIds]);

  // Expose the hydrated state safely
  return (
    <RoleContext.Provider
      value={{
        role: isHydrated ? role : "organizer",
        sponsorEventIds: isHydrated ? (sponsorEventIds.length === 0 && typeof window !== "undefined" && storage.getItem("demo_mode") === "true" ? [9993] : sponsorEventIds) : [],
        setRole,
        addSponsorEventId,
        isSponsorEvent,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}
