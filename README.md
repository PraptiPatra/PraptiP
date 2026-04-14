# ElevenLabs Agent + Auto-Start Whiteboard Session

This project gives you the exact experience you requested:

- ElevenLabs conversational agent speaks on the left
- whiteboard auto-draws on the right
- a single **Start session** button configures both and starts in one flow

---

## 1) What this app does

### Speaking side

- Embeds the ElevenLabs ConvAI widget (`<elevenlabs-convai>`).
- Loads your configured `agent_id` from backend config.
- If an API key is present, it also requests a signed URL that includes `branch_id`.

### Whiteboard side

- Reads a timeline script in format:

```txt
[t=seconds] message
```

- Converts each cue into animated board events.
- Draws lines and handwritten-style text progressively to mimic live teaching.

### Session behavior

When you click **Start session**:

1. Agent widget is configured.
2. Whiteboard timeline is built from cues.
3. Whiteboard timer starts from 0.
4. App attempts to trigger widget conversation start programmatically.
5. If browser/widget policy blocks auto-start, you press **Start call** in the widget (one click fallback).

---

## 2) Preconfigured IDs (your agent)

- Agent ID: `agent_1301kkkm5pjgffdbe8awxav8nwtp`
- Branch ID: `agtbrch_8901kkkm5qevfhjtp05ha011tf6j`

These are already set as defaults in server env/config logic.

---

## 3) Complete setup manual (step-by-step)

### Prerequisites

- Node.js 20+ recommended
- npm
- Internet connection (for widget script + ElevenLabs services)

### Step A: install dependencies

```bash
npm install
```

### Step B: configure environment

```bash
cp .env.example .env
```

Open `.env` and set:

- `ELEVENLABS_CONVAI_AGENT_ID` (already defaulted to your agent)
- `ELEVENLABS_CONVAI_BRANCH_ID` (already defaulted to your branch)
- `ELEVENLABS_API_KEY` (optional for public widget, recommended for signed-url/private setups)
- `PORT` (default 3000)

### Step C: run locally

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

### Step D: verify backend config

```bash
curl -sS http://localhost:3000/api/config
```

Expected shape:

```json
{
  "agentId": "agent_...",
  "branchId": "agtbrch_...",
  "hasApiKey": true
}
```

---

## 4) How to run a teaching session

1. Open the app in browser.
2. Edit **Whiteboard title**.
3. Edit **Timed whiteboard script**.
4. Click **Start session**.
5. If call does not auto-start, click **Start call** inside widget once.
6. Whiteboard will continue in sync based on timeline cues.
7. Use **Pause board** and **Reset board** as needed.

---

## 5) Cue authoring guide

### Format

Each line:

```txt
[t=<seconds>] <text to draw>
```

Example:

```txt
[t=0.5] Compound Interest
[t=2.0] Formula: A = P(1 + r/n)^(nt)
[t=4.0] P = Principal
[t=6.0] r = Annual interest rate
[t=8.0] t = Time in years
```

### Best practices for good sync

- Keep first cue around `0.3-0.8`.
- Use increasing times (`0.5`, `2.0`, `4.1`, ...).
- Keep each cue text concise.
- Prefer 5-8 cues for a clean board.

---

## 6) API endpoints reference

- `GET /api/health`
  - basic health check
- `GET /api/config`
  - returns agent/branch config used by frontend
- `GET /api/signed-url`
  - requests ElevenLabs signed URL with `agent_id` + `branch_id`
  - requires `ELEVENLABS_API_KEY`

---

## 7) Troubleshooting manual

### Widget appears but call does not start automatically

This can happen due to browser autoplay/user-gesture restrictions.

Fix:

- Click **Start session** first, then **Start call** inside widget.
- Keep both actions in same browser tab.

### Whiteboard not moving

Check:

- script contains valid cue lines
- cue format exactly uses `[t=number] text`
- first cue is not too late

### “Signed URL” / auth errors

Check:

- `ELEVENLABS_API_KEY` is valid
- agent access settings in ElevenLabs dashboard
- branch ID belongs to the same agent

### Agent not found / wrong voice assistant

Check:

- `ELEVENLABS_CONVAI_AGENT_ID`
- response from `/api/config`
- dashboard agent visibility/public status

---

## 8) Scripts

- `npm run dev` - watch mode
- `npm start` - run once
