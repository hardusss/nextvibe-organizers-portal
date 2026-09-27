"use client";

import { useState, useRef } from "react";

interface HourlyActivityItem {
  hour: string;
  checkins: number;
  networking: number;
  total: number;
}

interface Props {
  hourlyActivity: HourlyActivityItem[];
}

export default function ActivityTimelineChart({ hourlyActivity = [] }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter out invalid items and sort chronologically
  const data = [...hourlyActivity].sort(
    (a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime()
  );

  const hasData = data.length > 0;

  // Formatter for ISO hours to friendly AM/PM format
  const formatHour = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    } catch (e) {
      return isoString;
    }
  };

  // Dimensions of SVG viewBox
  const viewBoxWidth = 600;
  const viewBoxHeight = 220;

  // Chart margins inside viewBox
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;

  // Find max value for Y scaling
  const maxVal = hasData
    ? Math.max(...data.map((d) => d.total), 5) // ensure at least 5 for division
    : 10;

  // Generate coordinates
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.total / maxVal) * chartHeight;
    return { x, y, data: d };
  });

  // SVG Area path generator
  const getAreaPath = () => {
    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${paddingTop + chartHeight}`;
    points.forEach((p) => {
      path += ` L ${p.x} ${p.y}`;
    });
    path += ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`;
    return path;
  };

  // SVG Line path generator
  const getLinePath = () => {
    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // Handle hover lookup
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || !hasData) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const svgX = relativeX * viewBoxWidth;

    // Find nearest data point index
    let nearestIdx = 0;
    let minDiff = Infinity;
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = idx;
      }
    });

    setHoveredIndex(nearestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Render ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    Math.round((maxVal / (yTicks - 1)) * i)
  );

  return (
    <div className="premium-card p-5 md:p-6 flex flex-col justify-between relative overflow-hidden min-h-[300px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-foreground/45 text-[10px] font-mono tracking-widest font-bold uppercase">peak activity timeline</h3>
          <h4 className="text-sm font-semibold text-foreground mt-1">Hourly connections feed</h4>
        </div>

        {/* Live Legend */}
        {hasData && (
          <div className="flex gap-4 text-[10px] font-mono font-bold uppercase">
            <span className="text-[var(--accent-primary,#a855f7)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-[var(--accent-primary,#a855f7)]" /> Check-ins
            </span>
            <span className="text-fuchsia-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-fuchsia-400" /> Networking
            </span>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-foreground/30 text-xs">
          <span className="font-mono">Waiting for session timelines…</span>
        </div>
      ) : (
        <div className="flex-1 relative flex flex-col justify-end">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            className="overflow-visible select-none cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Gradients */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y Axis Ticks */}
            {yTickValues.map((val, idx) => {
              const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
              return (
                <g key={idx} className="opacity-10">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={viewBoxWidth - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="font-mono font-bold text-[9px] fill-white opacity-70"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Area path */}
            <path d={getAreaPath()} fill="url(#areaGradient)" />

            {/* Neon line path */}
            <path
              d={getLinePath()}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              className="drop-shadow-[0_2px_4px_rgba(168,85,247,0.35)]"
            />

            {/* X-Axis labels (subsetted for readability) */}
            {points.map((p, idx) => {
              // Only render about 4-5 labels to prevent overlaps
              const interval = Math.max(1, Math.floor(points.length / 4));
              if (idx % interval !== 0 && idx !== points.length - 1) return null;

              return (
                <text
                  key={idx}
                  x={p.x}
                  y={viewBoxHeight - 12}
                  textAnchor="middle"
                  className="font-mono font-bold text-[9px] fill-white/30"
                >
                  {formatHour(p.data.hour)}
                </text>
              );
            })}

            {/* Hover Indicators */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <g>
                {/* Vertical Guideline */}
                <line
                  x1={points[hoveredIndex].x}
                  y1={paddingTop}
                  x2={points[hoveredIndex].x}
                  y2={paddingTop + chartHeight}
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  className="opacity-60"
                />

                {/* Glowing Node Circle */}
                <circle
                  cx={points[hoveredIndex].x}
                  cy={points[hoveredIndex].y}
                  r="6"
                  fill="#a855f7"
                  stroke="#000"
                  strokeWidth="1.5"
                  className="drop-shadow-[0_0_6px_#a855f7]"
                />
              </g>
            )}
          </svg>

          {/* Interactive Floating Tooltip Overlay */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div
              className="absolute pointer-events-none bg-[#0c0c0f]/95 border border-foreground/10 rounded-xl p-3 shadow-xl backdrop-blur-md transition-all duration-100 flex flex-col gap-1 w-[150px] z-10"
              style={{
                left: `${Math.min(
                  Math.max(
                    0,
                    (points[hoveredIndex].x / viewBoxWidth) * 100 - 12
                  ),
                  78
                )}%`,
                bottom: `${Math.min(
                  ((paddingTop + chartHeight - points[hoveredIndex].y) /
                    viewBoxHeight) *
                  100 +
                  12,
                  65
                )}%`,
              }}
            >
              <span className="text-[10px] text-foreground/40 font-mono font-semibold">
                {formatHour(points[hoveredIndex].data.hour)}
              </span>
              <div className="flex justify-between items-center text-xs font-mono font-bold mt-1 text-foreground">
                <span>Total:</span>
                <span>{points[hoveredIndex].data.total} taps</span>
              </div>
              <div className="h-[1px] bg-foreground/5 my-1" />
              <div className="flex justify-between items-center text-[10px] font-mono text-[var(--accent-primary,#a855f7)]">
                <span>Check-ins:</span>
                <span>{points[hoveredIndex].data.checkins}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-fuchsia-400">
                <span>Networking:</span>
                <span>{points[hoveredIndex].data.networking}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
