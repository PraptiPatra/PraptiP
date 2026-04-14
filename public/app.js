const topicInput = document.getElementById("topicInput");
const scriptInput = document.getElementById("scriptInput");
const startSessionBtn = document.getElementById("startSessionBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");
const timeLabel = document.getElementById("timeLabel");
const convaiWidget = document.getElementById("convaiWidget");
const agentMeta = document.getElementById("agentMeta");

const DEFAULT_SCRIPT = `[t=0.5] Compound Interest
[t=2.0] Formula: A = P(1 + r/n)^(nt)
[t=4.0] P = Principal (starting money)
[t=6.0] r = Annual interest rate
[t=8.0] t = Time in years
[t=10.0] Interest earns interest over time`;

const defaultTopic =
  "Explain the basics of compound interest and how principal, rate, and time affect final amount.";

const PALETTE = ["#0f172a", "#1d4ed8", "#16a34a", "#dc2626", "#7c3aed", "#0f766e"];

let boardTimeline = [];

let animationFrame = null;
let isTimelineRunning = false;
let timelineStartPerf = 0;
let timelineOffsetSeconds = 0;
let widgetConfigured = false;

function setStatus(message, tone = "normal") {
  statusEl.textContent = message;
  statusEl.className = "status";
  if (tone === "ok") statusEl.classList.add("ok");
  if (tone === "error") statusEl.classList.add("error");
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  canvas.width = Math.floor(cssWidth * ratio);
  canvas.height = Math.floor(cssHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  renderBoard(getTimelineSeconds());
}

function clearCanvas() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}

function lineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    total += Math.hypot(dx, dy);
  }
  return total;
}

function strokeUntil(points, progress) {
  if (points.length < 2 || progress <= 0) return;
  const total = lineLength(points);
  const target = total * Math.max(0, Math.min(1, progress));
  let traversed = 0;

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const segment = Math.hypot(next[0] - prev[0], next[1] - prev[1]);

    if (traversed + segment <= target) {
      ctx.lineTo(next[0], next[1]);
      traversed += segment;
      continue;
    }

    const remaining = target - traversed;
    const ratio = segment === 0 ? 0 : remaining / segment;
    const x = prev[0] + (next[0] - prev[0]) * ratio;
    const y = prev[1] + (next[1] - prev[1]) * ratio;
    ctx.lineTo(x, y);
    break;
  }

  ctx.stroke();
}

function drawTextProgress(event, progress) {
  const visibleCount = Math.floor(event.text.length * progress);
  const text = event.text.slice(0, visibleCount);
  ctx.save();
  ctx.fillStyle = event.color || "#0f172a";
  ctx.font = `600 ${event.size || 24}px Inter, system-ui, sans-serif`;
  ctx.fillText(text, event.x, event.y);
  ctx.restore();
}

function drawStrokeProgress(event, progress) {
  ctx.save();
  ctx.strokeStyle = event.color || "#111827";
  ctx.lineWidth = event.width || 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokeUntil(event.points || [], progress);
  ctx.restore();
}

function renderBoard(currentTime) {
  clearCanvas();
  if (timeLabel) {
    timeLabel.textContent = `${currentTime.toFixed(2)}s`;
  }
  boardTimeline.forEach((event) => {
    if (currentTime < event.start) return;
    const progress = event.duration
      ? (currentTime - event.start) / event.duration
      : 1;
    const clamped = Math.max(0, Math.min(1, progress));

    if (event.type === "stroke") drawStrokeProgress(event, clamped);
    if (event.type === "text") drawTextProgress(event, clamped);
  });
}

function startRenderLoop() {
  cancelAnimationFrame(animationFrame);
  const tick = () => {
    renderBoard(getTimelineSeconds());
    if (isTimelineRunning) {
      animationFrame = requestAnimationFrame(tick);
    }
  };
  animationFrame = requestAnimationFrame(tick);
}

function parseCueScript(script) {
  const lines = script.split("\n");
  const cueRegex = /^\[t=(\d+(?:\.\d+)?)\]\s*(.+)$/i;
  const cues = [];
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const match = trimmed.match(cueRegex);
    if (!match) return;
    cues.push({ at: Number(match[1]), text: match[2] });
  });
  return cues;
}

function buildStrokeForCue(index) {
  const baseY = 140 + index * 72;
  const width = canvas.clientWidth || 1000;
  const left = Math.max(60, width * 0.08);
  const right = Math.min(width - 90, width * 0.92);
  return [
    [left, baseY + 10],
    [right, baseY + 10],
  ];
}

