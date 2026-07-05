"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  mwaPercentage: number;
  web2Percentage: number;
  mwaUsers: number;
  web2Users: number;
}

export default function EcosystemDonutChart({
  mwaPercentage = 0,
  web2Percentage = 0,
  mwaUsers = 0,
  web2Users = 0,
}: Props) {
  const [hoveredSlice, setHoveredSlice] = useState<"mwa" | "web2" | null>(null);

  const totalUsers = mwaUsers + web2Users;

  // Handle empty state
  const hasUsers = totalUsers > 0;

  // Clean percentages to handle NaN or 0 total cases
  const cleanMwa = hasUsers ? Math.round(mwaPercentage) : 0;
  const cleanWeb2 = hasUsers ? Math.round(web2Percentage) : 0;

  // Donut geometry details
  const size = 200;
  const radius = 70;
  const strokeWidth = 18;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment lengths
  const mwaLength = (cleanMwa / 100) * circumference;
  const web2Length = (cleanWeb2 / 100) * circumference;

  // Offsets (starting from top, i.e., -90 degrees)
  const mwaOffset = 0;
  // Web2 starts after MWA ends
  const web2Offset = -mwaLength;

  return (
    <div className="bg-white/70 dark:bg-[#05070a]/90 border border-black/5 dark:border-white/5 rounded-xl p-5 md:p-6 flex flex-col justify-between shadow-sm backdrop-blur-md relative overflow-hidden transition-all min-h-[300px]">
      <div>
        <h3 className="text-black/40 dark:text-white/40 text-[10px] font-mono tracking-widest font-bold uppercase">ecosystem split</h3>
        <h4 className="text-sm font-semibold text-black dark:text-white mt-1">Auth Provider Distribution</h4>
      </div>

      {!hasUsers ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-black/30 dark:text-white/30 text-xs">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="opacity-10"
            />
          </svg>
          <span className="mt-2 font-mono">Telemetry awaiting attendee registrations</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 mt-4">
          {/* SVG Donut */}
          <div className="relative" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="-rotate-90 transform"
            >
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth={strokeWidth}
              />

              {/* Solana MWA Slice */}
              {cleanMwa > 0 && (
                <motion.circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke="#9945FF" // Solana Purple
                  strokeWidth={hoveredSlice === "mwa" ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${mwaLength} ${circumference}`}
                  strokeDashoffset={mwaOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredSlice("mwa")}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: hoveredSlice === "mwa" ? "drop-shadow(0 0 8px rgba(153, 69, 255, 0.6))" : "none",
                  }}
                />
              )}

              {/* Web2 Slice */}
              {cleanWeb2 > 0 && (
                <motion.circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke="#4B5563" // Dark Slate Gray
                  strokeWidth={hoveredSlice === "web2" ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${web2Length} ${circumference}`}
                  strokeDashoffset={web2Offset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredSlice("web2")}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: hoveredSlice === "web2" ? "drop-shadow(0 0 8px rgba(75, 85, 99, 0.6))" : "none",
                  }}
                />
              )}
            </svg>

            {/* Centered Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {hoveredSlice === "mwa" ? (
                <>
                  <span className="text-[10px] tracking-widest text-[#14F195] font-mono font-bold uppercase">MWA WALLET</span>
                  <span className="text-2xl font-mono font-bold text-black dark:text-white">{cleanMwa}%</span>
                  <span className="text-[10px] text-black/40 dark:text-white/40 font-mono">{mwaUsers} Users</span>
                </>
              ) : hoveredSlice === "web2" ? (
                <>
                  <span className="text-[10px] tracking-widest text-gray-400 font-mono font-bold uppercase">WEB2 SIGN-IN</span>
                  <span className="text-2xl font-mono font-bold text-black dark:text-white">{cleanWeb2}%</span>
                  <span className="text-[10px] text-black/40 dark:text-white/40 font-mono">{web2Users} Users</span>
                </>
              ) : (
                <>
                  <span className="text-[9px] tracking-widest text-black/45 dark:text-white/45 font-mono font-bold uppercase">TOTAL USERS</span>
                  <span className="text-3xl font-mono font-bold text-black dark:text-white">{totalUsers}</span>
                  <span className="text-[9px] text-black/40 dark:text-white/40 font-mono">registered</span>
                </>
              )}
            </div>
          </div>

          {/* Legend Details */}
          <div className="flex flex-col gap-3 shrink-0">
            {/* Solana MWA Legend */}
            <div
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent ${hoveredSlice === "mwa" ? "bg-white/10 dark:bg-white/[0.03] border-white/5" : ""
                }`}
              onMouseEnter={() => setHoveredSlice("mwa")}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="w-3 h-3 rounded bg-[#9945FF] shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-black dark:text-white">Solana MWA</span>
                <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                  {cleanMwa}% • {mwaUsers} users
                </span>
              </div>
            </div>

            {/* Web2 Legend */}
            <div
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent ${hoveredSlice === "web2" ? "bg-white/10 dark:bg-white/[0.03] border-white/5" : ""
                }`}
              onMouseEnter={() => setHoveredSlice("web2")}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="w-3 h-3 rounded bg-[#4B5563] shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-black dark:text-white">Web2 Login</span>
                <span className="text-[10px] font-mono text-black/40 dark:text-white/40">
                  {cleanWeb2}% • {web2Users} users
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
