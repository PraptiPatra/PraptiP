# ElevenLabs Agent + Whiteboard Agent (MVP)

This project now uses your exact ElevenLabs conversational agent for speaking, with a synchronized whiteboard experience beside it.

- **Voice side**: embedded ElevenLabs ConvAI widget (`agent-id`)
- **Whiteboard side**: timed cue animation (`[t=seconds] message`) with pen-style progressive drawing
- **Sync model**: you click **Start Whiteboard Sync** when the voice starts speaking

## Your configured agent

- Agent ID: `agent_1301kkkm5pjgffdbe8awxav8nwtp`
- Branch ID: `agtbrch_8901kkkm5qevfhjtp05ha011tf6j`

The widget is loaded with your agent ID. Branch ID is shown in UI and used by backend signed URL API support if you later enable authenticated sessions.

## What this version includes

- Node.js + Express backend
- Agent config endpoint:
  - `GET /api/agent-config`
- Optional signed URL helper:
  - `GET /api/convai/signed-url` (supports `branch_id`)
- Frontend:
  - ElevenLabs widget embed with your `agent-id`
  - whiteboard script editor with timeline cues
  - start/pause/reset whiteboard controls
  - visual clock for sync tracking

## Quick start

### 1) Install

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Defaults already include your agent/branch IDs. Add `ELEVENLABS_API_KEY` if you want signed URL support and advanced server-side ConvAI flows.

### 3) Run

```bash
npm run dev
```

Open: `http://localhost:3000`

## How to use

1. Open the page.
2. Start talking with the embedded ElevenLabs agent (left panel).
3. At the same moment, click **Start Whiteboard Sync**.
4. Whiteboard cues animate as if the agent is writing and explaining.

## Cue format

Write lines as:

```txt
[t=<seconds>] <text to draw>
```

Example:

```txt
[t=0.5] The water cycle has four stages
[t=2.2] Evaporation
[t=4.6] Condensation
[t=7.0] Precipitation
[t=9.1] Collection
```

## Scripts

- `npm run dev` - run in watch mode
- `npm start` - run once
