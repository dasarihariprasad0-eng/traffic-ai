import httpx
from math import asin, cos, radians, sin, sqrt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()
OSRM = "https://router.project-osrm.org"


def great_circle_km(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> float:
    earth_radius_km = 6371
    lat_delta = radians(end_lat - start_lat)
    lng_delta = radians(end_lng - start_lng)
    value = sin(lat_delta / 2) ** 2 + cos(radians(start_lat)) * cos(radians(end_lat)) * sin(lng_delta / 2) ** 2
    return earth_radius_km * 2 * asin(sqrt(value))


def travel_options(distance_km: float, road_duration_min: float | None) -> list[dict]:
    car_minutes = road_duration_min or distance_km / 55 * 60
    options = [
        {
            "mode": "car",
            "label": "Car",
            "duration_min": round(car_minutes),
            "distance_km": round(distance_km, 1),
            "description": "Best for local and regional road journeys.",
        },
        {
            "mode": "bike",
            "label": "Bike",
            "duration_min": round(distance_km / 18 * 60),
            "distance_km": round(distance_km, 1),
            "description": "Suitable for short trips where cycling is practical.",
        },
        {
            "mode": "train",
            "label": "Train",
            "duration_min": round(distance_km / 80 * 60 + 90),
            "distance_km": round(distance_km, 1),
            "description": "Estimated rail time including an interchange allowance.",
        },
        {
            "mode": "plane",
            "label": "Aeroplane",
            "duration_min": round(distance_km / 800 * 60 + 180),
            "distance_km": round(distance_km, 1),
            "description": "Estimated flight time plus airport and boarding allowance.",
        },
    ]
    if distance_km > 500:
        best_mode = "plane"
    elif distance_km > 120:
        best_mode = "train"
    else:
        best_mode = "car"
    for option in options:
        option["recommended"] = option["mode"] == best_mode
    return options


class RouteRequest(BaseModel):
    start_lat: float = Field(..., ge=-90, le=90)
    start_lng: float = Field(..., ge=-180, le=180)
    end_lat: float = Field(..., ge=-90, le=90)
    end_lng: float = Field(..., ge=-180, le=180)


@router.post("/route")
async def get_route(req: RouteRequest):
    url = (
        f"{OSRM}/route/v1/driving/"
        f"{req.start_lng},{req.start_lat};{req.end_lng},{req.end_lat}"
        f"?overview=full&geometries=geojson&alternatives=3"
    )
    distance_km = great_circle_km(req.start_lat, req.start_lng, req.end_lat, req.end_lng)
    routes = []
    async with httpx.AsyncClient(timeout=15.0) as c:
        try:
            resp = await c.get(url)
            resp.raise_for_status()
            data = resp.json()
            routes = data.get("routes", [])
        except httpx.HTTPError:
            data = {}

    def fmt(rt, i):
        return {
            "id": chr(65 + i),
            "name": ["Fastest", "Alternate", "Scenic"][min(i, 2)],
            "geometry": rt["geometry"],
            "distance_km": round(rt["distance"] / 1000, 2),
            "duration_min": round(rt["duration"] / 60, 1),
        }

    formatted = [fmt(rt, i) for i, rt in enumerate(routes)]
    road_duration = formatted[0]["duration_min"] if formatted else None
    return {
        "recommended": formatted[0] if formatted else None,
        "alternatives": formatted[1:],
        "travel_options": travel_options(distance_km, road_duration),
        "estimate_basis": "Road time uses OSRM. Train, bike, and aeroplane times are planning estimates, not live schedules.",
    }
