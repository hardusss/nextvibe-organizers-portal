"use client";

import { createContext, useContext, type ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Lets children know whether Google OAuth is actually configured. */
const GoogleReadyCtx = createContext(false);
export const useGoogleReady = () => useContext(GoogleReadyCtx);

export default function GoogleProvider({ children }: { children: ReactNode }) {
  /*
   * Always render GoogleOAuthProvider so that useGoogleLogin() has
   * the required context.  When no client-ID is set the login call
   * will simply fail gracefully (button can be hidden/disabled via
   * useGoogleReady()).
   */
  return (
    <GoogleReadyCtx.Provider value={!!GOOGLE_CLIENT_ID}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {children}
      </GoogleOAuthProvider>
    </GoogleReadyCtx.Provider>
  );
}
