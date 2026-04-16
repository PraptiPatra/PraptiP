# Whiteboard Agent - PRD

## Original Problem Statement
Build a premium web app called "Whiteboard Agent" - a voice-first conversational whiteboard where an AI speaks to the user and selectively draws the most important parts of the conversation in real time using pen/marker animation, like whiteboard explainer videos.

## Architecture
- **Backend**: FastAPI + OpenRouter (GPT-4o-mini) for AI + ElevenLabs for TTS
- **Frontend**: React + SVG-based whiteboard canvas + framer-motion animations + Web Speech API for voice
- **Database**: MongoDB (session management in-memory for now)

## User Personas
- Business consultants presenting to clients
- Decision-makers comparing options visually
- Anyone who wants AI-assisted visual thinking

## Core Requirements
- [x] Voice-first input (Web Speech API)
- [x] AI-powered conversation (GPT-4o-mini via OpenRouter)
- [x] Text-to-speech output (ElevenLabs)
- [x] SVG whiteboard canvas with pen animation (framer-motion pathLength)
- [x] 9 scene templates (title, problem_frame, comparison, pros_cons, checklist, scorecard, recommendation, notes, process)
- [x] Glass morphism conversation sidebar
- [x] Session controls (reset, voice toggle, export SVG)
- [x] Progressive whiteboard building
- [x] Hand-drawn aesthetic (Caveat font, rough paths)
- [x] Premium minimal design (off-white background, dot grid, charcoal ink)

## What's Been Implemented (Feb 2026)
- Full backend with /api/chat, /api/tts, /api/session/reset endpoints
- Complete frontend with WhiteboardCanvas, SceneRenderer (9 types), ConversationPanel, SessionControls
- AnimatedElements (AnimatedPath, AnimatedText, AnimatedGroup) with framer-motion
- **PenMarker cursor** that follows animated SVG paths using requestAnimationFrame + getPointAtLength (synced with framer-motion easeInOut)
- **16 hand-drawn SVG illustrations** (laptop, car, phone, lightbulb, chart, money, rocket, house, person, target, globe, book, heart, coffee, gear, star) rendered contextually based on AI decisions
- Rough path generators for hand-drawn aesthetic
- Web Speech API for voice input
- ElevenLabs TTS for voice output
- OpenRouter GPT-4o-mini for AI reasoning + whiteboard commands + illustration selection
- SVG export functionality
- All tests passing (100% backend, 95% frontend)

## Prioritized Backlog
### P0 (Critical)
- All P0 features implemented

### P1 (High)
- Pan/zoom on whiteboard canvas
- Replay drawing animation
- Pen cursor following animated paths
- Session persistence in MongoDB

### P2 (Medium)
- Scene timeline / mini navigator
- Focus mode toggle
- Board snapshot sharing
- Multiple conversation sessions
- Mobile responsive layout

### P3 (Low)
- Custom voice selection
- Board themes (dark mode, colored markers)
- Collaborative real-time sessions
- PDF export
