import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()
GEOCODER_FORWARD = "https://nominatim.openstreetmap.org/search"
GEOCODER_REVERSE = "https://nominatim.openstreetmap.org/reverse"
GEOCODER_HEADERS = {"User-Agent": "TrafficAI/1.0 (local development)"}


@router.get("/geocode")
async def geocode(q: str = Query(...)):
    """Forward geocoding: place name → coordinates."""
    params = {"q": q, "limit": 1, "lang": "en"}
    async with httpx.AsyncClient(timeout=10.0) as c:
        try:
            params = {"q": q, "format": "jsonv2", "limit": 1, "addressdetails": 1}
            r = await c.get(GEOCODER_FORWARD, params=params, headers=GEOCODER_HEADERS)
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPError as e:
            raise HTTPException(502, f"Geocoder unreachable: {e}")

    if not data:
        raise HTTPException(404, f"Location not found: {q}")

    result = data[0]
    address = result.get("address", {})

    return {
        "lat": float(result["lat"]),
        "lng": float(result["lon"]),
        "display_name": result.get("display_name", q),
        "city": address.get("city") or address.get("town") or address.get("village", ""),
        "country": address.get("country", ""),
        "state": address.get("state", ""),
    }


@router.get("/geocode/reverse")
async def reverse_geocode(lat: float = Query(...), lng: float = Query(...)):
    """Reverse geocoding: coordinates → human-readable address."""
    params = {"lat": lat, "lon": lng, "lang": "en", "limit": 1}
    async with httpx.AsyncClient(timeout=10.0) as c:
        try:
            params = {"lat": lat, "lon": lng, "format": "jsonv2", "addressdetails": 1}
            r = await c.get(GEOCODER_REVERSE, params=params, headers=GEOCODER_HEADERS)
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPError as e:
            raise HTTPException(502, f"Reverse geocoder unreachable: {e}")

    if not data:
        return {
            "display_name": f"{lat:.4f}, {lng:.4f}",
            "city": "",
            "state": "",
            "country": "",
        }

    address = data.get("address", {})
    city = address.get("city") or address.get("town") or address.get("village", "")
    display = data.get("display_name", "")

    return {
        "display_name": display or f"{lat:.4f}, {lng:.4f}",
        "city": city,
        "state": address.get("state", ""),
        "country": address.get("country", ""),
    }