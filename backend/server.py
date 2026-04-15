from fastapi import FastAPI, APIRouter
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
import base64
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from elevenlabs.client import ElevenLabs

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# ElevenLabs TTS config (Emma's voice)
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
ELEVENLABS_VOICE_ID = "cjVigY5qzO86Huf0OWal"  # Emma - Whiteboard
ELEVENLABS_MODEL = "eleven_flash_v2"

eleven_client = None
if ELEVENLABS_API_KEY:
    eleven_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# Filler words to strip (Wispr Flow-style)
FILLER_PATTERN = re.compile(
    r'\b(um+|uh+|uhh+|hmm+|hm+|ah+|ahh+|er+|err+|like,?\s+(?=like)|'
    r'you know,?\s*|i mean,?\s*|sort of,?\s*|kind of,?\s*|basically,?\s*|'
    r'actually,?\s*|literally,?\s*|right\??\s*(?=so)|okay so,?\s*|'
    r'so yeah,?\s*|yeah so,?\s*)\b',
    re.IGNORECASE
)


def clean_transcript(text: str) -> str:
    """Wispr Flow-style: strip fillers, fix spacing, clean up."""
    cleaned = FILLER_PATTERN.sub(' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    cleaned = re.sub(r'\s+([.,!?])', r'\1', cleaned)
    return cleaned


async def call_openrouter(messages: list, model: str = "openai/gpt-4.1") -> str:
    """Call OpenRouter API with OpenAI-compatible format."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://whiteboard-assistant.app",
        "X-Title": "Whiteboard Voice Assistant"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 2000,
    }

    async with httpx.AsyncClient(timeout=30.0) as http_client:
        response = await http_client.post(OPENROUTER_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data['choices'][0]['message']['content']


# ── Models ──────────────────────────────────────────────

class TranscriptRequest(BaseModel):
    transcript: str
    session_id: str
    existing_topics: Optional[List[str]] = []
    node_count: Optional[int] = 0


class TTSRequest(BaseModel):
    text: str


class SessionCreate(BaseModel):
    name: str = "Untitled Session"


class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    nodes: List[dict] = []
    connections: List[dict] = []
    transcript_history: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ConfigResponse(BaseModel):
    elevenlabs_agent_id: str


# ── System Prompts ──────────────────────────────────────

CLEAN_PROMPT = """You are a transcript cleaner inspired by Wispr Flow. Given raw speech transcript:

1. Remove ALL filler words: um, uh, hmm, like, you know, I mean, basically, actually, literally, so yeah, right
2. Fix grammar and punctuation
3. Merge fragmented thoughts into clear sentences
4. Keep the speaker's intent and key information intact
5. Make it concise and professional — as if the person wrote it deliberately
6. Do NOT add information that wasn't in the original
7. Do NOT summarize — preserve all distinct points, just clean the language

Return ONLY the cleaned text, nothing else."""


NOTES_PROMPT = """You are a visual note architect. Given a cleaned transcript, extract the key concepts and create structured visual notes for a whiteboard canvas.

RULES:
1. Extract 2-6 distinct nodes per transcript segment (don't over-extract)
2. Each node needs:
   - "id": unique string (use short meaningful slugs like "neural-nets", "backprop-algo")
   - "title": concise 2-5 word heading
   - "content": ONE clear sentence explaining the concept  
   - "category": one of "topic" (main themes), "concept" (ideas/definitions), "example" (specific instances), "question" (open questions), "action" (next steps/tasks)
   - "x" and "y": canvas coordinates for visual layout

3. POSITIONING RULES (critical for visual flow):
   - Canvas is 1200x800
   - Use OFFSET values to avoid overlapping existing nodes
   - Main topics go center-ish, supporting concepts branch outward
   - Space nodes at least 250px apart horizontally, 180px vertically
   - Create visual clusters — related nodes closer together
   - x range: {x_start} to {x_end}, y range: {y_start} to {y_end}

4. Create connections between related nodes:
   - "from_id", "to_id": reference node IDs
   - "label": short verb phrase (e.g., "enables", "requires", "leads to")
   - Only connect nodes that have a genuine relationship
   - Also connect to EXISTING node IDs if relevant: {existing_ids}

5. Be strategic and concise like Wispr Flow — no fluff, just sharp insights

EXISTING TOPICS (don't duplicate): {existing_topics}

Return ONLY valid JSON:
{{"nodes": [...], "connections": [...]}}"""


VOICE_RESPONSE_PROMPT = """You are a friendly, concise whiteboard assistant. The user just spoke about something and you've organized their thoughts into visual notes on a whiteboard.

Your job: respond conversationally in 1-3 SHORT sentences. Acknowledge what they said, briefly summarize what you captured on the board, and optionally ask a follow-up question to keep the conversation going.

RULES:
- Be warm but concise — like a smart study buddy
- Reference the specific topics/concepts you captured
- Don't be generic or robotic
- Keep it under 40 words
- Don't start with "I've" or "I have" — vary your openings
- Sound natural, like you're in a real conversation

The notes you just created on the board:
{notes_summary}

The cleaned version of what they said:
{cleaned_text}"""


# ── Routes ──────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Whiteboard Assistant API"}


@api_router.get("/config")
async def get_config():
    return {
        "elevenlabs_agent_id": os.environ.get('ELEVENLABS_AGENT_ID', '')
    }


@api_router.post("/process-transcript")
async def process_transcript(request: TranscriptRequest):
    try:
        if not OPENROUTER_API_KEY:
            return {"error": "OpenRouter API key not configured"}

        raw_transcript = request.transcript.strip()
        if not raw_transcript:
            return {"nodes": [], "connections": []}

        # Stage 1: Clean the transcript (Wispr Flow style)
        logger.info(f"Cleaning transcript ({len(raw_transcript)} chars)")
        local_cleaned = clean_transcript(raw_transcript)

        cleaned_messages = [
            {"role": "system", "content": CLEAN_PROMPT},
            {"role": "user", "content": local_cleaned}
        ]
        cleaned_text = await call_openrouter(cleaned_messages)
        logger.info(f"Cleaned transcript: {cleaned_text[:100]}...")

        # Stage 2: Generate structured notes
        row = request.node_count // 3
        x_start = 100 + (request.node_count % 3) * 350
        y_start = 80 + row * 200
        x_end = min(x_start + 800, 1100)
        y_end = min(y_start + 600, 750)

        existing_ids = []
        if request.existing_topics:
            existing_ids = [t.lower().replace(' ', '-') for t in request.existing_topics]

        notes_system = NOTES_PROMPT.format(
            existing_topics=json.dumps(request.existing_topics or []),
            existing_ids=json.dumps(existing_ids),
            x_start=x_start, x_end=x_end,
            y_start=y_start, y_end=y_end
        )

        notes_messages = [
            {"role": "system", "content": notes_system},
            {"role": "user", "content": cleaned_text}
        ]
        notes_response = await call_openrouter(notes_messages)

        # Parse JSON
        response_text = notes_response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        parsed = json.loads(response_text)

        # Stage 3: Generate voice response (AI speaks back)
        notes_summary = ", ".join([n.get("title", "") for n in parsed.get("nodes", [])])
        voice_prompt = VOICE_RESPONSE_PROMPT.format(
            notes_summary=notes_summary,
            cleaned_text=cleaned_text
        )
        try:
            voice_messages = [
                {"role": "system", "content": voice_prompt},
                {"role": "user", "content": "Respond to what I just said."}
            ]
            voice_response = await call_openrouter(voice_messages)
            voice_response = voice_response.strip().strip('"')
        except Exception as ve:
            logger.warning(f"Voice response generation failed: {ve}")
            voice_response = ""

        # Store in session
        await db.sessions.update_one(
            {"id": request.session_id},
            {
                "$push": {
                    "transcript_history": raw_transcript,
                    "nodes": {"$each": parsed.get("nodes", [])},
                    "connections": {"$each": parsed.get("connections", [])}
                }
            },
            upsert=True
        )

        return {
            "nodes": parsed.get("nodes", []),
            "connections": parsed.get("connections", []),
            "cleaned_transcript": cleaned_text,
            "voice_response": voice_response
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response: {e}")
        return {"nodes": [], "connections": [], "error": "Failed to parse notes"}
    except httpx.HTTPStatusError as e:
        logger.error(f"OpenRouter API error: {e.response.status_code} - {e.response.text}")
        return {"nodes": [], "connections": [], "error": f"API error: {e.response.status_code}"}
    except Exception as e:
        logger.error(f"Error processing transcript: {e}")
        return {"nodes": [], "connections": [], "error": str(e)}


@api_router.post("/sessions")
async def create_session(request: SessionCreate):
    session = Session(name=request.name)
    doc = session.model_dump()
    await db.sessions.insert_one(doc)
    stored = await db.sessions.find_one({"id": doc["id"]}, {"_id": 0})
    return stored


@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        return {"error": "Session not found"}
    return session


@api_router.delete("/sessions/{session_id}/nodes")
async def clear_session_nodes(session_id: str):
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"nodes": [], "connections": [], "transcript_history": []}}
    )
    return {"status": "cleared"}


@api_router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Generate speech audio using ElevenLabs TTS (Emma's voice)."""
    if not eleven_client:
        return {"error": "ElevenLabs API key not configured"}

    try:
        text = request.text.strip()
        if not text:
            return {"error": "No text provided"}

        audio_generator = eleven_client.text_to_speech.convert(
            text=text,
            voice_id=ELEVENLABS_VOICE_ID,
            model_id=ELEVENLABS_MODEL,
        )

        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk

        audio_b64 = base64.b64encode(audio_data).decode()

        return {
            "audio": audio_b64,
            "format": "audio/mpeg",
        }

    except Exception as e:
        logger.error(f"TTS error: {e}")
        return {"error": str(e)}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