function timelineFromCues(cues, topic) {
  const timeline = [];
  const safeTopic = topic?.trim() || "Topic";
  timeline.push({
    type: "text",
    start: 0.2,
    duration: 1.2,
    text: safeTopic,
    x: 70,
    y: 70,
    size: 40,
    color: "#0f172a",
  });

  timeline.push({
    type: "stroke",
    start: 0.25,
    duration: 1.1,
    points: [
      [60, 85],
      [Math.max(360, (canvas.clientWidth || 1100) * 0.62), 85],
    ],
    color: "#111827",
    width: 4,
  });

  const safeCues = cues
    .slice(0, 8)
    .sort((a, b) => a.at - b.at)
    .map((cue, index) => ({ ...cue, index }));

  safeCues.forEach((cue) => {
    const baseStart = Math.max(0, cue.at);
    timeline.push({
      type: "stroke",
      start: baseStart,
      duration: 0.8,
      points: buildStrokeForCue(cue.index),
      color: PALETTE[cue.index % PALETTE.length],
      width: 3,
    });

    timeline.push({
      type: "text",
      start: baseStart + 0.15,
      duration: Math.max(1.1, Math.min(2.8, cue.text.length * 0.03)),
      text: cue.text,
      x: 80,
      y: 130 + cue.index * 72,
      size: 30,
      color: PALETTE[cue.index % PALETTE.length],
    });
  });

  return timeline;
}

function getTimelineSeconds() {
  if (!isTimelineRunning) return timelineOffsetSeconds;
  const elapsed = (performance.now() - timelineStartPerf) / 1000;
  return timelineOffsetSeconds + elapsed;
}

function startTimeline() {
  if (isTimelineRunning) return;
  isTimelineRunning = true;
  timelineStartPerf = performance.now();
  pauseBtn.disabled = false;
  startRenderLoop();
}

function pauseTimeline() {
  if (!isTimelineRunning) return;
  timelineOffsetSeconds = getTimelineSeconds();
  isTimelineRunning = false;
  cancelAnimationFrame(animationFrame);
}

function startFromZero() {
  timelineOffsetSeconds = 0;
  renderBoard(0);
  startTimeline();
}

function startBoardFromScript() {
  const cues = parseCueScript(scriptInput.value);
  if (!cues.length) {
    setStatus("Add at least one valid [t=seconds] cue line first.", "error");
    return false;
  }
  boardTimeline = timelineFromCues(cues, topicInput.value);
  startFromZero();
  return true;
}

function handlePause() {
  pauseTimeline();
  setStatus("Whiteboard paused.", "normal");
}

function handleReset() {
  pauseTimeline();
  timelineOffsetSeconds = 0;
  cancelAnimationFrame(animationFrame);
  renderBoard(0);
  setStatus("Board reset.", "normal");
  pauseBtn.disabled = true;
}

function wireAgentEvents() {
  if (!convaiWidget) return;

  convaiWidget.addEventListener("elevenlabs-convai:call", () => {
    setStatus("ElevenLabs call started.", "ok");
  });

  convaiWidget.addEventListener("elevenlabs-convai:conversation-ended", () => {
    setStatus("ElevenLabs call ended.", "normal");
  });
}

async function configureConvaiWidget() {
  if (!convaiWidget) return;

  try {
    const response = await fetch("/api/config");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to load agent config.");
    }

    if (!payload.agentId) {
      throw new Error("ELEVENLABS_AGENT_ID is missing on the server.");
    }

    convaiWidget.setAttribute("agent-id", payload.agentId);
    if (agentMeta) {
      agentMeta.textContent = payload.branchId
        ? `Using agent ${payload.agentId} (branch ${payload.branchId})`
        : `Using agent ${payload.agentId}`;
    }

    const signedUrlResponse = await fetch("/api/signed-url");
    if (signedUrlResponse.ok) {
      const signedPayload = await signedUrlResponse.json();
      if (signedPayload.signedUrl) {
        convaiWidget.setAttribute("signed-url", signedPayload.signedUrl);
      }
    }
    widgetConfigured = true;
  } catch (error) {
    if (agentMeta) {
      agentMeta.textContent = `Agent setup warning: ${error.message}`;
    }
    setStatus(`Agent setup warning: ${error.message}`, "error");
  }
}

async function startSession() {
  startSessionBtn.disabled = true;
  setStatus("Configuring agent and whiteboard session...", "normal");

  try {
    if (!widgetConfigured) {
      await configureConvaiWidget();
    }

    const started = startBoardFromScript();
    if (!started) {
      return;
    }

    if (typeof convaiWidget?.startConversation === "function") {
      await convaiWidget.startConversation();
      setStatus("Session started: agent call + whiteboard sync are live.", "ok");
    } else {
      setStatus(
        "Whiteboard started. If the call did not auto-start, click Start inside the agent widget once.",
        "ok"
      );
    }
  } catch (error) {
    setStatus(`Unable to start full session: ${error.message}`, "error");
  } finally {
    startSessionBtn.disabled = false;
  }
}

function bootstrap() {
  topicInput.value = defaultTopic;
  scriptInput.value = DEFAULT_SCRIPT;
  boardTimeline = timelineFromCues(parseCueScript(DEFAULT_SCRIPT), defaultTopic);
  renderBoard(0);
  configureConvaiWidget();
  wireAgentEvents();
  startSessionBtn.addEventListener("click", startSession);
  pauseBtn.addEventListener("click", handlePause);
  resetBtn.addEventListener("click", handleReset);
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}

bootstrap();
