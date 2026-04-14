const { Conversation } = window.ElevenLabsClient || {};

const topicInput = document.getElementById("topicInput");
const promptInput = document.getElementById("promptInput");
const startSessionBtn = document.getElementById("startSessionBtn");
const endSessionBtn = document.getElementById("endSessionBtn");
const clearBoardBtn = document.getElementById("clearBoardBtn");
const toggleTranscriptBtn = document.getElementById("toggleTranscriptBtn");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");
const timeLabel = document.getElementById("timeLabel");
const agentMeta = document.getElementById("agentMeta");
const transcriptLog = document.getElementById("transcriptLog");
const transcriptWrap = document.querySelector(".transcript-wrap");

const DEFAULT_TOPIC = "Facility 19 AI Infrastructure";
const DEFAULT_PROMPT =
  "Explain Facility 19's three-layer architecture, then compare one company deployment versus portfolio-wide rollout for Hastings-style businesses.";

const PALETTE = ["#1d4ed8", "#059669", "#dc2626", "#7c3aed", "#0f766e", "#d97706"];
const STOP_WORDS = new Set([
  "the",
  "and",
  "that",
  "with",
  "from",
  "this",
  "into",
  "your",
  "they",
  "their",
  "have",
  "will",
  "what",
  "about",
  "there",
  "were",
  "which",
  "would",
  "could",
  "should",
  "while",
  "where",
  "when",
  "them",
  "then",
  "than",
  "across",
  "inside",
  "being",
  "each",
  "more",
  "most",
  "very",
  "just",
  "only",
  "also",
  "once",
  "does",
  "dont",
  "can't",
  "wont",
  "it's",
  "facility",
  "nineteen",
  "emma",
]);

let activeConversation = null;
let sessionStartedAt = 0;
let elapsedRafId = null;
let agentConfig = null;
let boardModel = createEmptyBoardModel();
let boardRafId = null;
let transcriptVisible = false;

function createEmptyBoardModel() {
  return {
    title: DEFAULT_TOPIC,
    nodes: [],
    edges: [],
    seen: new Set(),
  };
}

function setStatus(message, tone = "normal") {
  statusEl.textContent = message;
  statusEl.className = "status";
  if (tone === "ok") statusEl.classList.add("ok");
  if (tone === "error") statusEl.classList.add("error");
}

function updateControlsForSession(isRunning) {
  startSessionBtn.disabled = isRunning;
  endSessionBtn.disabled = !isRunning;
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  canvas.width = Math.floor(cssWidth * ratio);
  canvas.height = Math.floor(cssHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  renderBoard(performance.now());
}

function roundedRect(x, y, w, h, r = 12) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawArrow(fromX, fromY, toX, toY, color) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const head = 12;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - head * Math.cos(angle - Math.PI / 6), toY - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - head * Math.cos(angle + Math.PI / 6), toY - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderBoard(nowMs = performance.now()) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 42px Inter, system-ui, sans-serif";
  ctx.fillText(boardModel.title || DEFAULT_TOPIC, 54, 64);
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(54, 76);
  ctx.lineTo(Math.min(w - 54, 740), 76);
  ctx.stroke();
  ctx.restore();

  const nodeById = new Map(boardModel.nodes.map((node) => [node.id, node]));

  // light scene guide rails to mimic whiteboard explainer flow
  ctx.save();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  const guideY = [120, 250, 380];
  for (const y of guideY) {
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(w - 48, y);
    ctx.stroke();
  }
  ctx.restore();
  for (const edge of boardModel.edges) {
    const source = nodeById.get(edge.from);
    const target = nodeById.get(edge.to);
    if (!source || !target) continue;
    const sx = source.x + source.w;
    const sy = source.y + source.h / 2;
    const tx = target.x;
    const ty = target.y + target.h / 2;
    drawArrow(sx, sy, tx, ty, "#64748b");
  }

  let stillAnimating = false;
  for (const node of boardModel.nodes) {
    const introMs = node.addedAt ? nowMs - node.addedAt : 9_999;
    const progress = Math.max(0, Math.min(1, introMs / 550));
    if (progress < 1) stillAnimating = true;
    const alpha = 0.2 + progress * 0.8;
    const revealChars = Math.max(1, Math.floor(node.label.length * progress));
    const visibleText = node.label.slice(0, revealChars);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 3;
    roundedRect(node.x, node.y, node.w, node.h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = node.color;
    ctx.font = "700 28px Inter, system-ui, sans-serif";
    ctx.fillText(visibleText, node.x + 16, node.y + 42);

    if (node.subtext) {
      const subChars = Math.max(0, Math.floor(node.subtext.length * Math.max(0, progress - 0.25) / 0.75));
      const visibleSub = node.subtext.slice(0, subChars);
      ctx.fillStyle = "#334155";
      ctx.font = "500 18px Inter, system-ui, sans-serif";
      ctx.fillText(visibleSub, node.x + 16, node.y + 70);
    }
    ctx.restore();
  }

  if (stillAnimating) {
    if (!boardRafId) {
      boardRafId = requestAnimationFrame((t) => {
        boardRafId = null;
        renderBoard(t);
      });
    }
  }
}

function updateElapsedClock() {
  if (!sessionStartedAt) {
    timeLabel.textContent = "0.00s";
    return;
  }
  const elapsed = (performance.now() - sessionStartedAt) / 1000;
  timeLabel.textContent = `${elapsed.toFixed(2)}s`;
  if (activeConversation) {
    requestAnimationFrame(updateElapsedClock);
  }
}

function wrapTextLines(text, maxLen = 36) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxLen) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function normalizeWord(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractKeyPhrases(text) {
  const sentences = text
    .split(/[.!?]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);

  const phrases = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    const keyword = words.find((word) => {
      const normalized = normalizeWord(word);
      return normalized.length > 4 && !STOP_WORDS.has(normalized);
    });
    if (!keyword) continue;
    phrases.push({
      title: keyword.replace(/[^a-z0-9]/gi, ""),
      detail: sentence,
    });
  }

  return phrases.slice(0, 3);
}

