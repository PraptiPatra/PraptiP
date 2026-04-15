import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Microphone,
  PaperPlaneRight,
  X,
  SpeakerHigh,
  SpeakerSlash,
  Waveform,
} from "@phosphor-icons/react";

export default function ConversationPanel({
  messages,
  onSendMessage,
  isLoading,
  isVoiceMode,
  setIsVoiceMode,
  isOpen,
  onClose,
  isSpeaking,
  onStopSpeaking,
}) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");

        if (event.results[0].isFinal) {
          setInterimText("");
          setIsListening(false);
          onSendMessage(transcript);
        } else {
          setInterimText(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setInterimText("");
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
      };

      recognitionRef.current = recognition;
    }
  }, [onSendMessage]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText("");
    } else {
      if (isSpeaking) onStopSpeaking();
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, isSpeaking, onStopSpeaking]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="sidebar-panel"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          data-testid="conversation-panel"
        >
          {/* Header */}
          <div className="sidebar-header">
            <div>
              <h2
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#18181B",
                  letterSpacing: "-0.02em",
                }}
              >
                Conversation
              </h2>
              <div
                style={{
                  fontSize: 12,
                  color: "#A1A1AA",
                  fontFamily: "Manrope, sans-serif",
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isSpeaking && (
                  <>
                    <Waveform size={12} weight="bold" style={{ color: "#0055FF" }} />
                    <span style={{ color: "#0055FF" }}>Speaking...</span>
                  </>
                )}
                {isListening && (
                  <>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#E63946",
                        display: "inline-block",
                      }}
                      className="animate-gentle-pulse"
                    />
                    <span style={{ color: "#E63946" }}>Listening...</span>
                  </>
                )}
                {isLoading && !isSpeaking && !isListening && (
                  <span>Thinking...</span>
                )}
                {!isSpeaking && !isListening && !isLoading && (
                  <span>{isVoiceMode ? "Voice mode" : "Text mode"}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ctrl-btn"
              data-testid="close-sidebar-btn"
              aria-label="Close sidebar"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Messages */}
          <div className="sidebar-messages" data-testid="messages-area">
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#A1A1AA",
                  fontSize: 14,
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                {isVoiceMode
                  ? "Tap the microphone to start speaking"
                  : "Type a message to begin"}
              </div>
            )}

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                className={msg.role === "user" ? "msg-user" : "msg-ai"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {msg.content}
              </motion.div>
            ))}

            {isLoading && (
              <div className="msg-ai">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </div>
            )}

            {interimText && (
              <div className="msg-user" style={{ opacity: 0.6 }}>
                {interimText}...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="sidebar-input-area" data-testid="input-area">
            {isVoiceMode ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {isSpeaking && (
                  <button
                    onClick={onStopSpeaking}
                    className="ctrl-btn"
                    data-testid="stop-speaking-btn"
                    title="Stop speaking"
                  >
                    <SpeakerSlash size={20} weight="duotone" />
                  </button>
                )}

                <div style={{ position: "relative" }}>
                  {isListening && <span className="voice-btn-ring" />}
                  <button
                    onClick={toggleListening}
                    className={`voice-btn ${isListening ? "voice-btn-listening" : "voice-btn-idle"}`}
                    data-testid="voice-record-btn"
                    disabled={isLoading}
                    aria-label={isListening ? "Stop listening" : "Start listening"}
                  >
                    <Microphone size={24} weight="bold" />
                  </button>
                </div>

                <button
                  onClick={() => setIsVoiceMode(false)}
                  className="ctrl-btn"
                  data-testid="switch-to-text-btn"
                  title="Switch to text"
                  style={{ fontSize: 12, fontFamily: "Manrope", color: "#A1A1AA" }}
                >
                  Aa
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ position: "relative" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="chat-input"
                  data-testid="text-input"
                  disabled={isLoading}
                  autoFocus
                />
                <div style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => setIsVoiceMode(true)}
                    className="ctrl-btn"
                    data-testid="switch-to-voice-btn"
                    title="Switch to voice"
                    style={{ width: 34, height: 34 }}
                  >
                    <Microphone size={16} weight="bold" />
                  </button>
                  <button
                    type="submit"
                    className="ctrl-btn"
                    data-testid="send-message-btn"
                    disabled={!inputText.trim() || isLoading}
                    style={{
                      width: 34,
                      height: 34,
                      color: inputText.trim() ? "#0055FF" : "#A1A1AA",
                    }}
                  >
                    <PaperPlaneRight size={16} weight="bold" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
