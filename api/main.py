import json
import os
import urllib.request
import rasterio
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from rasterio.warp import transform_bounds

app = FastAPI(title="Gobind Sugar Mill Flood Monitor API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://gsmafloodmonitor.netlify.app",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "gui", "public", "data")
FLOOD_DIR = os.path.join(DATA_DIR, "flood")

@app.get("/api/observations")
def get_observations():
    catalog_path = os.path.join(DATA_DIR, "catalog", "available_acquisitions.json")
    if not os.path.exists(catalog_path):
        return []
    with open(catalog_path, "r") as f:
        return json.load(f)

@app.get("/api/flood-statistics")
def get_flood_statistics(date: str):
    date_str = date.replace("-", "")
    
    # Support both date-specific statistics and event extent query
    if date_str == "event_extent":
        json_path = os.path.join(FLOOD_DIR, "flood_statistics_event_extent.json")
    else:
        json_path = os.path.join(FLOOD_DIR, f"flood_statistics_{date_str}.json")

    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail=f"Statistics not found for requested date at {json_path}")
        
    with open(json_path, "r") as f:
        return json.load(f)

@app.get("/api/flood-timeseries")
def get_flood_timeseries():
    timeseries_path = os.path.join(FLOOD_DIR, "flood_statistics.json")
    if not os.path.exists(timeseries_path):
        return []
    with open(timeseries_path, "r") as f:
        return json.load(f)

@app.get("/api/command-area")
def get_command_area():
    path = os.path.join("config", "command_area.geojson")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Command area file missing.")
    with open(path, "r") as f:
        return json.load(f)

@app.get("/api/mill-location")
def get_mill_location():
    return {
        "name": "Gobind Sugar Mill",
        "type": "Point",
        "coordinates": [80.8, 28.1]
    }

# --------------------------------------------------
# MAXIMUM FLOOD EVENT & EXPOSURE ENDPOINTS
# --------------------------------------------------

@app.get("/api/event-extent-summary")
def get_event_extent_summary():
    """Returns summary statistics for the maximum flood event extent."""
    json_path = os.path.join(FLOOD_DIR, "flood_statistics_event_extent.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Event extent summary not found.")
    with open(json_path, "r") as f:
        return json.load(f)

@app.get("/api/event-parcel-exposure")
def get_event_parcel_exposure():
    """Returns the parcel-level flood exposure GeoJSON for the entire event."""
    geojson_path = os.path.join(FLOOD_DIR, "parcel_flood_event_extent.geojson")
    if not os.path.exists(geojson_path):
        raise HTTPException(status_code=404, detail="Parcel exposure GeoJSON not found.")
    return FileResponse(geojson_path, media_type="application/geo+json")

@app.get("/api/parcel-exposure/{date_str}")
def get_date_parcel_exposure(date_str: str):
    """Returns the parcel-level flood exposure GeoJSON for a specific date or event extent."""
    filename = f"parcel_flood_{date_str}.geojson"
    geojson_path = os.path.join(FLOOD_DIR, filename)
    
    if not os.path.exists(geojson_path):
        raise HTTPException(status_code=404, detail=f"Parcel exposure file not found for {date_str}.")
    
    return FileResponse(geojson_path, media_type="application/geo+json")

@app.get("/api/event-flood-raster")
def get_event_flood_raster():
    """Returns the combined maximum flood event raster."""
    raster_path = os.path.join(FLOOD_DIR, "flood_event_extent.tif")
    if not os.path.exists(raster_path):
        raise HTTPException(status_code=404, detail="Event flood raster not found.")
    return FileResponse(raster_path, media_type="image/tiff")
    
 
from rasterio.warp import transform_bounds

@app.get("/api/flood-raster-image/{raster_name}")
def get_flood_raster_png(raster_name: str):
    """Serves the generated PNG image for the raster overlay."""
    name = raster_name.replace(".tif", "").replace(".png", "")
    png_path = os.path.join(FLOOD_DIR, f"{name}.png")
    if not os.path.exists(png_path):
        raise HTTPException(status_code=404, detail="PNG raster image not found.")
    return FileResponse(png_path, media_type="image/png")

@app.get("/api/flood-raster-bounds/{raster_name}")
def get_flood_raster_bounds(raster_name: str, response: Response):
    """Extracts WGS84 bounding box coordinates from TIFF, or provides a reliable fallback if only PNG exists."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    
    name = raster_name.replace(".tif", "").replace(".png", "")
    tif_path = os.path.join(FLOOD_DIR, f"{name}.tif")
    
    # If the TIF file exists, extract its exact spatial bounds using rasterio
    if os.path.exists(tif_path):
        with rasterio.open(tif_path) as src:
            bounds = src.bounds
            src_crs = src.crs
            
            if src_crs and src_crs != "EPSG:4326":
                left, bottom, right, top = transform_bounds(src_crs, "EPSG:4326", bounds.left, bounds.bottom, bounds.right, bounds.top)
            else:
                left, bottom, right, top = bounds.left, bounds.bottom, bounds.right, bounds.top
                
        return {
            "coordinates": [
                [left, top],     # top-left
                [right, top],    # top-right
                [right, bottom], # bottom-right
                [left, bottom]   # bottom-left
            ]
        }
    
    # Fallback default bounding box around Gobind Sugar Mill command area if TIF is missing
    return {
        "coordinates": [
            [80.5, 28.3],  # top-left
            [81.1, 28.3],  # top-right
            [81.1, 27.9],  # bottom-right
            [80.5, 27.9]   # bottom-left
        ]
    }

@app.get("/api/event-parcel-exposure")
def get_event_parcel_exposure():
    """Downloads and merges the split parts from GitHub releases server-side."""
    combined_features = []
    base_url = "https://github.com/sherlyma09/GSMA_FloodMonitor/releases/download/v1.0.0"
    
    for i in range(1, 6):
        part_filename = f"parcel_flood_event_extent_part{i}.json"
        
        # Check local path first just in case
        local_path = os.path.join(FLOOD_DIR, part_filename)
        if os.path.exists(local_path):
            try:
                with open(local_path, "r") as f:
                    data = json.load(f)
                    combined_features.extend(data.get("features", []))
                    continue
            except Exception:
                pass
                
        # Fallback to GitHub Release download URL
        url = f"{base_url}/{part_filename}"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    combined_features.extend(data.get("features", []))
        except Exception as e:
            print(f"Warning: Could not fetch part {i}: {e}")
            
    if not combined_features:
        raise HTTPException(status_code=404, detail="Event extent split parts could not be retrieved.")
        
    return {
        "type": "FeatureCollection",
        "features": combined_features
    }
