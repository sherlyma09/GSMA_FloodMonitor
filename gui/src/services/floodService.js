// Example API base configuration
// To this (pointing directly to your live Render backend):
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://gsma-floodmonitor.onrender.com";

export async function fetchEventExtentSummary() {
  const response = await fetch(`${API_BASE_URL}/api/event-extent-summary`);
  if (!response.ok) throw new Error("Failed to fetch event summary");
  return response.json();
}

export async function loadEventStats() {
    const response = await fetch(
        "/data/flood/flood_statistics_event_extent.json"
    );

    return response.json();
}

export async function loadTimeSeries() {
    const response = await fetch(
        "/data/flood/flood_statistics.json"
    );

    return response.json();
}

export async function loadFloodLayer(date) {

    const file =
        date === "20260903"
        ? "/data/flood/parcel_flood_20260903.geojson"
        : "/data/flood/parcel_flood_20260915.geojson";

    const response = await fetch(file);

    return response.json();
}
