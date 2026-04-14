# ElevenLabs Agent + Whiteboard Agent (MVP)

This project uses your ElevenLabs conversational agent for speaking and a synchronized whiteboard experience beside it.

- **Voice side**: embedded ElevenLabs ConvAI widget (`agent-id`)
- **Whiteboard side**: timed cue animation (`[t=seconds] message`) with pen-style progressive drawing
- **Sync model**: click **Start board sync** when your agent starts speaking

## Your configured agent

- Agent ID: `agent_1301kkkm5pjgffdbe8awxav8nwtp`
- Branch ID: `agtbrch_8901kkkm5qevfhjtp05ha011tf6j`

The widget is loaded with your agent ID from backend config. The branch ID is used for optional signed URL creation when your agent requires authorization.

## What this version includes

- Node.js + Express backend
- Config endpoint:
  - `GET /api/config`
- Optional signed URL helper:
  - `GET /api/signed-url` (supports `branch_id`)
- Frontend:
  - ElevenLabs widget embed using your configured `agent-id`
  - whiteboard script editor with timeline cues
  - start/pause/reset board controls
  - elapsed sync clock

## Quick start

### 1) Install

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Defaults already include your agent/branch IDs. Add `ELEVENLABS_API_KEY` if your widget requires signed URL auth.

### 3) Run

```bash
npm run dev
```

Open: `http://localhost:3000`

## How to use

1. Open the page.
2. Start the call in the embedded ElevenLabs widget.
3. Click **Start board sync** at the same time.
4. Whiteboard cues animate in parallel with the spoken explanation.

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
