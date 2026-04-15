# Whiteboard Voice Assistant — PRD

## Problem Statement
Build a whiteboard assistant that integrates with an ElevenLabs conversational AI agent. As the user speaks, the transcript is captured, cleaned (Wispr Flow-style: removing filler words), and processed by an LLM to generate structured visual notes displayed as draggable cards on an infinite canvas with connection lines.

## Architecture
- **Frontend**: React + Tailwind CSS + Framer Motion + ElevenLabs ConvAI Widget
- **Backend**: FastAPI + MongoDB + OpenRouter API (LLM processing)
- **Design**: Swiss/High-Contrast archetype, IBM Plex Sans/Mono, neo-brutalist node cards

## Core Requirements
1. ElevenLabs conversational agent embedded in sidebar (agent_id pre-configured)
2. Speech-to-text via Web Speech API for transcript capture
3. Two-stage LLM processing: clean transcript → generate structured notes
4. Infinite canvas with draggable node cards and SVG connection lines
5. Voice + Type input modes
6. Auto-processing after speech pause

## User Personas
- Knowledge workers who want visual summaries of voice conversations
- Students taking voice-driven study notes
- Teams doing whiteboard brainstorming sessions

## What's Been Implemented (April 15, 2026)
- Full split-pane layout (sidebar + canvas)
- ElevenLabs ConvAI widget integration (auto-connects with agent ID)
- Web Speech API hook for voice capture
- Voice/Type tab toggle for input flexibility
- OpenRouter API integration for LLM (GPT-4.1)
- Wispr Flow-style transcript cleaning (filler removal, grammar fix)
- Structured note generation (nodes with categories: topic, concept, example, question, action)
- Draggable neo-brutalist node cards with framer-motion
- SVG connection lines between related concepts
- Canvas zoom/pan controls, fit-to-content
- Session persistence in MongoDB
- Auto-processing on speech pause (4s timer)
- Node count badge, clear canvas, individual node removal

## Prioritized Backlog
### P0 (Critical)
- (Done) Core voice → visual notes pipeline
- (Done) ElevenLabs widget integration

### P1 (Important)
- Export canvas as image/PDF
- Session history / save & load previous sessions
- Undo/redo for node operations

### P2 (Nice to Have)
- Collaborative whiteboard (multi-user)
- Custom node color themes
- Node grouping / clustering
- Minimap for large canvases
