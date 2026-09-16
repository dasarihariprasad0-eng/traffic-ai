import base64
import json
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import settings

router = APIRouter()

PROMPT = (
    "Analyze this road image. Respond ONLY with valid JSON: "
    '{"type": "Pothole|Waterlogging|Road Work|Broken Pavement|Accident|Other", '
    '"severity": "Low|Medium|High", "confidence": 0.0, "description": "short sentence"}. '
    "No text before or after the JSON."
)


def clean_json(txt: str) -> str:
    txt = txt.strip()
    if txt.startswith("```"):
        txt = txt.split("```")[1]
        if txt.startswith("json"):
            txt = txt[4:]
    return txt.strip()


@router.post("/analyze/gemini")
async def analyze_gemini(file: UploadFile = File(...)):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(503, "GEMINI_API_KEY not configured")
    try:
        from google import genai
        from google.genai.types import Part
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        data = await file.read()
        img = Part.from_bytes(data=data, mime_type=file.content_type or "image/jpeg")
        resp = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[img, PROMPT],
        )
        raw = resp.text
        return {"provider": "gemini", "raw": raw, "parsed": json.loads(clean_json(raw))}
    except Exception as e:
        raise HTTPException(502, f"Gemini error: {str(e)[:200]}")


@router.post("/analyze/groq")
async def analyze_groq(file: UploadFile = File(...)):
    if not settings.GROQ_API_KEY:
        raise HTTPException(503, "GROQ_API_KEY not configured")
    data = await file.read()
    b64 = base64.b64encode(data).decode()
    payload = {
        "model": settings.GROQ_VISION_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {
                    "url": f"data:{file.content_type or 'image/jpeg'};base64,{b64}"
                }},
            ],
        }],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=45.0) as c:
        r = await c.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload, headers=headers,
        )
    if r.status_code != 200:
        if r.status_code in (400, 404) and "model" in r.text.lower():
            raise HTTPException(
                503,
                "This Groq account does not have an available vision model. Add a free Gemini API key or enable a Groq vision model.",
            )
        raise HTTPException(502, f"Groq error: {r.text[:200]}")
    content = r.json()["choices"][0]["message"]["content"]
    return {"provider": "groq", "raw": content, "parsed": json.loads(clean_json(content))}
