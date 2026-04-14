# ElevenLabs Live Whiteboard (BoardyBoo-style MVP)

This build focuses on a board-first experience inspired by products like BoardyBoo:

- conversational voice session with your ElevenLabs agent
- live whiteboard scenes that update from agent speech
- progressive hand-drawn style reveal of headers, cards, notes, and links
- optional Groq enhancement for stronger semantic extraction

## What it does now

When you click **Start session**, the app:

1. requests microphone permission
2. starts a live ElevenLabs conversation
3. sends optional seed context to Emma
4. listens to Emma's replies in real time
5. converts each reply into board scene updates:
   - main headline
   - concept cards
   - supporting notes
   - connecting arrows

## Config defaults

- `ELEVENLABS_CONVAI_AGENT_ID=agent_1301kkkm5pjgffdbe8awxav8nwtp`
- `ELEVENLABS_CONVAI_BRANCH_ID=agtbrch_8901kkkm5qevfhjtp05ha011tf6j`

## Local setup

### 1) Install

```bash
npm install
```

### 2) Create env file

```bash
cp .env.example .env
```

### 3) Optional API keys

- For private/signed ElevenLabs sessions:
  - `ELEVENLABS_API_KEY=...`
- For better board semantic quality:
  - `GROQ_API_KEY=...`
  - optional: `GROQ_MODEL=llama-3.3-70b-versatile`

If Groq is missing/unavailable, app uses deterministic heuristic extraction.

### 4) Run

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Usage flow

1. Click **Start session**
2. Speak with Emma
3. Watch whiteboard scenes update as Emma responds
4. Use:
   - **Focus board** (maximize board area)
   - **Toggle transcript** (show/hide live log)
   - **Clear board**
   - **End session**

## API endpoints

- `GET /api/health`
- `GET /api/config`
- `GET /api/signed-url`
- `POST /api/whiteboard-plan` (Groq -> heuristic fallback)

## Troubleshooting

### Session does not start

- verify mic permission is granted
- hard refresh page (`Ctrl+F5`)
- check DevTools console for runtime errors

### Board updates feel generic

- set `GROQ_API_KEY` in `.env`
- restart server
- verify endpoint:

```bash
curl -sS -X POST http://localhost:3000/api/whiteboard-plan \
  -H "Content-Type: application/json" \
  -d '{"text":"Facility 19 uses Jarvis orchestration for portfolio operations."}'
```

Should return `"source":"groq"` when active.

## External requirements to get *very close* to BoardyBoo quality

To replicate that style more faithfully, you would need:

1. **Illustration asset pack**
   - SVG icon sets (business, operations, construction, AI, workforce)
   - hand-drawn marker/pen style assets
2. **Stroke/Path animation library**
   - SVG path reveal support (e.g. GSAP + DrawSVG, Vivus, or custom path animator)
3. **Scene planner model**
   - a dedicated LLM prompt or fine-tuned format that outputs scene blocks, positions, and transitions
4. **Optional media generation backend**
   - if you want image cards or generated doodles beyond static assets
5. **Potential licensing**
   - if using commercial whiteboard illustration packs/fonts

Current version is a strong functional MVP for live speech-to-board mapping, but full BoardyBoo parity needs custom asset design + richer animation pipeline.

## Scripts

- `npm run dev`
- `npm start`
