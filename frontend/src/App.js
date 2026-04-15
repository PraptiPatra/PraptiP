import { useState, useCallback, useRef, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import WhiteboardCanvas from "@/components/WhiteboardCanvas";
import ConversationPanel from "@/components/ConversationPanel";
import SessionControls from "@/components/SessionControls";
import { ChatCircleDots } from "@phosphor-icons/react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [scenes, setScenes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = { role: "user", content: text, id: crypto.randomUUID() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: text,
        session_id: sessionId,
      });

      const { message, whiteboard_update } = response.data;

      const aiMsg = { role: "assistant", content: message, id: crypto.randomUUID() };
      setMessages((prev) => [...prev, aiMsg]);

      if (whiteboard_update) {
        setScenes((prev) => [
          ...prev,
          { ...whiteboard_update, id: crypto.randomUUID(), timestamp: Date.now() },
        ]);
      }

      // TTS
      if (isVoiceMode && message) {
        try {
          const ttsResponse = await axios.post(`${API}/tts`, { text: message });
          if (ttsResponse.data.audio) {
            const audio = new Audio(`data:audio/mpeg;base64,${ttsResponse.data.audio}`);
            audioRef.current = audio;
            setIsSpeaking(true);
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => setIsSpeaking(false);
            audio.play().catch(() => setIsSpeaking(false));
          }
        } catch (e) {
          console.log("TTS unavailable, text-only mode");
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I encountered an issue. Please try again.",
          id: crypto.randomUUID(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, isVoiceMode]);

  const resetSession = useCallback(async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    try {
      await axios.post(`${API}/session/reset`, { session_id: sessionId });
    } catch (e) {
      // ignore
    }
    setScenes([]);
    setMessages([]);
  }, [sessionId]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const exportBoard = useCallback(() => {
    const svg = document.querySelector("#whiteboard-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whiteboard-session.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="app-container" data-testid="app-container">
      <div className="whiteboard-grid" />

      <WhiteboardCanvas scenes={scenes} />

      {!isSidebarOpen && (
        <button
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen(true)}
          data-testid="open-sidebar-btn"
        >
          <ChatCircleDots size={18} weight="duotone" />
          Chat
        </button>
      )}

      <ConversationPanel
        messages={messages}
        onSendMessage={sendMessage}
        isLoading={isLoading}
        isVoiceMode={isVoiceMode}
        setIsVoiceMode={setIsVoiceMode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isSpeaking={isSpeaking}
        onStopSpeaking={stopSpeaking}
      />

      <SessionControls
        onReset={resetSession}
        isVoiceMode={isVoiceMode}
        onToggleVoice={() => setIsVoiceMode(!isVoiceMode)}
        onExport={exportBoard}
        scenesCount={scenes.length}
      />
    </div>
  );
}

export default App;
