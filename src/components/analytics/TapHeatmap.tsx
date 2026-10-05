"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, AlertCircle, RefreshCw, X, Users, CheckCircle2, Fingerprint, MapPin, Award, Layers } from "lucide-react";
import { cellsToMultiPolygon, gridDisk, isValidCell } from "h3-js";
import type { EventTap, EventTapsResult } from "@/src/api/events";
import { boundsOf, tapFocusBounds, type Bounds } from "@/src/utils/eventTaps";
import { baseTiles, loadLeaflet, type BaseTiles } from "@/src/utils/leaflet";

const ZONE_COLOR = "#8B5CF6";

type Focus = "taps" | "zone" | "venue";

interface Props {
  postId: number;
  data: EventTapsResult | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * The check-in zone as the backend geofence sees it: gridDisk(h3_geo, rings)
 * merged into one outline. [lat, lng] loops per polygon; null for events
 * without a cell (older events) or a malformed one.
 */
function zoneOutline(h3Geo?: string | null, rings?: number | null): number[][][][] | null {
  if (!h3Geo || !isValidCell(h3Geo)) return null;
  try {
    return cellsToMultiPolygon(gridDisk(h3Geo, rings ?? 2), false);
  } catch {
    return null;
  }
}

export default function TapHeatmap({ postId, data: tapsData, isLoading, error }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const zoneGroupRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const heatZoomHandlerRef = useRef<(() => void) | undefined>(undefined);
  // Event the map was last auto-fitted for: refreshes must not move the view
  const fittedForRef = useRef<number | null>(null);

  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<EventTap[] | null>(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [focus, setFocus] = useState<Focus>("taps");

  // Layer visibility toggles
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  const taps = useMemo(() => tapsData?.taps ?? [], [tapsData]);
  const venue = tapsData?.center ?? null;
  const zone = useMemo(() => zoneOutline(tapsData?.h3_geo, tapsData?.zone_rings), [tapsData?.h3_geo, tapsData?.zone_rings]);

  // 1. Load Leaflet and Leaflet.heat dynamically on client side
  useEffect(() => {
    let alive = true;
    loadLeaflet().then(() => alive && setScriptsLoaded(true)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 2. Create the map and its base tiles once the scripts are in
  useEffect(() => {
    if (!scriptsLoaded || !containerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Detect if portal is in dark mode
    const isDark = document.documentElement.classList.contains("dark");

    const { carto: cartoTiles, esri: esriTiles } = baseTiles(isDark);

    // A. Create the map once; where it looks is decided by fitTo() below
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
      }).setView([50.4501, 30.5234], 16); // Kyiv until the event loads
      // Bottom-right keeps the top edge free for the overlay controls
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
    }

    // Recreate the tile layer so url and native zoom match the dark/light theme
    const map = mapRef.current;
    const addTiles = (tiles: BaseTiles) => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
      tileLayerRef.current = L.tileLayer(tiles.url, {
        maxZoom: 20,
        maxNativeZoom: tiles.maxNativeZoom,
        attribution: tiles.attribution,
      }).addTo(map);
    };
    addTiles(cartoTiles ?? esriTiles);
    if (cartoTiles) {
      // A rejected/over-quota key makes CARTO answer 403 — fall back to Esri
      tileLayerRef.current.once("tileerror", () => {
        if (mapRef.current === map) addTiles(esriTiles);
      });
    }

    // Keep Leaflet's size in sync when the card resizes (sidebar, rotation)
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [scriptsLoaded]);

  // 3. Draw zone, venue, taps and heat whenever the data or toggles change
  useEffect(() => {
    if (!scriptsLoaded || !mapRef.current || !tapsData) return;

    const L = (window as any).L;
    if (!L) return;
    const isDark = document.documentElement.classList.contains("dark");

    // B. Check-in zone: one merged dashed outline, very light fill
    if (zoneGroupRef.current) {
      zoneGroupRef.current.clearLayers();
    } else {
      zoneGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }
    if (zone) {
      L.polygon(zone, {
        color: ZONE_COLOR,
        weight: 2,
        dashArray: "6 6",
        fillColor: ZONE_COLOR,
        fillOpacity: 0.06,
        interactive: false,
      }).addTo(zoneGroupRef.current);
      // Label on the zone's north edge so it doesn't sit on top of the taps
      const b = boundsOf(zone.flat(2).map(([lat, lng]) => ({ lat, lng })));
      if (b) {
        L.tooltip({ permanent: true, direction: "top", className: "zone-label", offset: [0, -2] })
          .setLatLng([b[1][0], (b[0][1] + b[1][1]) / 2])
          .setContent("Check-in zone")
          .addTo(zoneGroupRef.current);
      }
    }

    // C. Venue pin from the Luma address: small and secondary to the taps
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (venue) {
      markerRef.current = L.circleMarker([venue.lat, venue.lng], {
        radius: 5,
        color: isDark ? "#f1edf7" : "#1f1f24",
        weight: 2,
        fillColor: isDark ? "#1f1f24" : "#ffffff",
        fillOpacity: 1,
      })
        .bindTooltip("Venue (Luma address)", { direction: "right", offset: [6, 0] })
        .addTo(mapRef.current);
    }

    // D. Add/Update Clustered Tap Markers
    if (!markersGroupRef.current) {
      markersGroupRef.current = L.layerGroup();
    } else {
      markersGroupRef.current.clearLayers();
    }

    // Add or remove markers group based on checkbox state
    if (showMarkers) {
      markersGroupRef.current.addTo(mapRef.current);

      // Custom clustering algorithm (groups items within ~2 meters)
      const groups: { center: { lat: number; lng: number }; taps: EventTap[] }[] = [];
      taps.forEach((tap) => {
        const group = groups.find((g) => {
          const dLat = Math.abs(g.center.lat - tap.lat);
          const dLng = Math.abs(g.center.lng - tap.lng);
          return dLat < 0.000018 && dLng < 0.000018;
        });

        if (group) {
          group.taps.push(tap);
        } else {
          groups.push({
            center: { lat: tap.lat, lng: tap.lng },
            taps: [tap],
          });
        }
      });

      groups.forEach((group) => {
        if (group.taps.length === 1) {
          // Single tap marker
          const tap = group.taps[0];
          const isCheckin = tap.type === "checkin";
          const color = isCheckin
            ? (isDark ? "#a855f7" : "#3b82f6") // Purple or Blue
            : (isDark ? "#c084fc" : "#ef4444"); // Lavender or Red

          const pointsText = tap.points ? `+${tap.points} REP` : "";

          // Clear and clean inline-styled HTML structure with absolute fallback colors
          const popupContent = `
            <div style="font-family: sans-serif; font-size: 11px; min-width: 155px; color: ${isDark ? '#ffffff' : '#0e0e11'}; padding: 4px 2px;">
              <div style="font-weight: 700; border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}; padding-bottom: 5px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <span style="font-size: 11px;">${isCheckin ? "📍 Check-in" : "🤝 Networking"}</span>
                <span style="color: #10b981; font-weight: 800; font-size: 11px;">${pointsText}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
                <div><span style="opacity: 0.6;">User:</span> <b style="font-weight: 600;">@${tap.user?.username || "anonymous"}</b></div>
                <div><span style="opacity: 0.6;">${isCheckin ? "Host:" : "Met:"}</span> <b style="font-weight: 600;">@${tap.given_by?.username || "host"}</b></div>
                <div style="font-size: 9px; opacity: 0.5; margin-top: 5px; border-top: 1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}; padding-top: 5px; font-family: monospace;">
                  Lat: ${tap.lat.toFixed(6)}<br/>Lng: ${tap.lng.toFixed(6)}
                </div>
              </div>
            </div>
          `;

          const popupOptions = {
            className: isDark ? 'dark-leaflet-popup' : 'light-leaflet-popup'
          };

          L.circleMarker([tap.lat, tap.lng], {
            radius: 7,
            fillColor: color,
            color: isDark ? "#ffffff" : "#000000",
            weight: 1.5,
            opacity: 0.9,
            fillOpacity: 0.9,
          })
            .bindPopup(popupContent, popupOptions)
            .addTo(markersGroupRef.current);

        } else {
          // Clustered marker showing counts
          const count = group.taps.length;
          const checkinsCount = group.taps.filter(t => t.type === "checkin").length;
          const isCheckinDominant = checkinsCount > count / 2;

          const badgeBg = isCheckinDominant
            ? (isDark ? "bg-[#a855f7] text-foreground" : "bg-blue-600 text-foreground")
            : "bg-[#c084fc] text-black";
          const pulseColor = isCheckinDominant
            ? (isDark ? "rgba(168, 85, 247, 0.4)" : "rgba(59, 130, 246, 0.4)")
            : "rgba(192, 132, 252, 0.4)";

          const icon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
                <div class="absolute inset-0 rounded-full animate-ping opacity-75" style="background-color: ${pulseColor};"></div>
                <div class="relative w-8 h-8 rounded-full border-2 border-white dark:border-[#0d0d12] ${badgeBg} flex items-center justify-center font-bold text-xs shadow-lg transition-transform hover:scale-110">
                  ${count}
                </div>
              </div>
            `,
            className: "custom-cluster-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          L.marker([group.center.lat, group.center.lng], { icon })
            .on("click", () => {
              setSelectedGroup(group.taps);
            })
            .addTo(markersGroupRef.current);
        }
      });
    } else {
      markersGroupRef.current.removeFrom(mapRef.current);
    }

    // E. Add/Update Heatmap Layer
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (showHeatmap) {
      // Map intensities down: 0.05 for checkins, 0.03 for networking
      const heatPoints = taps.map((tap) => {
        const intensity = tap.type === "checkin" ? 0.05 : 0.03;
        return [tap.lat, tap.lng, intensity];
      });

      if (heatPoints.length > 0) {
        // Dynamic heatmap scaling algorithm
        const getRadiusForZoom = (z: number) => {
          if (z >= 20) return 70;
          if (z === 19) return 55;
          if (z === 18) return 42;
          if (z === 17) return 32;
          if (z === 16) return 24;
          return 16;
        };

        const initialZoom = mapRef.current.getZoom();
        const initialRadius = getRadiusForZoom(initialZoom);

        heatLayerRef.current = L.heatLayer(heatPoints, {
          radius: initialRadius,
          blur: Math.round(initialRadius * 0.7),
          maxZoom: 17, // keeps points intensely saturated when zoomed past level 17
          max: 1.0,
          gradient: isDark
            ? {
              0.15: "rgba(168, 85, 247, 0.2)",  // Amethyst/Purple
              0.4: "rgba(192, 132, 252, 0.45)", // Lavender
              0.65: "rgba(232, 121, 249, 0.7)", // Fuchsia
              0.85: "rgba(244, 114, 182, 0.85)",// Pink
              1.0: "rgba(244, 63, 94, 1.0)"     // Rose
            }
            : {
              0.15: "blue",
              0.4: "cyan",
              0.65: "lime",
              0.85: "orange",
              1.0: "red"
            },
        }).addTo(mapRef.current);

        // Listen for zoom changes and dynamically rescale the heatmap radius/blur sizes
        const handleZoomEnd = () => {
          if (!mapRef.current || !heatLayerRef.current) return;
          const currentZoom = mapRef.current.getZoom();
          const nextRadius = getRadiusForZoom(currentZoom);
          heatLayerRef.current.setOptions({
            radius: nextRadius,
            blur: Math.round(nextRadius * 0.7)
          });
        };

        mapRef.current.off("zoomend", heatZoomHandlerRef.current);
        heatZoomHandlerRef.current = handleZoomEnd;
        mapRef.current.on("zoomend", handleZoomEnd);
      }
    }
  }, [scriptsLoaded, tapsData, taps, zone, venue, showHeatmap, showMarkers]);

  // 4. Where the map looks: fitted once per event, then only on the toggle
  const fitTo = (mode: Focus) => {
    const map = mapRef.current;
    if (!map) return;
    let bounds: Bounds | null = null;
    if (mode === "taps") bounds = tapFocusBounds(taps);
    if (mode === "zone" && zone) bounds = boundsOf(zone.flat(2).map(([lat, lng]) => ({ lat, lng })));
    if (bounds) {
      // Keep clear of the overlay controls (top) and the legend (bottom)
      map.invalidateSize();
      map.fitBounds(bounds, { paddingTopLeft: [24, 64], paddingBottomRight: [24, 56], maxZoom: 19 });
    } else if (venue) {
      map.setView([venue.lat, venue.lng], 18);
    }
  };
  const fitToRef = useRef(fitTo);
  useEffect(() => {
    fitToRef.current = fitTo;
  });

  useEffect(() => {
    // Right after switching events the previous event's data is still around
    if (!scriptsLoaded || !mapRef.current || !tapsData || tapsData.event_id !== postId) return;
    if (fittedForRef.current === postId) return;
    fittedForRef.current = postId;
    const initial: Focus = taps.length > 0 ? "taps" : zone ? "zone" : "venue";
    setFocus(initial);
    fitToRef.current(initial);
  }, [scriptsLoaded, tapsData, postId, taps.length, zone]);

  const chooseFocus = (mode: Focus) => {
    setFocus(mode);
    fitTo(mode);
  };

  // Clean up map when component completely unmounts
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
        zoneGroupRef.current = null;
        fittedForRef.current = null;
        heatLayerRef.current = null;
        markerRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex-1 min-h-[420px] sm:min-h-[350px] relative rounded-xl overflow-hidden border border-black/5 dark:border-foreground/5 bg-gray-100 dark:bg-black flex items-center justify-center">
      {/* Global CSS Overrides for Leaflet Popups to match portal's theme */}
      <style>{`
        .leaflet-popup-content-wrapper {
          padding: 8px 10px !important;
        }
        .dark-leaflet-popup .leaflet-popup-content-wrapper {
          background: #050409 !important;
          color: #ffffff !important;
          border: 1px solid rgba(168, 85, 247, 0.15) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7) !important;
        }
        .dark-leaflet-popup .leaflet-popup-tip {
          background: #050409 !important;
          border-left: 1px solid rgba(168, 85, 247, 0.15) !important;
          border-bottom: 1px solid rgba(168, 85, 247, 0.15) !important;
        }
        .light-leaflet-popup .leaflet-popup-content-wrapper {
          background: #ffffff !important;
          color: #0d0d11 !important;
          border: 1px solid rgba(0, 0, 0, 0.12) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1) !important;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
          line-height: 1.3 !important;
        }
        .zone-label {
          background: ${ZONE_COLOR} !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 2px 6px !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
        }
        .zone-label::before {
          border-top-color: ${ZONE_COLOR} !important;
        }
        .light-leaflet-popup .leaflet-popup-tip {
          background: #ffffff !important;
          border-left: 1px solid rgba(0, 0, 0, 0.12) !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.12) !important;
        }
      `}</style>

      {/* Loading state */}
      {(isLoading || !scriptsLoaded) && (
        <div className="absolute inset-0 bg-foreground/50 dark:bg-black/50 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-semibold text-black/60 dark:text-foreground/60">
            {!scriptsLoaded ? "Initializing map view…" : "Loading tap analytics…"}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute inset-0 bg-white dark:bg-[#0d0d12] z-30 p-6 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <h4 className="font-bold text-sm text-black dark:text-foreground">Could not load heatmap</h4>
          <p className="text-xs text-black/50 dark:text-foreground/40 max-w-xs">{error}</p>
        </div>
      )}

      {/* Overlay controls: recenter on the left, layers + tilt on the right; wraps on phones */}
      {tapsData && !isLoading && (
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto bg-white/90 dark:bg-[#0d0d12]/90 backdrop-blur border border-black/10 dark:border-foreground/10 rounded-lg p-1 flex gap-1 shadow-md" role="group" aria-label="Recenter map">
            {([
              ["taps", "Taps", taps.length === 0],
              ["zone", "Zone", !zone],
              ["venue", "Venue", !venue],
            ] as const).map(([mode, label, disabled]) => (
              <button
                key={mode}
                onClick={() => chooseFocus(mode)}
                disabled={disabled}
                aria-pressed={focus === mode}
                className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all disabled:opacity-35 disabled:cursor-not-allowed ${focus === mode
                  ? "bg-purple-600 dark:bg-[#a855f7] text-white shadow-sm"
                  : "text-black/60 dark:text-foreground/60 hover:bg-black/5 dark:hover:bg-foreground/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
            {taps.length > 0 && (
              <div className="bg-white/90 dark:bg-[#0d0d12]/90 backdrop-blur border border-black/10 dark:border-foreground/10 rounded-lg p-1 flex gap-1 shadow-md">
                <button onClick={() => setShowHeatmap(!showHeatmap)} aria-pressed={showHeatmap} className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all disabled:opacity-35 disabled:cursor-not-allowed ${showHeatmap
                  ? "bg-purple-600 dark:bg-[#a855f7] text-white shadow-sm"
                  : "text-black/60 dark:text-foreground/60 hover:bg-black/5 dark:hover:bg-foreground/5"
                }`}>
                  Heatmap
                </button>
                <button onClick={() => setShowMarkers(!showMarkers)} aria-pressed={showMarkers} className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all disabled:opacity-35 disabled:cursor-not-allowed ${showMarkers
                  ? "bg-purple-600 dark:bg-[#a855f7] text-white shadow-sm"
                  : "text-black/60 dark:text-foreground/60 hover:bg-black/5 dark:hover:bg-foreground/5"
                }`}>
                  Markers
                </button>
              </div>
            )}
            <div className="hidden sm:flex bg-white/90 dark:bg-[#0d0d12]/90 backdrop-blur border border-black/10 dark:border-foreground/10 rounded-lg p-1 gap-1 shadow-md">
              <button onClick={() => setIs3DMode(false)} aria-pressed={!is3DMode} className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all disabled:opacity-35 disabled:cursor-not-allowed ${!is3DMode
                  ? "bg-purple-600 dark:bg-[#a855f7] text-white shadow-sm"
                  : "text-black/60 dark:text-foreground/60 hover:bg-black/5 dark:hover:bg-foreground/5"
                }`}>
                2D
              </button>
              <button onClick={() => setIs3DMode(true)} aria-pressed={is3DMode} className={`px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all disabled:opacity-35 disabled:cursor-not-allowed ${is3DMode
                  ? "bg-purple-600 dark:bg-[#a855f7] text-white shadow-sm"
                  : "text-black/60 dark:text-foreground/60 hover:bg-black/5 dark:hover:bg-foreground/5"
                }`}>
                <Layers className="w-3 h-3" />
                3D
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No taps yet */}
      {tapsData && taps.length === 0 && !isLoading && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-black/85 backdrop-blur border border-black/10 dark:border-foreground/10 px-3 py-1.5 rounded-lg text-[11px] text-black/60 dark:text-foreground/60 z-20 flex items-center gap-1.5 font-medium shadow-sm whitespace-nowrap">
          <RefreshCw className="w-3 h-3 text-purple-500 animate-spin" />
          No taps yet
        </div>
      )}

      {/* Map Container (with dynamic 3D Perspective transition styling) */}
      <div
        ref={containerRef}
        style={{
          transform: is3DMode
            ? "perspective(1200px) rotateX(25deg) rotateY(-8deg) rotateZ(5deg)"
            : "none",
          boxShadow: is3DMode
            ? "0 35px 65px rgba(0,0,0,0.5), 0 15px 25px rgba(0,0,0,0.35)"
            : "none",
        }}
        className="w-full h-full min-h-[420px] sm:min-h-[350px] z-10 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) origin-center"
      />

      {/* Map legend */}
      {tapsData && !isLoading && (
        <div className="absolute bottom-9 sm:bottom-3 left-2 sm:left-3 right-12 sm:right-auto bg-white/90 dark:bg-[#050409]/95 backdrop-blur border border-black/10 dark:border-[#a855f7]/15 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 shadow-md z-20">
          {taps.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-[#a855f7]"></div>
                <span className="text-black/60 dark:text-foreground/60 text-[10px] font-semibold">Check-in</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-[#c084fc]"></div>
                <span className="text-black/60 dark:text-foreground/60 text-[10px] font-semibold">Networking tap</span>
              </div>
            </>
          )}
          {zone && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-2.5 rounded-sm border-2 border-dashed border-[#8B5CF6] bg-[#8B5CF6]/10"></div>
              <span className="text-black/60 dark:text-foreground/60 text-[10px] font-semibold">Check-in zone</span>
            </div>
          )}
          {venue && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-black/70 dark:border-foreground/80 bg-white dark:bg-[#1f1f24]"></div>
              <span className="text-black/60 dark:text-foreground/60 text-[10px] font-semibold">Venue (Luma address)</span>
            </div>
          )}
        </div>
      )}

      {/* Cluster Detailed Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0a14] border border-[#a855f7]/15 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-foreground/5 flex items-center justify-between bg-foreground/[0.02]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600 dark:text-[#a855f7]" />
                <h3 className="font-bold text-base text-foreground">Clustered taps ({selectedGroup.length})</h3>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1 rounded-lg hover:bg-foreground/5 transition-colors text-foreground/50 hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#0b0a14]">
              {selectedGroup.map((tap, idx) => {
                const isCheckin = tap.type === "checkin";
                const avatarUrl = tap.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tap.user?.username || idx}`;

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-3 rounded-xl border border-[#a855f7]/10 bg-foreground/[0.01] hover:bg-foreground/[0.03] transition-colors"
                  >
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={avatarUrl}
                        alt={tap.user?.username}
                        className="w-10 h-10 rounded-full border border-foreground/10 bg-foreground/5 object-cover"
                      />
                      <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border border-[#0b0a14] shadow-sm ${isCheckin ? "bg-blue-500 dark:bg-[#a855f7]" : "bg-red-500 dark:bg-[#c084fc]"
                        }`}>
                        {isCheckin ? (
                          <CheckCircle2 className="w-3 h-3 text-foreground dark:text-black" />
                        ) : (
                          <Fingerprint className="w-3 h-3 text-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground truncate">
                          @{tap.user?.username || "anonymous"}
                        </span>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#a855f7]/10 text-[#c084fc] text-xs font-bold flex items-center gap-0.5">
                          <Award className="w-3 h-3" /> +{tap.points || 5} REP
                        </span>
                      </div>

                      <p className="text-xs text-foreground/50 leading-relaxed">
                        {isCheckin ? (
                          <span>Checked in via host <span className="font-medium text-foreground">@{tap.given_by?.username || "host"}</span></span>
                        ) : (
                          <span>Exchanged reputation with <span className="font-medium text-foreground">@{tap.given_by?.username || "user"}</span></span>
                        )}
                      </p>

                      <div className="flex items-center gap-1 mt-2 text-[10px] text-foreground/40 font-mono">
                        <MapPin className="w-3 h-3" />
                        <span>Lat: {tap.lat.toFixed(6)}, Lng: {tap.lng.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-foreground/5 bg-foreground/[0.02] flex justify-end">
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-2 bg-[#a855f7] hover:bg-[#c084fc] text-foreground font-semibold rounded-xl text-xs transition-colors shadow-md"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
