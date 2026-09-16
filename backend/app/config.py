from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    PROJECT_NAME: str = "TrafficAI - Road Condition API"
    API_V1_STR: str = "/api/v1"
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    MAPBOX_TOKEN: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")


settings = Settings()

settings.GEMINI_API_KEY = settings.GEMINI_API_KEY.strip()
settings.GROQ_API_KEY = settings.GROQ_API_KEY.strip()
