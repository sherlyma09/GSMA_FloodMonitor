import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import FloodMap from "./FloodMap";

export default function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Primary view toggle: "vector" vs "raster"
    const [activeViewMode, setActiveViewMode] = useState("vector");

    // Specific selections for each mode
    const [selectedView, setSelectedView] = useState("event_extent");
    const [displayMode, setDisplayMode] = useState("severity"); // "severity" or "binary"
    const [selectedRaster, setSelectedRaster] = useState("flood_event_extent");

    useEffect(() => {
        if (activeViewMode !== "vector") return;

        const endpoint = selectedView === "event_extent" 
            ? "http://127.0.0.1:8000/api/event-extent-summary"
            : `http://127.0.0.1:8000/api/flood-statistics?date=${selectedView}`;

        setLoading(true);
        setError(null);

        fetch(endpoint)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch summary statistics");
                return res.json();
            })
            .then((data) => {
                setSummary(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [selectedView, activeViewMode]);

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div className="dashboard-container">
            {/* Sidebar Metrics & Controls Panel */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <span className="brand-badge">Flood Assessment</span>
                    <h2>GSMA Flood Monitor</h2>
                    <p className="subtitle">Gobind Sugar Mill Command Area</p>
                </div>

                {/* PRIMARY VIEW MODE SWITCHER (Vector vs Raster Radio Buttons) */}
                <div className="control-section">
                    <label className="control-label">Display Layer Type</label>
                    <div className="radio-group" style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                        <label className={`radio-label ${activeViewMode === "vector" ? "active" : ""}`} style={radioItemStyle}>
                            <input 
                                type="radio" 
                                name="viewModeType" 
                                value="vector" 
                                checked={activeViewMode === "vector"}
                                onChange={(e) => setActiveViewMode(e.target.value)}
                            />
                            <span>Parcel Exposure (Vector)</span>
                        </label>
                        <label className={`radio-label ${activeViewMode === "raster" ? "active" : ""}`} style={radioItemStyle}>
                            <input 
                                type="radio" 
                                name="viewModeType" 
                                value="raster" 
                                checked={activeViewMode === "raster"}
                                onChange={(e) => setActiveViewMode(e.target.value)}
                            />
                            <span>Flood Tiles (Raster)</span>
                        </label>
                    </div>
                </div>

                {/* CONDITIONAL CONTROLS BASED ON ACTIVE VIEW MODE */}
                {activeViewMode === "vector" ? (
                    <>
                        {/* Observation Extent Dropdown for Parcels */}
                        <div className="control-section">
                            <label className="control-label">Observed Extent (Parcels)</label>
                            <select 
                                value={selectedView} 
                                onChange={(e) => setSelectedView(e.target.value)}
                                className="control-select"
                            >
                                <option value="event_extent">Maximum Event Extent (Combined)</option>
                                <option value="20260903">September 3, 2026</option>
                                <option value="20260915">September 15, 2026</option>
                            </select>
                        </div>

                        {/* Visualization Style Toggle */}
                        <div className="control-section">
                            <label className="control-label">Visualization Style</label>
                            <div className="toggle-group">
                                <button 
                                    className={`toggle-btn ${displayMode === "severity" ? "active" : ""}`}
                                    onClick={() => setDisplayMode("severity")}
                                >
                                    Severity Classes
                                </button>
                                <button 
                                    className={`toggle-btn ${displayMode === "binary" ? "active" : ""}`}
                                    onClick={() => setDisplayMode("binary")}
                                >
                                    Binary Extent
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Flood Raster Layer Dropdown for TIFFs */}
                        <div className="control-section">
                            <label className="control-label">Select Flood Raster Tile</label>
                            <select 
                                value={selectedRaster} 
                                onChange={(e) => setSelectedRaster(e.target.value)}
                                className="control-select"
                            >
                                <option value="flood_event_extent">Event Extent (Combined)</option>
                                <option value="flood_20260903">September 3, 2026</option>
                                <option value="flood_20260915">September 15, 2026</option>
                            </select>
                        </div>
                    </>
                )}

                {/* Metrics display (Active for Vector view) */}
                {activeViewMode === "vector" && (
                    loading ? (
                        <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>Loading metrics...</div>
                    ) : (
                        summary && (
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <div className="metric-header">
                                        <h3>Flooded Area</h3>
                                        <span className="metric-icon">🌊</span>
                                    </div>
                                    <p className="metric-value">
                                        {summary?.total_flooded_area_ha ?? summary?.flooded_area_ha ?? 0}
                                        <span className="unit"> ha</span>
                                    </p>
                                </div>

                                <div className="metric-card">
                                    <div className="metric-header">
                                        <h3>Affected Parcels</h3>
                                        <span className="metric-icon">🌾</span>
                                    </div>
                                    <p className="metric-value">
                                        {summary?.affected_parcels?.toLocaleString() ?? 0}
                                        {summary?.total_parcels && <span className="unit"> / {summary?.total_parcels?.toLocaleString()}</span>}
                                    </p>
                                    {summary?.affected_pct && <p className="metric-sub">({summary?.affected_pct}% of total area)</p>}
                                </div>

                                <div className="metric-card alert">
                                    <div className="metric-header">
                                        <h3>Extreme Exposure</h3>
                                        <span className="metric-icon">⚠️</span>
                                    </div>
                                    <p className="metric-value" style={{ color: "#dc2626" }}>
                                        {summary?.extreme_parcels ?? 0} <span className="unit">parcels</span>
                                    </p>
                                </div>
                            </div>
                        )
                    )
                )}
            </aside>

            {/* Main Map Workspace */}
            <main className="map-workspace">
                <FloodMap 
                    activeViewMode={activeViewMode}
                    selectedView={selectedView} 
                    displayMode={displayMode} 
                    selectedRaster={selectedRaster} 
                />
            </main>
        </div>
    );
}

const radioItemStyle = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "8px 6px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#334155",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s ease"
};