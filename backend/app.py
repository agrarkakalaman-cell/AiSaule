import asyncio
import logging
import os
import uuid
from html import escape
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")

logger = logging.getLogger("aisaule.api")
app = FastAPI(title="Ai.Saule Language API", version="1.1.0")
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    os.getenv(
        "TRANSLATOR_ALLOWED_ORIGINS",
        "http://localhost:3001,http://127.0.0.1:3001",
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in allowed_origins.split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    source: str = Field(min_length=2, max_length=10)
    targets: list[str] = Field(min_length=1, max_length=10)


class TranslationResponse(BaseModel):
    translations: dict[str, str]


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: str = Field(default="kk", min_length=2, max_length=10)


VOICES = {
    "en": ("en-US", "en-US-JennyNeural"),
    "fa": ("fa-IR", "fa-IR-DilaraNeural"),
    "hu": ("hu-HU", "hu-HU-NoemiNeural"),
    "kk": ("kk-KZ", "kk-KZ-AigulNeural"),
    "mn": ("mn-MN", "mn-MN-YesuiNeural"),
    "ps": ("ps-AF", "ps-AF-LatifaNeural"),
    "ru": ("ru-RU", "ru-RU-SvetlanaNeural"),
    "tr": ("tr-TR", "tr-TR-EmelNeural"),
    "uk": ("uk-UA", "uk-UA-PolinaNeural"),
    "ur": ("ur-PK", "ur-PK-UzmaNeural"),
    "uz": ("uz-UZ", "uz-UZ-MadinaNeural"),
    "zh-CN": ("zh-CN", "zh-CN-XiaoxiaoNeural"),
}

TRANSLATOR_LANGUAGE_CODES = {
    "mn": "mn-Cyrl",
    "zh-CN": "zh-Hans",
}
TRANSLATOR_LANGUAGE_CODES_REVERSE = {
    azure_code: app_code for app_code, azure_code in TRANSLATOR_LANGUAGE_CODES.items()
}
TRANSIENT_AZURE_STATUS_CODES = {408, 429, 500, 502, 503, 504}


async def post_azure_with_retry(
    url: str,
    *,
    timeout: float,
    **request_kwargs: object,
) -> httpx.Response:
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(2):
            try:
                response = await client.post(url, **request_kwargs)
            except httpx.RequestError:
                if attempt == 1:
                    raise
            else:
                if response.status_code not in TRANSIENT_AZURE_STATUS_CODES or attempt == 1:
                    return response
            await asyncio.sleep(0.35)

    raise RuntimeError("Azure request retry loop ended unexpectedly.")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "aisaule-language-api"}


@app.get("/ready")
async def ready() -> dict[str, object]:
    checks = {
        "translator": bool(os.getenv("AZURE_TRANSLATOR_KEY", "").strip()),
        "speech": bool(os.getenv("AZURE_SPEECH_KEY", "").strip())
        and bool(
            os.getenv("AZURE_SPEECH_REGION", "").strip()
            or os.getenv("AZURE_SPEECH_ENDPOINT", "").strip()
        ),
    }
    if not all(checks.values()):
        raise HTTPException(status_code=503, detail=checks)
    return {"status": "ready", "checks": checks}


@app.post("/translate", response_model=TranslationResponse)
async def translate(payload: TranslationRequest) -> TranslationResponse:
    key = os.getenv("AZURE_TRANSLATOR_KEY", "").strip()
    endpoint = os.getenv(
        "AZURE_TRANSLATOR_ENDPOINT",
        "https://aisaule-translator.cognitiveservices.azure.com",
    ).strip().rstrip("/")
    region = os.getenv("AZURE_TRANSLATOR_REGION", "").strip()

    if not key:
        raise HTTPException(status_code=503, detail="Azure Translator кілті бапталмаған.")

    targets = list(dict.fromkeys(payload.targets))
    translations = {target: payload.text for target in targets if target == payload.source}
    azure_targets = [target for target in targets if target != payload.source]
    if not azure_targets:
        return TranslationResponse(translations=translations)

    headers = {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": key,
        "X-ClientTraceId": str(uuid.uuid4()),
    }
    if region:
        headers["Ocp-Apim-Subscription-Region"] = region

    url = f"{endpoint}/translator/text/v3.0/translate"
    params: list[tuple[str, str]] = [
        ("api-version", "3.0"),
        ("from", TRANSLATOR_LANGUAGE_CODES.get(payload.source, payload.source)),
        *[("to", TRANSLATOR_LANGUAGE_CODES.get(target, target)) for target in azure_targets],
    ]

    try:
        response = await post_azure_with_retry(
            url,
            timeout=15.0,
            params=params,
            headers=headers,
            json=[{"Text": payload.text}],
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail="Azure Translator сервисіне қосылу мүмкін болмады.",
        ) from exc

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=502,
            detail="Azure Translator кілті, endpoint немесе region сәйкес емес.",
        )
    if not response.is_success:
        logger.warning(
            "Azure Translator failed: status=%s trace_id=%s response=%s",
            response.status_code,
            headers["X-ClientTraceId"],
            response.text[:500],
        )
        raise HTTPException(
            status_code=502,
            detail=f"Azure Translator қатесі ({response.status_code}).",
        )

    try:
        azure_result = response.json()[0]["translations"]
        translations.update({
            TRANSLATOR_LANGUAGE_CODES_REVERSE.get(item["to"], item["to"]): item["text"]
            for item in azure_result
        })
    except (IndexError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Azure Translator жауабының форматы дұрыс емес.",
        ) from exc

    return TranslationResponse(translations=translations)


@app.post("/speech", response_class=Response)
async def synthesize_speech(payload: SpeechRequest) -> Response:
    key = os.getenv("AZURE_SPEECH_KEY", "").strip()
    region = os.getenv("AZURE_SPEECH_REGION", "").strip()
    configured_endpoint = os.getenv("AZURE_SPEECH_ENDPOINT", "").strip().rstrip("/")
    if not key or (not region and not configured_endpoint):
        raise HTTPException(
            status_code=503,
            detail="Azure Speech кілті немесе region/endpoint бапталмаған.",
        )

    selected_voice = VOICES.get(payload.language)
    if not selected_voice:
        raise HTTPException(
            status_code=422,
            detail="Бұл тілге Azure Speech дауысы қолжетімсіз.",
        )
    locale, voice = selected_voice
    endpoint = (
        f"{configured_endpoint}/cognitiveservices/v1"
        if configured_endpoint
        else f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
    )
    ssml = (
        f'<speak version="1.0" xml:lang="{locale}">'
        f'<voice name="{voice}">{escape(payload.text)}</voice>'
        "</speak>"
    )

    try:
        response = await post_azure_with_retry(
            endpoint,
            timeout=30.0,
            headers={
                "Content-Type": "application/ssml+xml",
                "Ocp-Apim-Subscription-Key": key,
                "User-Agent": "AiSaule",
                "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            },
            content=ssml.encode("utf-8"),
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail="Azure Speech сервисіне қосылу мүмкін болмады.",
        ) from exc

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=502,
            detail="Azure Speech кілті немесе region сәйкес емес.",
        )
    if not response.is_success:
        logger.warning(
            "Azure Speech failed: status=%s response=%s",
            response.status_code,
            response.text[:500],
        )
        raise HTTPException(
            status_code=502,
            detail=f"Azure Speech қатесі ({response.status_code}).",
        )

    return Response(
        content=response.content,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": f'inline; filename="aisaule-{payload.language}.mp3"',
        },
    )
