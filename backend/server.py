from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import json
import uuid
import base64
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# In-memory session store
sessions: Dict[str, Dict] = {}

SYSTEM_PROMPT = """You are a premium AI consultant that helps users think through any problem visually on a whiteboard. You speak naturally and conversationally while selectively drawing the most important parts of the discussion on a whiteboard. Think of yourself as creating a whiteboard animation video in real time.

CRITICAL: You must ALWAYS respond with a valid JSON object in this exact format:
{
  "message": "Your conversational response text here",
  "whiteboard_update": null or a whiteboard command object
}

WHITEBOARD COMMAND FORMAT:
When you want to draw something on the whiteboard, set "whiteboard_update" to:
{
  "scene_type": "one of the types below",
  "data": { scene-specific data }
}

SCENE TYPES:

1. "title" - Opening title for the conversation topic
   data: { "title": "Main Title", "subtitle": "Brief context line", "illustration": "keyword" }

2. "problem_frame" - Frame the core problem or question
   data: { "question": "The key question", "context": "Framing", "illustration": "keyword" }

3. "comparison" - Compare 2-3 options side by side
   data: { "title": "What we're comparing", "illustration": "keyword", "options": [{"name": "Option A", "points": ["detail 1", "detail 2"]}, {"name": "Option B", "points": ["detail 1", "detail 2"]}] }

4. "pros_cons" - List pros and cons of something
   data: { "title": "Topic", "illustration": "keyword", "pros": ["advantage 1"], "cons": ["disadvantage 1"] }

5. "checklist" - Requirements or criteria checklist
   data: { "title": "Criteria", "illustration": "keyword", "items": [{"text": "Requirement 1", "checked": true}, {"text": "Requirement 2", "checked": false}] }

6. "scorecard" - Rate options on criteria (scores 1-10)
   data: { "title": "Evaluation", "criteria": ["Speed", "Cost", "Quality"], "options": [{"name": "Option A", "scores": [8, 6, 9]}, {"name": "Option B", "scores": [6, 9, 7]}] }

7. "recommendation" - Final recommendation with reasoning
   data: { "title": "Our Recommendation", "illustration": "keyword", "recommendation": "Go with Option A", "key_reasons": ["reason 1", "reason 2"] }

8. "notes" - Key facts, preferences, or observations
   data: { "title": "Key Points", "illustration": "keyword", "notes": ["fact 1", "fact 2"] }

9. "process" - Step-by-step process or workflow
   data: { "title": "Process", "illustration": "keyword", "steps": [{"label": "Step 1", "description": "What to do"}] }

ILLUSTRATIONS:
Each scene can optionally include an "illustration" field - a keyword that draws a simple hand-drawn sketch on the whiteboard. Available illustrations:

TECH: laptop, phone, gear, wifi, camera, battery
TRANSPORT: car, plane, bicycle
BUSINESS: chart, money, trophy, crown, diamond
IDEAS: lightbulb, rocket, target, key, shield
PLACES & NATURE: house, globe, tree, mountain, sun
PEOPLE & LIFESTYLE: person, heart, coffee, gift
HEALTH: medical, stethoscope, pill
FOOD: food, pizza, utensils
MUSIC & ARTS: music, headphones, paint
SPORTS: football, dumbbell, bicycle
EDUCATION: book, graduation
ANIMALS: dog, cat
MISC: star, wrench, umbrella, clock

Use illustrations when they genuinely add visual context to the topic:
- Discussing laptops/computers → "laptop"
- Discussing cars/vehicles → "car"
- Discussing mobile apps → "phone"
- Discussing ideas/innovation → "lightbulb"
- Discussing growth/metrics → "chart"
- Discussing budget/finance → "money"
- Discussing startups/launches → "rocket"
- Discussing real estate/home → "house"
- Discussing people/HR → "person"
- Discussing goals/objectives → "target"
- Discussing travel/international → "globe" or "plane"
- Discussing learning/education → "book" or "graduation"
- Discussing health/wellness → "heart" or "medical" or "stethoscope"
- Discussing drinks/lifestyle → "coffee"
- Discussing engineering/tech → "gear"
- Discussing ratings/reviews → "star"
- Discussing food/restaurants → "food" or "pizza" or "utensils"
- Discussing music/audio → "music" or "headphones"
- Discussing sports/fitness → "football" or "dumbbell"
- Discussing security/safety → "shield" or "key"
- Discussing time/scheduling → "clock"
- Discussing weather/rain → "umbrella" or "sun"
- Discussing pets/animals → "dog" or "cat"
- Discussing premium/luxury → "crown" or "diamond"
- Discussing photography → "camera"
- Discussing nature/outdoors → "tree" or "mountain"
- Discussing art/design → "paint"
- Discussing rewards/gifts → "gift" or "trophy"
- Discussing tools/repair → "wrench"
- Discussing connectivity → "wifi"
- Discussing energy/power → "battery"
- Discussing medicine/pharmacy → "pill"

Don't force illustrations on every scene. Use them when a visual sketch genuinely anchors the discussion. The first title scene should almost always have a relevant illustration.

BEHAVIORAL RULES:
- On the FIRST user message, ALWAYS create a "title" scene with a relevant illustration
- Only draw when there's genuinely meaningful visual content to add
- Don't draw for simple acknowledgments or short clarifying questions with no new info
- Build the board progressively - each new scene adds insight
- Keep all text CONCISE - this is a whiteboard, not a document (max 6-8 words per bullet)
- Use comparison/scorecard when the user is choosing between options
- Use recommendation when you have enough info to conclude
- Ask thoughtful questions to understand the user's actual needs
- Be warm, intelligent, and consultative in your responses
- You can handle ANY topic - business, personal decisions, technical choices, planning, etc.
- Prefer drawing after gathering meaningful info, not after every single message
- When you do draw, make it count - the visual should provide clarity the text alone doesn't
"""


