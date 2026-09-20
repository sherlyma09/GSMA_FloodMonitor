import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

function FloodMap({ activeViewMode, selectedView, displayMode, selectedRaster }) {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);

    // Initialize map once on mount
    useEffect(() => {
        if (mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: "raster",
                        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                        tileSize: 256,
                        attribution: "© OpenStreetMap Contributors"
                    }
                },
                layers: [
                    {
                        id: "osm",
                        type: "raster",
                        source: "osm"
                    }
                ]
            },
            center: [80.8, 28.1],
            zoom: 10
        });

        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), "top-right");

        map.on("load", () => {
            map.resize();
        });
    }, []);

    // Handle layer switching with a constant, reliable dependency array size
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        const removeLayerIfExists = (id) => { if (map.getLayer(id)) map.removeLayer(id); };
        const removeSourceIfExists = (id) => { if (map.getSource(id)) map.removeSource(id); };

        if (activeViewMode === "vector") {
            // Clean up raster elements when viewing vector
            removeLayerIfExists("raster-flood-layer");
            removeSourceIfExists("raster-flood-source");

            const dataUrl = `http://127.0.0.1:8000/api/parcel-exposure/${selectedView}`;

		const updateVectorLayer = async () => {
			const map = mapRef.current;
			if (!map || !map.isStyleLoaded()) return;

			try {
				let floodData;

				// If viewing the massive event extent, fetch and merge the 5 split parts from GitHub Releases
				if (selectedView === "event_extent") {
				    const totalParts = 5;
				    const fetchPromises = Array.from({ length: totalParts }, async (_, i) => {
				        const partNum = i + 1;
				        // Notice the .json extension matching your GitHub Release files
				        const url = `https://github.com/sherlyma09/GSMA_FloodMonitor/releases/download/v1.0.0/parcel_flood_event_extent_part${partNum}.json`;
				        
				        const res = await fetch(url);
				        if (!res.ok) throw new Error(`Failed to load event extent part ${partNum}`);
				        const data = await res.json();
				        return data.features || [];
				    });
				
				    const results = await Promise.all(fetchPromises);
				    let combinedFeatures = [];
				    results.forEach(features => combinedFeatures.push(...features));
				
				    floodData = {
				        type: "FeatureCollection",
				        features: combinedFeatures
				    };
				} else {
					// For other specific dates, fetch from your FastAPI backend endpoint
					const dataUrl = `http://127.0.0.1:8000/api/parcel-exposure/${selectedView}`;
					const res = await fetch(dataUrl);
					if (!res.ok) throw new Error("Failed to fetch vector data");
					floodData = await res.json();
				}

				// Feed the unified data into the MapLibre source
				if (map.getSource("flood")) {
					map.getSource("flood").setData(floodData);
				} else {
					map.addSource("flood", {
						type: "geojson",
						data: floodData
					});
				}

				const fillColor = displayMode === "binary" 
					? [
						"match",
						["get", "flood_class"],
						"Not Flooded", "transparent",
						"#dc2626"
					  ]
					: [
						"match",
						["get", "flood_class"],
						"Extreme", "#8b0000",
						"Severe", "#ff0000",
						"Moderate", "#ff8c00",
						"Minor", "#ffd700",
						"transparent"
					  ];

				const outlineOpacity = displayMode === "binary" ? 0 : [
					"match",
					["get", "flood_class"],
					"Not Flooded", 0,
					1.0
				];

				if (map.getLayer("flood-fill")) {
					map.setPaintProperty("flood-fill", "fill-color", fillColor);
					map.setPaintProperty("flood-outline", "line-opacity", outlineOpacity);
				} else {
					map.addLayer({
						id: "flood-fill",
						type: "fill",
						source: "flood",
						paint: {
							"fill-color": fillColor,
							"fill-opacity": 0.85
						}
					});

					map.addLayer({
						id: "flood-outline",
						type: "line",
						source: "flood",
						paint: {
							"line-color": "#ffffff",
							"line-width": 0.5,
							"line-opacity": outlineOpacity
						}
					});
				}
			} catch (err) {
				console.error("Error updating vector layer:", err);
			}
		};

        } else {
            // RASTER MODE: Clean up vector elements
            removeLayerIfExists("flood-fill");
            removeLayerIfExists("flood-outline");
            removeSourceIfExists("flood");

            const imageUrl = `http://127.0.0.1:8000/api/flood-raster-image/${selectedRaster}`;
            const boundsUrl = `http://127.0.0.1:8000/api/flood-raster-bounds/${selectedRaster}`;

            const updateRasterOverlay = async () => {
                try {
                    const res = await fetch(boundsUrl);
                    if (!res.ok) return;
                    const boundsData = await res.json();

                    if (map.getSource("raster-flood-source")) {
                        map.removeLayer("raster-flood-layer");
                        map.removeSource("raster-flood-source");
                    }

                    map.addSource("raster-flood-source", {
                        type: "image",
                        url: imageUrl,
                        coordinates: boundsData.coordinates
                    });

                    map.addLayer({
                        id: "raster-flood-layer",
                        type: "raster",
                        source: "raster-flood-source",
                        paint: {
                            "raster-opacity": 0.85,
                            "raster-fade-duration": 0
                        }
                    });
                } catch (err) {
                    console.error("Error loading raster overlay:", err);
                }
            };

            updateRasterOverlay();
        }

        map.resize();
    }, [activeViewMode, selectedView, displayMode, selectedRaster]);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <div ref={mapContainer} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
            
            {/* Dynamic Floating Map Legend */}
            <div className="map-legend">
                <h4>
                    {activeViewMode === "raster" 
                        ? "Flood Raster Overlay" 
                        : (displayMode === "severity" ? "Flood Severity" : "Binary Inundation")}
                </h4>
                {activeViewMode === "raster" ? (
                    <div className="legend-item"><span style={{ background: "#2563eb" }}></span> Flood Extent (Blue)</div>
                ) : displayMode === "severity" ? (
                    <>
                        <div className="legend-item"><span style={{ background: "#8b0000" }}></span> Extreme (&ge;75%)</div>
                        <div className="legend-item"><span style={{ background: "#ff0000" }}></span> Severe (50-74%)</div>
                        <div className="legend-item"><span style={{ background: "#ff8c00" }}></span> Moderate (25-49%)</div>
                        <div className="legend-item"><span style={{ background: "#ffd700" }}></span> Minor (&lt;25%)</div>
                    </>
                ) : (
                    <div className="legend-item"><span style={{ background: "#dc2626" }}></span> Flooded Extent</div>
                )}
            </div>
        </div>
    );
}

export default FloodMap;
