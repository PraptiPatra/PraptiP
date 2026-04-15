from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class TranscriptRequest(BaseModel):
    transcript: str
    session_id: str
    existing_topics: Optional[List[str]] = []


class NoteNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category: str = "topic"
    x: float = 0
    y: float = 0


class Connection(BaseModel):
    from_id: str
    to_id: str
    label: str = ""


class ProcessedNotes(BaseModel):
    nodes: List[NoteNode]
    connections: List[Connection]


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


SYSTEM_PROMPT = """You are a visual note-taking assistant. When given a transcript of a conversation, you must extract key topics, concepts, and relationships and return them as structured visual notes.

RULES:
1. Extract distinct topics/concepts as separate nodes
2. Each node has a title (short, 2-5 words), content (1-2 sentences explaining the concept), and a category (one of: "topic", "concept", "example", "question", "action")
3. Identify connections between related nodes with a brief label describing the relationship
4. Avoid duplicating topics that already exist (check existing_topics list)
5. Assign x,y coordinates to spread nodes across a canvas (x: 100-900, y: 100-700). Space them out well.
6. Return ONLY valid JSON matching this exact schema:

{
  "nodes": [
    {"id": "unique-id", "title": "Node Title", "content": "Brief explanation", "category": "topic", "x": 200, "y": 150}
  ],
  "connections": [
    {"from_id": "id1", "to_id": "id2", "label": "relates to"}
  ]
}

Return ONLY the JSON, no markdown fences, no explanation."""


@api_router.get("/")
async def root():
    return {"message": "Whiteboard Assistant API"}


@api_router.post("/process-transcript")
async def process_transcript(request: TranscriptRequest):
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            return {"error": "LLM key not configured"}

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"whiteboard-{request.session_id}-{uuid.uuid4()}",
            system_message=SYSTEM_PROMPT
        ).with_model("openai", "gpt-4.1")

        prompt = f"Transcript:\n{request.transcript}\n\nExisting topics (do not duplicate): {json.dumps(request.existing_topics)}"
        user_msg = UserMessage(text=prompt)
        response = await chat.send_message(user_msg)

        # Parse the JSON response
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        parsed = json.loads(response_text)

        # Store in session
        await db.sessions.update_one(
            {"id": request.session_id},
            {
                "$push": {
                    "transcript_history": request.transcript,
                    "nodes": {"$each": parsed.get("nodes", [])},
                    "connections": {"$each": parsed.get("connections", [])}
                }
            },
            upsert=True
        )

        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response: {e}")
        return {"nodes": [], "connections": [], "error": "Failed to parse notes"}
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
