const voiceSelect = document.getElementById("voiceSelect");
const topicInput = document.getElementById("topicInput");
const scriptInput = document.getElementById("scriptInput");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");
const audioPlayer = document.getElementById("audioPlayer");
const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");
const timeLabel = document.getElementById("timeLabel");

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
let objectUrl = null;
let loadedVoices = false;

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
  renderBoard(audioPlayer.currentTime || 0);
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
    renderBoard(audioPlayer.currentTime);
    if (!audioPlayer.paused && !audioPlayer.ended) {
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

function plainNarrationFromScript(script) {
  const lines = script
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .map((line) => {
      const match = line.match(/^\[t=(\d+(?:\.\d+)?)\]\s*(.+)$/i);
      return match ? match[2] : line;
    })
    .join(" ");
}

async function loadVoices() {
  try {
    const response = await fetch("/api/voices");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to load voices.");
    }

    voiceSelect.innerHTML = "";
    (payload.voices || []).forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.voice_id;
      option.textContent = voice.name;
      voiceSelect.appendChild(option);
    });

    loadedVoices = true;
    setStatus("Voices loaded from ElevenLabs.", "ok");
  } catch (error) {
    setStatus(`Voice loading warning: ${error.message}`, "error");
  }
}

function revokeAudioUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

async function generateAudio() {
  const script = scriptInput.value.trim();
  if (!script) throw new Error("Narration script cannot be empty.");

  const selectedVoice = voiceSelect.value || undefined;
  const response = await fetch("/api/lesson-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: plainNarrationFromScript(script),
      voiceId: selectedVoice,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Audio generation failed.");
  }

  const blob = await response.blob();
  revokeAudioUrl();
  objectUrl = URL.createObjectURL(blob);
  audioPlayer.src = objectUrl;
}

async function handlePlay() {
  playBtn.disabled = true;
  pauseBtn.disabled = false;
  setStatus("Generating audio with ElevenLabs...", "normal");

  try {
    const cues = parseCueScript(scriptInput.value);
    if (!cues.length) throw new Error("No valid [t=seconds] cue lines found in script.");

    boardTimeline = timelineFromCues(cues, topicInput.value);

    await generateAudio();
    audioPlayer.currentTime = 0;
    renderBoard(0);
    await audioPlayer.play();
    startRenderLoop();
    setStatus("Playing: voice + whiteboard animation are running together.", "ok");
  } catch (error) {
    pauseBtn.disabled = true;
    setStatus(`Unable to start: ${error.message}`, "error");
  } finally {
    playBtn.disabled = false;
  }
}

function handlePause() {
  audioPlayer.pause();
  cancelAnimationFrame(animationFrame);
  setStatus("Playback paused.", "normal");
}

function handleReset() {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  cancelAnimationFrame(animationFrame);
  renderBoard(0);
  setStatus("Board reset.", "normal");
}

function bootstrap() {
  topicInput.value = defaultTopic;
  scriptInput.value = DEFAULT_SCRIPT;
  boardTimeline = timelineFromCues(parseCueScript(DEFAULT_SCRIPT), defaultTopic);
  renderBoard(0);
  loadVoices().finally(() => {
    if (!loadedVoices) {
      setStatus(
        "Set ELEVENLABS_API_KEY in .env and refresh to fetch voices.",
        "error"
      );
    }
  });

  playBtn.addEventListener("click", handlePlay);
  pauseBtn.addEventListener("click", handlePause);
  resetBtn.addEventListener("click", handleReset);
  audioPlayer.addEventListener("seeked", () => renderBoard(audioPlayer.currentTime));
  audioPlayer.addEventListener("pause", () => cancelAnimationFrame(animationFrame));
  audioPlayer.addEventListener("ended", () => {
    cancelAnimationFrame(animationFrame);
    setStatus("Lesson playback complete.", "ok");
  });
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}

bootstrap();
