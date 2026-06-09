"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import GoogleProvider from "./GoogleProvider";
import AuthProvider from "./AuthProvider";
import AxiosInit from "./AxiosInit";

// Динамічно імпортуємо SolanaProvider, жорстко вимикаючи серверний рендеринг
const SolanaProvider = dynamic(() => import("./SolanaProvider"), {
  ssr: false,
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AxiosInit />
      <SolanaProvider>
        <GoogleProvider>{children}</GoogleProvider>
      </SolanaProvider>
    </AuthProvider>
  );
}