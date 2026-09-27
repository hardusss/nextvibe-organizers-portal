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
    <div className="premium-card p-5 md:p-6 flex flex-col justify-between relative overflow-hidden min-h-[300px]">
      <div>
        <h3 className="text-foreground/45 text-[10px] font-mono tracking-widest font-bold uppercase">ecosystem split</h3>
        <h4 className="text-sm font-semibold text-foreground mt-1">Auth provider distribution</h4>
      </div>

      {!hasUsers ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-foreground/30 text-xs">
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
                  stroke="#a855f7" // Rich Purple
                  strokeWidth={hoveredSlice === "mwa" ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${mwaLength} ${circumference}`}
                  strokeDashoffset={mwaOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredSlice("mwa")}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: hoveredSlice === "mwa" ? "drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))" : "none",
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
                  stroke="#581c87" // Deep Purple
                  strokeWidth={hoveredSlice === "web2" ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${web2Length} ${circumference}`}
                  strokeDashoffset={web2Offset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredSlice("web2")}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: hoveredSlice === "web2" ? "drop-shadow(0 0 8px rgba(88, 28, 135, 0.6))" : "none",
                  }}
                />
              )}
            </svg>

            {/* Centered Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {hoveredSlice === "mwa" ? (
                <>
                  <span className="text-[10px] tracking-widest text-[#c084fc] font-mono font-bold uppercase">MWA WALLET</span>
                  <span className="text-2xl font-mono font-bold text-foreground">{cleanMwa}%</span>
                  <span className="text-[10px] text-foreground/40 font-mono">{mwaUsers} users</span>
                </>
              ) : hoveredSlice === "web2" ? (
                <>
                  <span className="text-[10px] tracking-widest text-fuchsia-400 font-mono font-bold uppercase">WEB2 SIGN-IN</span>
                  <span className="text-2xl font-mono font-bold text-foreground">{cleanWeb2}%</span>
                  <span className="text-[10px] text-foreground/40 font-mono">{web2Users} users</span>
                </>
              ) : (
                <>
                  <span className="text-[9px] tracking-widest text-foreground/45 font-mono font-bold uppercase">TOTAL USERS</span>
                  <span className="text-3xl font-mono font-bold text-foreground">{totalUsers}</span>
                  <span className="text-[9px] text-foreground/40 font-mono">registered</span>
                </>
              )}
            </div>
          </div>

          {/* Legend Details */}
          <div className="flex flex-col gap-3 shrink-0">
            {/* Solana MWA Legend */}
            <div
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent ${hoveredSlice === "mwa" ? "bg-foreground/[0.03] border-foreground/5" : ""
                }`}
              onMouseEnter={() => setHoveredSlice("mwa")}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="w-3 h-3 rounded bg-[#a855f7] shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Solana MWA</span>
                <span className="text-[10px] font-mono text-foreground/40">
                  {cleanMwa}% • {mwaUsers} users
                </span>
              </div>
            </div>

            {/* Web2 Legend */}
            <div
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent ${hoveredSlice === "web2" ? "bg-foreground/[0.03] border-foreground/5" : ""
                }`}
              onMouseEnter={() => setHoveredSlice("web2")}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="w-3 h-3 rounded bg-[#581c87] shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Web2 login</span>
                <span className="text-[10px] font-mono text-foreground/40">
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
