// Leaflet (+ leaflet.heat) from unpkg, loaded once on the client and shared by
// every map on the dashboard.

const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY ?? "";

let loading: Promise<any> | null = null;

function addScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

/** Resolves with window.L once Leaflet and leaflet.heat are in. */
export function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L?.heatLayer) return Promise.resolve(w.L);
  if (loading) return loading;

  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  loading = (async () => {
    if (!w.L) await addScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
    if (!w.L.heatLayer) await addScript("https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js");
    return w.L;
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

export interface BaseTiles {
  url: string;
  maxNativeZoom: number;
  attribution: string;
}

/**
 * Base map tiles for the theme: CARTO when an API key is configured,
 * otherwise Esri (no key needed). Beyond maxNativeZoom Leaflet upscales.
 */
export function baseTiles(isDark: boolean): { carto: BaseTiles | null; esri: BaseTiles } {
  const esri = {
    url: isDark
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    maxNativeZoom: isDark ? 16 : 19,
    attribution: "Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors",
  };
  const carto = CARTO_API_KEY
    ? {
        url: `https://basemaps.cartocdn.com/${isDark ? "dark_all" : "rastertiles/voyager"}/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
        maxNativeZoom: 20,
        attribution: "© OpenStreetMap contributors © CARTO",
      }
    : null;
  return { carto, esri };
}
