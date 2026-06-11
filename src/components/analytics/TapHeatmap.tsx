"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { getEventTaps, type EventTap } from "@/src/api/events";

interface Props {
  postId: number;
}

export default function TapHeatmap({ postId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [tapsData, setTapsData] = useState<{ center: { lat: number; lng: number } | null; taps: EventTap[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // 1. Load Leaflet and Leaflet.heat dynamically on client side
  useEffect(() => {
    if ((window as any).L && (window as any).L.heatLayer) {
      setScriptsLoaded(true);
      return;
    }

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeafletJS = () => {
      if ((window as any).L) {
        loadHeatmapJS();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        loadHeatmapJS();
      };
      document.body.appendChild(script);
    };

    // Load Leaflet Heatmap Plugin JS
    const loadHeatmapJS = () => {
      if ((window as any).L?.heatLayer) {
        setScriptsLoaded(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
      script.async = true;
      script.onload = () => {
        setScriptsLoaded(true);
      };
      document.body.appendChild(script);
    };

    loadLeafletJS();
  }, []);

  // 2. Fetch event taps coordinates
  useEffect(() => {
    let active = true;
    const fetchTaps = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getEventTaps(postId);
        if (active) {
          setTapsData({
            center: data.center,
            taps: data.taps || [],
          });
        }
      } catch (err: any) {
        if (active) {
          setError(err.response?.data?.error || err.message || "Failed to load tap data");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchTaps();

    return () => {
      active = false;
    };
  }, [postId]);

  // 3. Initialize/Update Leaflet map when scripts are loaded and data is fetched
  useEffect(() => {
    if (!scriptsLoaded || !tapsData || !containerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Detect if portal is in dark mode
    const isDark = document.documentElement.classList.contains("dark");
    
    // Choose appropriate tiles
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    const attribution = '© OpenStreetMap contributors © CARTO';

    // Center map
    const defaultCenter = [50.4501, 30.5234]; // Kyiv default
    const mapCenter = tapsData.center
      ? [tapsData.center.lat, tapsData.center.lng]
      : defaultCenter;

    // A. Create Map Instance if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(mapCenter, 15);

      L.tileLayer(tileUrl, {
        maxZoom: 20,
        attribution,
      }).addTo(mapRef.current);
    } else {
      // B. If Map exists, update view and tile layer
      mapRef.current.setView(mapCenter, 15);
      
      // Update tile layer url to match dark/light theme
      mapRef.current.eachLayer((layer: any) => {
        if (layer._url) {
          layer.setUrl(tileUrl);
        }
      });
    }

    // C. Add or Update Event Center Marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }
    if (tapsData.center) {
      markerRef.current = L.marker(mapCenter)
        .bindPopup("<b>Event Location</b>")
        .addTo(mapRef.current);
    }

    // D. Add/Update Heatmap Layer
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
    }

    const heatPoints = tapsData.taps.map((tap) => {
      const intensity = tap.type === "checkin" ? 1.0 : 0.75;
      return [tap.lat, tap.lng, intensity];
    });

    if (heatPoints.length > 0) {
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 18,
        max: 1.0,
        gradient: isDark
          ? { 0.4: "rgba(0, 224, 194, 0.4)", 0.65: "rgba(168, 85, 247, 0.7)", 1.0: "rgba(239, 68, 68, 1)" }
          : { 0.4: "blue", 0.65: "lime", 1.0: "red" },
      }).addTo(mapRef.current);
    }

    // Cleanup function
    return () => {
      // We don't necessarily want to destroy the map on every render, but on unmount
    };
  }, [scriptsLoaded, tapsData]);

  // Clean up map when component completely unmounts
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        heatLayerRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex-1 min-h-[350px] relative rounded-xl overflow-hidden border border-black/5 dark:border-white/5 bg-gray-100 dark:bg-black flex items-center justify-center">
      {/* Loading state */}
      {(isLoading || !scriptsLoaded) && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-semibold text-black/60 dark:text-white/60">
            {!scriptsLoaded ? "Initializing Map View..." : "Loading Tap Analytics..."}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute inset-0 bg-white dark:bg-[#0d0d12] z-30 p-6 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <h4 className="font-bold text-sm text-black dark:text-white">Could Not Load Heatmap</h4>
          <p className="text-xs text-black/50 dark:text-white/40 max-w-xs">{error}</p>
        </div>
      )}

      {/* No Taps empty state */}
      {tapsData && tapsData.taps.length === 0 && !isLoading && (
        <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/85 backdrop-blur border border-black/10 dark:border-white/10 px-3 py-1.5 rounded-lg text-[10px] text-black/60 dark:text-white/60 z-20 flex items-center gap-1.5 font-medium shadow-sm">
          <RefreshCw className="w-3 h-3 text-purple-500 animate-spin" />
          Waiting for check-ins...
        </div>
      )}

      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full min-h-[350px] z-10" />

      {/* Map legend */}
      {tapsData && tapsData.taps.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-[#0d0d12]/90 backdrop-blur border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 flex gap-4 shadow-md z-20">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-[#00e0c2]"></div>
            <span className="text-black/60 dark:text-white/60 text-[10px] font-semibold">Check-in</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-purple-500"></div>
            <span className="text-black/60 dark:text-white/60 text-[10px] font-semibold">Networking Tap</span>
          </div>
        </div>
      )}
    </div>
  );
}
