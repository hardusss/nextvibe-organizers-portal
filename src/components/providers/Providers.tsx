"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import GoogleProvider from "./GoogleProvider";
import AuthProvider from "./AuthProvider";
import AxiosInit from "./AxiosInit";
import DemoModeProvider from "@/src/contexts/DemoModeContext";

// Динамічно імпортуємо SolanaProvider, жорстко вимикаючи серверний рендеринг
const SolanaProvider = dynamic(() => import("./SolanaProvider"), {
  ssr: false,
});

import { ThemeProvider } from "next-themes";

import { useEffect } from "react";

function AccentLoader() {
  useEffect(() => {
    const applyAccent = () => {
      const accent = localStorage.getItem("nextvibe_accent") || "purple";
      const accents: Record<string, { primary: string; hover: string; glow: string }> = {
        purple: { primary: "#8b5cf6", hover: "#7c3aed", glow: "rgba(139,92,246,0.2)" },
        emerald: { primary: "#10b981", hover: "#059669", glow: "rgba(16,185,129,0.2)" },
        cyan: { primary: "#06b6d4", hover: "#0891b2", glow: "rgba(6,182,212,0.2)" },
        orange: { primary: "#f97316", hover: "#ea580c", glow: "rgba(249,115,22,0.2)" },
      };

      const currentConfig = accents[accent] || accents.purple;
      document.documentElement.style.setProperty("--accent-primary", currentConfig.primary);
      document.documentElement.style.setProperty("--accent-hover", currentConfig.hover);
      document.documentElement.style.setProperty("--accent-glow", currentConfig.glow);
    };

    applyAccent();
    window.addEventListener("storage", applyAccent);
    window.addEventListener("nextvibe_accent_changed", applyAccent);

    return () => {
      window.removeEventListener("storage", applyAccent);
      window.removeEventListener("nextvibe_accent_changed", applyAccent);
    };
  }, []);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        <AxiosInit />
        <DemoModeProvider>
          <SolanaProvider>
            <GoogleProvider>
              <AccentLoader />
              {children}
            </GoogleProvider>
          </SolanaProvider>
        </DemoModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}