function nextNodePosition(index) {
  const baseX = 64;
  const baseY = 128;
  const colWidth = 420;
  const rowHeight = 118;
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: baseX + col * colWidth,
    y: baseY + row * rowHeight,
  };
}

function addConceptNode(concept, sourceText) {
  const key = concept.title.toLowerCase();
  if (!key || boardModel.seen.has(key)) return;
  boardModel.seen.add(key);

  const index = boardModel.nodes.length;
  const pos = nextNodePosition(index);
  const node = {
    id: `node-${index + 1}`,
    label: concept.title,
    subtext: wrapTextLines(sourceText, 40)[0] || "",
    color: PALETTE[index % PALETTE.length],
    x: pos.x,
    y: pos.y,
    w: 360,
    h: 86,
    addedAt: performance.now(),
  };
  boardModel.nodes.push(node);

  if (index > 0) {
    const prev = boardModel.nodes[index - 1];
    boardModel.edges.push({ from: prev.id, to: node.id });
  }
}

function appendTranscript(role, text) {
  if (!transcriptLog) return;
  const line = document.createElement("div");
  line.innerHTML = `<strong>${role}:</strong> ${text}`;
  transcriptLog.appendChild(line);
  transcriptLog.scrollTop = transcriptLog.scrollHeight;
}

function setTranscriptVisibility(show) {
  transcriptVisible = show;
  if (transcriptWrap) {
    transcriptWrap.classList.toggle("is-hidden", !show);
  }
  if (toggleTranscriptBtn) {
    toggleTranscriptBtn.textContent = show ? "Hide transcript" : "Show transcript";
  }
}

function absorbAgentText(text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  appendTranscript("Emma", clean);
  const phrases = extractKeyPhrases(clean);
  for (const phrase of phrases) {
    addConceptNode(phrase, phrase.detail);
  }
  renderBoard(performance.now());
}

async function trySemanticEnhance(rawText) {
  try {
    const response = await fetch("/api/whiteboard-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: rawText,
      }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    const concepts = Array.isArray(payload.concepts) ? payload.concepts : [];
    for (const item of concepts.slice(0, 4)) {
      if (!item?.label) continue;
      addConceptNode(
        { title: String(item.label).slice(0, 30) },
        String(item.label).slice(0, 120)
      );
    }

    const byLabel = new Map(
      boardModel.nodes.map((node) => [node.label.toLowerCase(), node.id])
    );
    const edges = Array.isArray(payload.edges) ? payload.edges : [];
    for (const edge of edges.slice(0, 8)) {
      const fromId = byLabel.get(String(edge.from || "").toLowerCase());
      const toId = byLabel.get(String(edge.to || "").toLowerCase());
      if (!fromId || !toId || fromId === toId) continue;
      const exists = boardModel.edges.some(
        (current) => current.from === fromId && current.to === toId
      );
      if (!exists) {
        boardModel.edges.push({ from: fromId, to: toId });
      }
    }
    renderBoard(performance.now());
  } catch {
    // Best-effort enhancement; fallback extraction already handled.
  }
}

