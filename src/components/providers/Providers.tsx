"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import GoogleProvider from "./GoogleProvider";
import AuthProvider from "./AuthProvider";
import AxiosInit from "./AxiosInit";
import DemoModeProvider from "@/src/contexts/DemoModeContext";
import RoleProvider from "@/src/contexts/RoleContext";

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
        purple: { primary: "#a855f7", hover: "#c084fc", glow: "rgba(168, 85, 247, 0.15)" },
        emerald: { primary: "#34d399", hover: "#6ee7b7", glow: "rgba(52, 211, 153, 0.15)" },
        cyan: { primary: "#22d3ee", hover: "#67e8f9", glow: "rgba(34, 211, 238, 0.15)" },
        orange: { primary: "#fb923c", hover: "#fdba74", glow: "rgba(251, 146, 60, 0.15)" },
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
          <RoleProvider>
            <SolanaProvider>
              <GoogleProvider>
                <AccentLoader />
                {children}
              </GoogleProvider>
            </SolanaProvider>
          </RoleProvider>
        </DemoModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}