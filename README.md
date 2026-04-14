# ElevenLabs Live Whiteboard (Interactive)

This version upgrades your app from static cue playback to a live, adaptive whiteboard:

- Emma speaks through ElevenLabs conversational session
- whiteboard updates from Emma's actual responses in real time
- concept nodes + arrows are drawn as a progressive concept map
- optional OpenRouter/xAI enhancement can improve concept extraction quality

## Core behavior

When you click **Start session**:

1. browser microphone permission is requested
2. app starts a live ElevenLabs conversation with your configured agent
3. app sends an optional kickoff prompt
4. each `agent` message updates transcript + whiteboard concept map
5. concepts are rendered as animated nodes and linked as the discussion evolves

## Your configured agent defaults

- `ELEVENLABS_CONVAI_AGENT_ID=agent_1301kkkm5pjgffdbe8awxav8nwtp`
- `ELEVENLABS_CONVAI_BRANCH_ID=agtbrch_8901kkkm5qevfhjtp05ha011tf6j`

You can run without API keys for public-agent mode.

## Setup (local)

### 1) Install

```bash
npm install
```

### 2) Create env file

```bash
cp .env.example .env
```

### 3) (Optional) add keys

- For private/signed ElevenLabs sessions:
  - `ELEVENLABS_API_KEY=...`
- For smarter concept extraction via OpenRouter:
  - `OPENROUTER_API_KEY=...`
  - optionally `OPENROUTER_MODEL=openai/gpt-4o-mini`
- Optional xAI/Grok fallback:
  - `XAI_API_KEY=...`
  - optionally `XAI_MODEL=grok-4-0709`

If omitted, app uses heuristic concept extraction fallback.

### 4) Run

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## How to use

1. Enter board title.
2. Optionally enter a seed prompt (first user message to Emma).
3. Click **Start session**.
4. Speak with Emma.
5. Watch the whiteboard build a live concept map from her responses.
6. Click **End session** to stop audio + session.
7. Click **Clear board** to reset the visual map.

## API endpoints

- `GET /api/health` - health check
- `GET /api/config` - returns agent/branch + hasApiKey
- `GET /api/signed-url` - signed URL for authenticated mode (needs ElevenLabs API key)
- `POST /api/whiteboard-plan` - concept extraction service
  - uses OpenRouter first, then xAI, then heuristic fallback
  - falls back to heuristic extraction otherwise

## Troubleshooting

### Session starts but no speech

- confirm browser microphone permission is granted
- verify your agent is public if you are not using API key
- open DevTools console and check conversation errors

### Whiteboard not updating

- ensure transcript is appearing in live log
- if transcript is empty, agent messages are not arriving (session issue)
- if transcript appears but concepts are weak, add OpenRouter key for stronger extraction

### OpenRouter enhancement not used

- verify `OPENROUTER_API_KEY` is set in `.env`
- restart server after env changes
- `POST /api/whiteboard-plan` should return `"source":"openrouter"` when active

### xAI enhancement not used

- verify `XAI_API_KEY` is set in `.env`
- restart server after env changes
- make sure your xAI team has credits/licensing enabled
- `POST /api/whiteboard-plan` should return `"source":"xai"` when active

## Notes on "exactly like video-scribe style"

This implementation now reacts to real conversation content, but it still uses a structured concept-map drawing style rather than hand-sketch video frames.
To reach true "hand with marker" animation quality, next step would be:

- vector stroke library / SVG path sequencing
- layout planner per topic
- optional image/icon generation pipeline

## Scripts

- `npm run dev` - watch mode
- `npm start` - production run
