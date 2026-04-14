# ElevenLabs Voice + Whiteboard Agent (MVP)

This project is a starter web app for the exact experience you described:

- an **ElevenLabs voice agent** speaks your lesson
- a **whiteboard agent** draws in parallel
- drawing appears progressively (stroke/text reveal) so it feels like a pen is teaching live

The app is intentionally simple so you can extend it into production later.

## What this MVP includes

- Node.js + Express backend
- API proxy to ElevenLabs:
  - `GET /api/voices`
  - `POST /api/lesson-audio` (text to speech)
- Frontend with:
  - side-by-side voice controls + whiteboard canvas
  - script editor with timed cue format (`[t=seconds] message`)
  - synchronized animation loop tied to `audio.currentTime`

## Architecture

1. You write a script like:

```txt
[t=0.5] Compound Interest
[t=2.0] Formula: A = P(1 + r/n)^(nt)
[t=4.0] P = Principal
```

2. Frontend parses cue lines and builds timeline events.
3. Backend sends narration text to ElevenLabs and returns MP3.
4. Browser plays MP3 and continuously renders board state based on current audio time.

## Quick start

### 1) Install

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Then fill:

- `ELEVENLABS_API_KEY`
- optionally `ELEVENLABS_VOICE_ID`
- optionally `ELEVENLABS_MODEL_ID`

### 3) Run

```bash
npm run dev
```

Open: `http://localhost:3000`

## Cue format

Each line should start with:

```txt
[t=<seconds>] <text to narrate and draw>
```

Example:

```txt
[t=0.5] The water cycle has four stages
[t=2.2] Evaporation
[t=4.6] Condensation
[t=7.0] Precipitation
[t=9.1] Collection
```

## How to evolve this into a production-grade version

- Replace text-line renderer with richer primitives (shapes, arrows, formulas, diagrams).
- Add an LLM planner that converts topic -> narration + structured whiteboard actions.
- Use ElevenLabs word timestamps (where available) for tighter sync than manual cues.
- Persist lessons in a database.
- Add collaborative mode (teacher can pause/edit board in real time).

## Scripts

- `npm run dev` - run in watch mode
- `npm start` - run once
