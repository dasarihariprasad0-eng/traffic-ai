from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import routing, geocoding, ai_analysis, reports
from app.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_origin_regex=r"^https?://(127\.0\.0\.1|localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/config/status")
def config_status():
    return {
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "groq_configured": bool(settings.GROQ_API_KEY),
        "groq_vision_model": settings.GROQ_VISION_MODEL,
    }


app.include_router(routing.router, prefix=settings.API_V1_STR, tags=["Routing"])
app.include_router(geocoding.router, prefix=settings.API_V1_STR, tags=["Geocoding"])
app.include_router(ai_analysis.router, prefix=settings.API_V1_STR, tags=["AI"])
app.include_router(reports.router, prefix=settings.API_V1_STR, tags=["Reports"])