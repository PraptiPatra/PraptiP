const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
const DEFAULT_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const DEFAULT_AGENT_ID =
  process.env.ELEVENLABS_CONVAI_AGENT_ID ||
  process.env.ELEVENLABS_AGENT_ID ||
  "agent_1301kkkm5pjgffdbe8awxav8nwtp";
const DEFAULT_BRANCH_ID =
  process.env.ELEVENLABS_CONVAI_BRANCH_ID ||
  process.env.ELEVENLABS_AGENT_BRANCH_ID ||
  "agtbrch_8901kkkm5qevfhjtp05ha011tf6j";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function getApiKey() {
  return process.env.ELEVENLABS_API_KEY;
}

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

app.get("/api/config", (_, res) => {
  res.json({
    agentId: DEFAULT_AGENT_ID,
    branchId: DEFAULT_BRANCH_ID,
    hasApiKey: Boolean(getApiKey()),
  });
});

app.get("/api/signed-url", async (_, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(503).json({
      error:
        "ELEVENLABS_API_KEY is missing. Signed URL requires authenticated API access.",
    });
  }

  try {
    const params = new URLSearchParams({
      agent_id: DEFAULT_AGENT_ID,
    });
    if (DEFAULT_BRANCH_ID) {
      params.set("branch_id", DEFAULT_BRANCH_ID);
    }

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/convai/conversation/get-signed-url?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const details = await response.text();
      return res.status(response.status).json({
        error: "Unable to create signed URL for ConvAI widget.",
        details,
      });
    }

    const payload = await response.json();
    return res.json({ signedUrl: payload.signed_url || "" });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected error while generating signed URL.",
      details: error.message,
    });
  }
});

app.get("/api/voices", async (_, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(503).json({
      error: "ELEVENLABS_API_KEY is not set.",
      voices: [],
    });
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const details = await response.text();
      return res.status(response.status).json({
        error: "Unable to fetch voices from ElevenLabs.",
        details,
      });
    }

    const payload = await response.json();
    const voices = (payload.voices || []).map((voice) => ({
      voice_id: voice.voice_id,
      name: voice.name,
      labels: voice.labels || {},
      preview_url: voice.preview_url || null,
    }));
    return res.json({ voices });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected error while loading voices.",
      details: error.message,
    });
  }
});

app.post("/api/lesson-audio", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(503).json({
      error: "ELEVENLABS_API_KEY is missing. Add it to your .env file.",
    });
  }

  const text = String(req.body?.text || "").trim();
  if (!text) {
    return res.status(400).json({ error: "Request body must include `text`." });
  }

  if (text.length > 5000) {
    return res.status(400).json({
      error: "Text is too long. Keep it below 5000 characters for this demo.",
    });
  }

  const voiceId = String(req.body?.voiceId || DEFAULT_VOICE_ID);
  const modelId = String(req.body?.modelId || DEFAULT_MODEL_ID);
  const voiceSettings = req.body?.voiceSettings || {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.2,
    use_speaker_boost: true,
  };

  try {
    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: voiceSettings,
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text();
      return res.status(response.status).json({
        error: "ElevenLabs rejected the audio generation request.",
        details,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audioBuffer.length));
    res.setHeader("Cache-Control", "no-store");
    return res.send(audioBuffer);
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected error while generating audio.",
      details: error.message,
    });
  }
});

app.get("/*splat", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Voice + whiteboard app running on http://localhost:${port}`);
});
