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

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const XAI_MODEL = process.env.XAI_MODEL || "grok-4-0709";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function getApiKey() {
  return process.env.ELEVENLABS_API_KEY;
}

function buildExtractionPrompt(text) {
  return `
Extract a concise whiteboard concept graph from this spoken response.
Return only JSON with this shape:
{
  "concepts": [{"label":"string","score":0.0}],
  "edges": [{"from":"label","to":"label","relation":"string"}]
}
Rules:
- 3 to 7 concepts max
- short labels (2-5 words)
- edges should connect listed concepts only
- no markdown, no prose

Text:
${text}
`;
}

function normalizePlanResponse(parsed) {
  if (!parsed || !Array.isArray(parsed.concepts)) {
    return null;
  }

  const concepts = parsed.concepts
    .filter((item) => item && typeof item.label === "string")
    .slice(0, 7)
    .map((item, index) => ({
      label: item.label.trim().slice(0, 48),
      score:
        typeof item.score === "number" && Number.isFinite(item.score)
          ? item.score
          : 1 - index * 0.05,
    }));

  const labelSet = new Set(concepts.map((item) => item.label));
  const edges = Array.isArray(parsed.edges)
    ? parsed.edges
        .filter(
          (edge) =>
            edge &&
            typeof edge.from === "string" &&
            typeof edge.to === "string" &&
            labelSet.has(edge.from) &&
            labelSet.has(edge.to) &&
            edge.from !== edge.to
        )
        .slice(0, 10)
        .map((edge) => ({
          from: edge.from,
          to: edge.to,
          relation:
            typeof edge.relation === "string"
              ? edge.relation.slice(0, 28)
              : "relates to",
        }))
    : [];

  return { concepts, edges };
}

function tryParseJsonContent(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = String(content).match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}

async function extractWithOpenRouter(prompt, openRouterKey) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are a strict JSON extraction engine for whiteboard concept mapping.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenRouter request failed: ${details}`);
  }

  const payload = await response.json();
  const content =
    payload?.choices?.[0]?.message?.content || payload?.choices?.[0]?.text || "";
  const parsed = tryParseJsonContent(content);
  const normalized = normalizePlanResponse(parsed);
  if (!normalized) {
    throw new Error("OpenRouter returned invalid JSON shape.");
  }
  return { source: "openrouter", ...normalized };
}

async function extractWithXai(prompt, xaiKey) {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${xaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are a strict JSON extraction engine for whiteboard concept mapping.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`xAI request failed: ${details}`);
  }

  const payload = await response.json();
  const content =
    payload?.choices?.[0]?.message?.content || payload?.choices?.[0]?.text || "";
  const parsed = tryParseJsonContent(content);
  const normalized = normalizePlanResponse(parsed);
  if (!normalized) {
    throw new Error("xAI returned invalid JSON shape.");
  }
  return { source: "xai", ...normalized };
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

app.post("/api/whiteboard-plan", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) {
    return res.status(400).json({ error: "Request must include non-empty `text`." });
  }

  const fallbackKeywords = [
    "facility 19",
    "ai infrastructure",
    "agent network",
    "jarvis orchestration",
    "system integration",
    "workflow automation",
    "operational intelligence",
    "portfolio scaling",
    "vendor coordination",
    "service dispatch",
    "reporting",
    "compliance",
  ];

  const normalized = text.toLowerCase();
  const matched = fallbackKeywords.filter((keyword) =>
    normalized.includes(keyword)
  );

  const fallbackConcepts = (matched.length ? matched : fallbackKeywords.slice(0, 6))
    .slice(0, 6)
    .map((keyword, index) => ({
      label: keyword
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      score: 1 - index * 0.08,
    }));

  const fallbackEdges = [];
  for (let i = 1; i < fallbackConcepts.length; i += 1) {
    fallbackEdges.push({
      from: fallbackConcepts[i - 1].label,
      to: fallbackConcepts[i].label,
      relation: "supports",
    });
  }

  const prompt = buildExtractionPrompt(text);
  const warnings = [];
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;

  if (openRouterKey) {
    try {
      const result = await extractWithOpenRouter(prompt, openRouterKey);
      return res.json(result);
    } catch (error) {
      warnings.push(error.message);
    }
  }

  if (xaiKey) {
    try {
      const result = await extractWithXai(prompt, xaiKey);
      return res.json(result);
    } catch (error) {
      warnings.push(error.message);
    }
  }

  return res.json({
    source: "heuristic",
    warning: warnings.length ? warnings.join(" | ") : undefined,
    concepts: fallbackConcepts,
    edges: fallbackEdges,
  });
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
