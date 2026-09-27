"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#050505] p-6 relative overflow-hidden transition-colors duration-200">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 dark:bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent-primary)]/10 dark:bg-[var(--accent-primary)]/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative z-10 max-w-lg w-full premium-card p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-center"
      >
        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0.5, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="inline-flex p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl text-purple-600 dark:text-purple-400 mb-6 border border-purple-100 dark:border-purple-900/30"
        >
          <Compass className="w-12 h-12 animate-pulse" />
        </motion.div>

        {/* 404 Text */}
        <h1 className="text-8xl font-black bg-gradient-to-r from-purple-600 to-[var(--accent-primary)] bg-clip-text text-transparent select-none tracking-tight mb-2">
          404
        </h1>

        <h2 className="text-2xl font-bold text-foreground mb-4">
          Page not found
        </h2>

        <p className="text-foreground/60 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          It looks like you've wandered into deep space. The page you are looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:bg-black/90 dark:hover:bg-white/90 transition-colors shadow-lg shadow-black/10 dark:shadow-white/5 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Back to dashboard
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black/5 dark:bg-white/5 text-foreground/80 border border-black/10 dark:border-white/10 font-semibold rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
