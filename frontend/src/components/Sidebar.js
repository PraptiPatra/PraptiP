import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Settings, Send, Loader2, Trash2, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';

export default function Sidebar({
  agentId,
  setAgentId,
  isConnected,
  onConnect,
  isListening,
  onToggleListening,
  transcript,
  interimTranscript,
  onProcessTranscript,
  isProcessing,
  onClearTranscript,
  transcriptHistory,
  speechSupported,
}) {
  const [localAgentId, setLocalAgentId] = useState(agentId || '');
  const [showConfig, setShowConfig] = useState(!isConnected);
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimTranscript, transcriptHistory]);

  const handleConnect = () => {
    if (localAgentId.trim()) {
      setAgentId(localAgentId.trim());
      onConnect(localAgentId.trim());
      setShowConfig(false);
    }
  };

  return (
    <div data-testid="sidebar" className="w-80 lg:w-96 h-full flex flex-col bg-white border-r border-zinc-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-xl font-bold tracking-tight text-zinc-900"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Whiteboard
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-[0.15em]">
              Voice-Powered Notes
            </p>
          </div>
          <button
            data-testid="toggle-config-btn"
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Agent Config */}
      {showConfig && (
        <div data-testid="agent-config-panel" className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <label className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-zinc-500 block mb-2">
            ElevenLabs Agent ID
          </label>
          <div className="flex gap-2">
            <input
              data-testid="agent-id-input"
              type="text"
              value={localAgentId}
              onChange={(e) => setLocalAgentId(e.target.value)}
              placeholder="Enter agent ID..."
              className="flex-1 border border-zinc-200 rounded-none px-3 py-2 text-sm font-mono focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none transition-colors bg-white"
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
            <button
              data-testid="connect-agent-btn"
              onClick={handleConnect}
              disabled={!localAgentId.trim()}
              className="bg-zinc-900 text-white rounded-none px-4 py-2 text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isConnected ? 'Update' : 'Connect'}
            </button>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider">Connected</span>
            </div>
          )}
        </div>
      )}

      {/* ElevenLabs Widget Container */}
      {isConnected && (
        <div data-testid="elevenlabs-widget-container" className="px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-zinc-500">
              Voice Agent
            </span>
            <Volume2 size={14} className="text-zinc-400" />
          </div>
          <div
            id="elevenlabs-widget-mount"
            className="border border-zinc-200 bg-zinc-50 rounded-none min-h-[60px] flex items-center justify-center"
          >
            <elevenlabs-convai agent-id={agentId} />
          </div>
        </div>
      )}

      {/* Speech Recognition Controls */}
      <div data-testid="speech-controls" className="px-6 py-4 border-b border-zinc-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-zinc-500">
            Transcript Capture
          </span>
          {isListening && (
            <span className="text-[10px] font-mono text-[#FF3B30] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-pulse" />
              Recording
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            data-testid="toggle-listening-btn"
            onClick={onToggleListening}
            disabled={!speechSupported}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-none text-sm font-semibold transition-all duration-150 ${
              isListening
                ? 'bg-[#FF3B30] text-white pulse-recording'
                : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
            } ${!speechSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            {isListening ? 'Stop' : 'Start Listening'}
          </button>
          <button
            data-testid="process-transcript-btn"
            onClick={onProcessTranscript}
            disabled={isProcessing || !transcript.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#002FA7] text-white rounded-none text-sm font-semibold hover:bg-[#002FA7]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        {!speechSupported && (
          <p className="text-[10px] font-mono text-zinc-400 mt-2">
            Speech recognition not supported in this browser
          </p>
        )}
      </div>

      {/* Transcript Display */}
      <div data-testid="transcript-panel" className="flex-1 flex flex-col min-h-0 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-zinc-500">
            Live Transcript
          </span>
          {transcript && (
            <button
              data-testid="clear-transcript-btn"
              onClick={onClearTranscript}
              className="p-1 text-zinc-300 hover:text-zinc-600 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-3 custom-scrollbar pr-2">
            {/* History */}
            {transcriptHistory.map((entry, idx) => (
              <div
                key={`history-${idx}`}
                className="text-sm font-mono text-zinc-400 pl-2 border-l-2 border-zinc-200"
              >
                {entry}
              </div>
            ))}

            {/* Current transcript */}
            {transcript && (
              <div
                data-testid="current-transcript"
                className="text-sm font-mono text-zinc-900 pl-2 border-l-2 border-[#002FA7]"
              >
                {transcript}
              </div>
            )}

            {/* Interim */}
            {interimTranscript && (
              <div className="text-sm font-mono text-zinc-400 italic pl-2 border-l-2 border-zinc-300">
                {interimTranscript}
              </div>
            )}

            {/* Empty state */}
            {!transcript && !interimTranscript && transcriptHistory.length === 0 && (
              <div className="text-xs font-mono text-zinc-300 text-center py-8">
                Click "Start Listening" and speak to capture your thoughts
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
