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

const DEMO_USER_ID = "39";
const DEMO_STORAGE_KEY = "demo_mode";

interface DemoModeState {
  isDemoMode: boolean;
  canAccessDemo: boolean;
  toggleDemoMode: () => void;
}

const DemoModeContext = createContext<DemoModeState>({
  isDemoMode: false,
  canAccessDemo: false,
  toggleDemoMode: () => {},
});

export const useDemoMode = () => useContext(DemoModeContext);

export default function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [canAccessDemo, setCanAccessDemo] = useState(false);

  useEffect(() => {
    const userId = storage.getItem("id");
    const allowed = userId === DEMO_USER_ID;
    setCanAccessDemo(allowed);

    if (allowed) {
      const stored = storage.getItem(DEMO_STORAGE_KEY);
      setIsDemoMode(stored === "true");
    } else {
      // Non-authorized user — force demo off
      setIsDemoMode(false);
      storage.removeItem(DEMO_STORAGE_KEY);
    }
  }, []);

  const toggleDemoMode = useCallback(() => {
    const userId = storage.getItem("id");
    if (userId !== DEMO_USER_ID) return; // Extra safety check

    setIsDemoMode((prev) => {
      const next = !prev;
      storage.setItem(DEMO_STORAGE_KEY, String(next));
      // Emit a custom event so non-React code (api layer) can react
      window.dispatchEvent(new CustomEvent("demo-mode-changed", { detail: next }));
      return next;
    });
  }, []);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, canAccessDemo, toggleDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}