async function loadConfig() {
  const response = await fetch("/api/config");
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Unable to load app configuration.");
  }
  return payload;
}

async function buildSessionOptions(config) {
  const options = {
    agentId: config.agentId,
    onConnect: ({ conversationId }) => {
      setStatus(`Connected to Emma (${conversationId}). Ask your question now.`, "ok");
    },
    onDisconnect: () => {
      setStatus("Conversation ended.", "normal");
      activeConversation = null;
      updateControlsForSession(false);
      sessionStartedAt = 0;
      timeLabel.textContent = "0.00s";
    },
    onError: (message) => {
      setStatus(`Conversation error: ${message}`, "error");
    },
    onMessage: (message) => {
      if (!message?.message) return;
      if (message.role === "agent") {
        absorbAgentText(message.message);
        trySemanticEnhance(message.message);
      } else if (message.role === "user") {
        appendTranscript("You", message.message);
      }
    },
  };

  try {
    const signed = await fetch("/api/signed-url");
    if (signed.ok) {
      const payload = await signed.json();
      if (payload.signedUrl) {
        return {
          signedUrl: payload.signedUrl,
          ...options,
        };
      }
    }
  } catch {
    // Public agent mode fallback below.
  }
  return options;
}

function resetBoardModel() {
  boardModel = createEmptyBoardModel();
  boardModel.title = topicInput.value.trim() || DEFAULT_TOPIC;
  renderBoard(performance.now());
}

async function startSession() {
  if (activeConversation) return;
  startSessionBtn.disabled = true;
  setStatus("Starting interactive session...", "normal");

  try {
    if (!Conversation || typeof Conversation.startSession !== "function") {
      throw new Error(
        "ElevenLabs SDK failed to load. Refresh the page and try again."
      );
    }

    agentConfig = await loadConfig();
    if (!agentConfig.agentId) {
      throw new Error("Agent ID is missing in server configuration.");
    }
    agentMeta.textContent = agentConfig.branchId
      ? `Using agent ${agentConfig.agentId} (branch ${agentConfig.branchId})`
      : `Using agent ${agentConfig.agentId}`;

    boardModel.title = topicInput.value.trim() || DEFAULT_TOPIC;
    renderBoard(performance.now());

    await navigator.mediaDevices.getUserMedia({ audio: true });
    const options = await buildSessionOptions(agentConfig);
    activeConversation = await Conversation.startSession(options);
    sessionStartedAt = performance.now();
    updateElapsedClock();
    updateControlsForSession(true);

    const kickoff = promptInput.value.trim();
    if (kickoff) {
      appendTranscript("You", kickoff);
      activeConversation.sendUserMessage(kickoff);
    }
    setStatus("Session live. Emma is speaking, and whiteboard is adapting in real time.", "ok");
  } catch (error) {
    activeConversation = null;
    updateControlsForSession(false);
    setStatus(`Unable to start session: ${error.message}`, "error");
  } finally {
    startSessionBtn.disabled = false;
  }
}

async function endSession() {
  if (!activeConversation) return;
  try {
    await activeConversation.endSession();
  } catch (error) {
    setStatus(`Could not end session cleanly: ${error.message}`, "error");
  } finally {
    activeConversation = null;
    updateControlsForSession(false);
    sessionStartedAt = 0;
    timeLabel.textContent = "0.00s";
  }
}

function bootstrap() {
  topicInput.value = DEFAULT_TOPIC;
  promptInput.value = DEFAULT_PROMPT;
  resetBoardModel();
  updateControlsForSession(false);
  setStatus("Ready. Click Start session to launch Emma + adaptive whiteboard.", "ok");
  startSessionBtn.addEventListener("click", startSession);
  endSessionBtn.addEventListener("click", endSession);
  if (toggleTranscriptBtn) {
    toggleTranscriptBtn.addEventListener("click", () => {
      setTranscriptVisibility(!transcriptVisible);
    });
  }
  clearBoardBtn.addEventListener("click", () => {
    resetBoardModel();
    setStatus("Whiteboard cleared. It will repopulate from live agent speech.", "normal");
  });
  setTranscriptVisibility(false);
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}

bootstrap();
