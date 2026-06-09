"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import login from "@/src/api/login";
import googleLoginApi from "@/src/api/google.login";
import walletSignIn from "@/src/api/wallet.sign.in";
import { useAuth } from "@/src/components/providers/AuthProvider";
import styles from "./login.module.css";

/* ─── Inline SVG icons ─── */

function SolanaIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <path
        d="M2.93 10.44a.61.61 0 0 1 .43-.18h13.3c.27 0 .41.33.21.52l-2.8 2.8a.61.61 0 0 1-.44.18H.34a.3.3 0 0 1-.21-.52l2.8-2.8Z"
        fill="currentColor"
      />
      <path
        d="M2.93.42A.63.63 0 0 1 3.36.24h13.3c.27 0 .41.33.21.52l-2.8 2.8a.61.61 0 0 1-.44.18H.34a.3.3 0 0 1-.21-.52L2.93.42Z"
        fill="currentColor"
      />
      <path
        d="M14.07 5.4a.61.61 0 0 0-.44-.18H.34a.3.3 0 0 0-.21.52l2.8 2.8c.11.12.27.18.43.18h13.3a.3.3 0 0 0 .21-.52l-2.8-2.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.71-1.57 2.7-3.88 2.7-6.62Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.spinner}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/* ─── Component ─── */

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"solana" | "google" | "email" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  /* ── Solana Wallet ── */
  const { publicKey, connected, connecting, signMessage, disconnect } =
    useWallet();
  const { visible, setVisible } = useWalletModal();

  const solanaLoginIntent = useRef(false);

  const handleSolanaLogin = useCallback(() => {
    setError(null);
    solanaLoginIntent.current = true;
    setLoading("solana");
    setVisible(true);
  }, [setVisible]);

  /* React to wallet connection — sign a message then call backend */
  useEffect(() => {
    if (!connected || !publicKey || !solanaLoginIntent.current) return;

    const authenticate = async () => {
      try {
        setLoading("solana");

        const pubkeyString = publicKey.toBase58();
        const nonce = Date.now().toString();
        const messageToSign = `Sign in to NextVibe.\nNonce: ${nonce}`;
        const messageBytes = new TextEncoder().encode(messageToSign);

        let signatureArray: number[] = [];

        if (signMessage) {
          const signature = await signMessage(messageBytes);
          signatureArray = Array.from(signature);
        } else {
          throw new Error("Wallet does not support message signing.");
        }

        /* Call the same backend endpoint as the mobile app */
        const username = `vibe_${pubkeyString.slice(0, 6)}.skr`;

        const backendResponse = await walletSignIn({
          pubkey: pubkeyString,
          signature: signatureArray,
          message: messageToSign,
          username,
        });

        setAuth(`${backendResponse.user_id}`);
        router.push("/");
      } catch (err: any) {
        console.error("Solana auth error:", err);
        const serverError = err?.response?.data?.error;
        const detail = err?.response?.data?.detail;

        if (serverError === "invite_code_required") {
          setError("This service is only available for accounts registered in the NextVibe app.");
        } else if (serverError) {
          setError(detail || serverError);
        } else {
          setError(
            err.message || "Wallet signature was rejected or failed."
          );
        }
        disconnect();
      } finally {
        solanaLoginIntent.current = false;
        setLoading(null);
      }
    };

    authenticate();
  }, [connected, publicKey, signMessage, disconnect, setAuth, router]);

  /* Clear loading when the wallet modal closes without a connection */
  useEffect(() => {
    if (!visible && solanaLoginIntent.current && !connected && !connecting) {
      solanaLoginIntent.current = false;
      setLoading(null);
    }
  }, [visible, connected, connecting]);

  /* ── Google OAuth ── */
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading("google");
    setError(null);
    try {
      const idToken = credentialResponse.credential;
      const decoded: any = jwtDecode(idToken);

      const email = decoded.email;
      const photo = decoded.picture || "https://media.nextvibe.io/images/default.png";
      const name = decoded.name || "";

      const username = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[-+]/g, "_")
        .replace(/[^a-z0-9._]/g, "")
        .replace(/_{2,}/g, "_")
        .replace(/\.{2,}/g, ".")
        .replace(/^[_.]+|[_.]+$/g, "");

      try {
        const result = await googleLoginApi({
          username,
          email,
          avatar_url: photo,
          idToken,
        });

        setAuth(`${result.user_id}`);
        router.push("/");
      } catch (err: any) {
        if (err?.response?.data?.error === "invite_code_required") {
          throw new Error("This service is only available for accounts registered in the NextVibe app.");
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      const detail =
        err?.message === "This service is only available for accounts registered in the NextVibe app."
          ? err.message
          : err?.response?.data?.detail ?? "Google sign-in failed. Please try again.";
      setError(detail);
    } finally {
      setLoading(null);
    }
  };

  /* ── Email/Password ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);
    setLoading("email");

    try {
      const result = await login(email, password);
      setAuth(`${result.user_id}`);
      router.push("/");
    } catch (err: any) {
      console.error("Email login error:", err);
      const detail =
        err?.response?.data?.detail ?? "Login failed. Please check your credentials.";
      setError(detail);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoWrapper}>
          <Image
            className={styles.logo}
            src="/logo.png"
            alt="NextVibe logo"
            width={88}
            height={88}
            priority
          />
        </div>

        {/* Title */}
        <h1 className={styles.title}>Organizer Portal Login</h1>

        {/* Error message */}
        {error && <div className={styles.errorMsg}>{error}</div>}

        {/* Connected wallet indicator */}
        {publicKey && (
          <div className={styles.walletConnected}>
            <span className={styles.walletDot} />
            Connected: {publicKey.toBase58().slice(0, 4)}…
            {publicKey.toBase58().slice(-4)}
          </div>
        )}

        {/* Social buttons */}
        <div className={styles.socialButtons}>
          <button
            type="button"
            className={styles.btnSolana}
            id="btn-solana"
            onClick={handleSolanaLogin}
            disabled={loading !== null}
          >
            <span className={styles.btnIcon}>
              {loading === "solana" || connecting ? (
                <SpinnerIcon />
              ) : (
                <SolanaIcon />
              )}
            </span>
            {publicKey ? "Wallet Connected" : "Connect with Solana MWA"}
          </button>

          <div style={{ position: "relative", overflow: "hidden", borderRadius: "10px" }}>
            {/* Visually custom button */}
            <button
              type="button"
              className={styles.btnGoogle}
              id="btn-google"
              disabled={loading !== null}
            >
              <span className={styles.btnIcon}>
                {loading === "google" ? <SpinnerIcon /> : <GoogleIcon />}
              </span>
              Continue with Google
            </button>
            
            {/* Invisible official Google button overlay to capture clicks and get idToken */}
            <div style={{ position: "absolute", top: "-5px", left: "-5px", right: 0, bottom: 0, opacity: 0.001, zIndex: 10, transform: "scale(1.2)", transformOrigin: "center" }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in was cancelled or failed.")}
                useOneTap
                width="400"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or continue with email</span>
          <span className={styles.dividerLine} />
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Email */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="login-email">
              Email Address
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <MailIcon />
              </span>
              <input
                id="login-email"
                className={styles.input}
                type="email"
                placeholder="admin@nextvibe.io"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading !== null}
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="login-password">
              Password
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <LockIcon />
              </span>
              <input
                id="login-password"
                className={styles.input}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading !== null}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitBtn}
            id="btn-sign-in"
            disabled={loading !== null}
          >
            {loading === "email" ? <SpinnerIcon /> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