class ChatRequest(BaseModel):
    message: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ChatResponse(BaseModel):
    message: str
    whiteboard_update: Optional[Dict[str, Any]] = None
    session_id: str


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"


class SessionResetRequest(BaseModel):
    session_id: str


def get_session(session_id: str) -> Dict:
    if session_id not in sessions:
        sessions[session_id] = {
            "messages": [],
            "scenes": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    return sessions[session_id]


@api_router.get("/")
async def root():
    return {"message": "Whiteboard Agent API"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session = get_session(request.session_id)

    session["messages"].append({
        "role": "user",
        "content": request.message
    })

    llm_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + session["messages"]

    try:
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            response = await http_client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://whiteboard-agent.app",
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": llm_messages,
                    "response_format": {"type": "json_object"},
                    "temperature": 0.7,
                    "max_tokens": 1500,
                }
            )
            response.raise_for_status()
            result = response.json()

        ai_content = result["choices"][0]["message"]["content"]
        parsed = json.loads(ai_content)

        ai_message = parsed.get("message", "I'm thinking about this...")
        whiteboard_update = parsed.get("whiteboard_update")

        session["messages"].append({
            "role": "assistant",
            "content": ai_content
        })

        if whiteboard_update:
            session["scenes"].append(whiteboard_update)

        return ChatResponse(
            message=ai_message,
            whiteboard_update=whiteboard_update,
            session_id=request.session_id
        )

    except httpx.HTTPStatusError as e:
        logger.error(f"OpenRouter API error: {e.response.text}")
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")
    except json.JSONDecodeError:
        logger.warning(f"AI returned non-JSON response: {ai_content[:200]}")
        session["messages"].append({
            "role": "assistant",
            "content": json.dumps({"message": ai_content, "whiteboard_update": None})
        })
        return ChatResponse(
            message=ai_content if isinstance(ai_content, str) else "Let me think about that...",
            whiteboard_update=None,
            session_id=request.session_id
        )
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/tts")
async def text_to_speech(request: TTSRequest):
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="TTS not configured")

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{request.voice_id}",
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": request.text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                }
            )
            response.raise_for_status()
            audio_base64 = base64.b64encode(response.content).decode()
            return {"audio": audio_base64}
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/session/reset")
async def reset_session(request: SessionResetRequest):
    if request.session_id in sessions:
        del sessions[request.session_id]
    return {"status": "reset", "session_id": request.session_id}


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
