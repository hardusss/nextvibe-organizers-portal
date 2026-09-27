"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import login from "@/src/api/login";
import googleLoginApi from "@/src/api/google.login";
import walletSignIn from "@/src/api/wallet.sign.in";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

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

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"solana" | "google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Solana Wallet ── */
  const { publicKey, connected, connecting, signMessage, disconnect } = useWallet();
  const { visible, setVisible } = useWalletModal();

  const solanaLoginIntent = useRef(false);

  const handleSolanaLogin = useCallback(() => {
    setError(null);
    solanaLoginIntent.current = true;
    setLoading("solana");
    setVisible(true);
  }, [setVisible]);

  /* React to wallet connection */
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
          setError(err.message || "Wallet signature was rejected or failed.");
        }
        disconnect();
      } finally {
        solanaLoginIntent.current = false;
        setLoading(null);
      }
    };

    authenticate();
  }, [connected, publicKey, signMessage, disconnect, setAuth, router]);

  /* Clear loading when the wallet modal closes without connection */
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
      const detail = err?.response?.data?.detail ?? "Login failed. Please check your credentials.";
      setError(detail);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#080c10] text-[#ededed] font-sans antialiased overflow-hidden selection:bg-[#8b5cf6]/30 selection:text-white">
      
      {/* LEFT: Dynamic Branding Panel (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 relative bg-[#040608] border-r border-white/5 flex-col justify-between p-12 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px"
        }} />
        
        {/* Top left mini title */}
        <div className="z-10 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full overflow-hidden">
            <Image src="/logo.png" alt="NextVibe" width={24} height={24} className="object-cover" />
          </div>
          <span className="font-display font-extrabold text-xs uppercase tracking-widest text-[#8b5cf6]">NextVibe - IRL Networking Layer on Solana</span>
        </div>

        {/* Center: Hero Branding / Huge Mascot Image */}
        <div className="z-10 my-auto space-y-8 max-w-md">
          <div className="relative w-44 h-44 mx-auto md:mx-0">
            {/* Spinning/pulsing neon glow behind logo */}
            <div className="absolute inset-0 bg-[#8b5cf6]/20 rounded-full blur-[40px] animate-pulse" />
            <Image
              src="/logo.png"
              alt="NextVibe mascot logo"
              fill
              priority
              className="object-contain drop-shadow-[0_0_35px_rgba(139,92,246,0.4)] animate-[bounce_4s_infinite_ease-in-out]"
            />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight tracking-tight capitalize text-white">
              The Spatial Web3 <br />
              <span className="font-cursive text-[#c084fc] normal-case text-5xl md:text-6xl block mt-2">Organizer Hub.</span>
            </h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-sm">
              Verify real-life NFC check-ins, manage attendee connection heatmaps, and issue cryptographic certificates instantly.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="z-10 flex items-center justify-between text-[10px] text-white/30 tracking-wider font-mono uppercase">
          <span>Version 1.0.1</span>
          <span>© NextVibe 2026</span>
        </div>
      </div>

      {/* RIGHT: Edge-Anchored Sleek Sign In Panel */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 sm:p-16 md:p-24 relative overflow-y-auto custom-scrollbar">
        {/* Subtle background glow */}
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#8b5cf6]/5 blur-[120px] pointer-events-none" />
        
        <div className="max-w-md w-full mx-auto space-y-8 z-10">
          
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 md:hidden">
              <Image src="/logo.png" alt="NextVibe" width={32} height={32} className="object-contain" />
              <span className="font-cursive text-xl capitalize text-[#8b5cf6]">NextVibe</span>
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight capitalize text-white">
              Organizer Login
            </h1>
            <p className="text-sm text-white/50">
              Access your events database and real-time attendee logs
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-3 animate-[fadeIn_0.2s_ease]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              {error}
            </div>
          )}

          {/* Connected wallet info */}
          {publicKey && (
            <div className="p-4 rounded-xl bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 text-[#8b5cf6] text-xs font-mono flex items-center justify-between animate-[fadeIn_0.2s_ease]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse" />
                <span>Connected: {publicKey.toBase58().slice(0, 6)}…{publicKey.toBase58().slice(-6)}</span>
              </div>
              <button onClick={() => disconnect()} className="text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors">
                Disconnect
              </button>
            </div>
          )}

          {/* Social Sign In Buttons */}
          <div className="grid grid-cols-1 gap-3.5">
            {/* Solana button */}
            <button
              onClick={handleSolanaLogin}
              disabled={loading !== null}
              className="group flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-[#8b5cf6]/30 text-[#8b5cf6] bg-transparent hover:bg-[#8b5cf6]/5 hover:border-[#8b5cf6]/60 font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "solana" || connecting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#8b5cf6]" />
              ) : (
                <SolanaIcon />
              )}
              <span>{publicKey ? "Wallet signed in" : "Sign in with Solana"}</span>
            </button>

            {/* Google button wrapper */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
              <button
                disabled={loading !== null}
                className="flex items-center justify-center gap-3 w-full h-12 font-semibold text-sm text-white/80 cursor-pointer disabled:opacity-50"
              >
                {loading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                <span>Continue with Google</span>
              </button>
              
              {/* Invisible OAuth Overlay */}
              <div className="absolute inset-0 opacity-[0.001] z-10 scale-[1.3] origin-center cursor-pointer">
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
          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-white/5" />
            <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase">or use admin credentials</span>
            <div className="h-[1px] flex-1 bg-white/5" />
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/60 tracking-wide uppercase" htmlFor="login-email">
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-white/30 pointer-events-none group-focus-within:text-[#8b5cf6] transition-colors">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@nextvibe.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading !== null}
                  className="w-full h-12 pl-12 pr-4 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder-white/20 outline-none text-sm transition-all focus:border-[#8b5cf6]/50 focus:bg-[#8b5cf6]/[0.01]"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/60 tracking-wide uppercase" htmlFor="login-password">
                Password
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-white/30 pointer-events-none transition-colors">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading !== null}
                  className="w-full h-12 pl-12 pr-4 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder-white/20 outline-none text-sm transition-all focus:border-[#8b5cf6]/50 focus:bg-[#8b5cf6]/[0.01]"
                  required
                />
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading !== null}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#d946ef] text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#8b5cf6]/10 hover:shadow-[#8b5cf6]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "email" ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}
