import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Settings, Send, Loader2, Trash2, Volume2, Type, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

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
  cleanedSegments,
  speechSupported,
  manualInput,
  setManualInput,
  onManualSubmit,
  nodeCount,
}) {
  const [localAgentId, setLocalAgentId] = useState(agentId || '');
  const [showConfig, setShowConfig] = useState(!agentId);
  const [activeTab, setActiveTab] = useState('voice'); // 'voice' | 'text'
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    if (agentId && !localAgentId) setLocalAgentId(agentId);
  }, [agentId, localAgentId]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimTranscript, cleanedSegments]);

  const handleConnect = () => {
    if (localAgentId.trim()) {
      setAgentId(localAgentId.trim());
      onConnect(localAgentId.trim());
      setShowConfig(false);
    }
  };

  return (
    <TooltipProvider>
      <div data-testid="sidebar" className="w-80 lg:w-[380px] h-full flex flex-col bg-white border-r border-zinc-200">
        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 leading-none" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  Whiteboard
                </h1>
                <p className="text-[10px] font-mono text-zinc-400 mt-0.5 uppercase tracking-[0.15em]">
                  Voice → Visual Notes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {nodeCount > 0 && (
                <span className="text-[10px] font-mono bg-zinc-100 text-zinc-600 px-2 py-1">{nodeCount} nodes</span>
              )}
              <button
                data-testid="toggle-config-btn"
                onClick={() => setShowConfig(!showConfig)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Agent Config (collapsible) ── */}
        {showConfig && (
          <div data-testid="agent-config-panel" className="px-5 py-3 border-b border-zinc-200 bg-zinc-50/50">
            <label className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-zinc-500 block mb-1.5">
              ElevenLabs Agent ID
            </label>
            <div className="flex gap-1.5">
              <input
                data-testid="agent-id-input"
                type="text"
                value={localAgentId}
                onChange={(e) => setLocalAgentId(e.target.value)}
                placeholder="agent_..."
                className="flex-1 border border-zinc-200 rounded-none px-2.5 py-1.5 text-xs font-mono focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none transition-colors bg-white"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
              <button
                data-testid="connect-agent-btn"
                onClick={handleConnect}
                disabled={!localAgentId.trim()}
                className="bg-zinc-900 text-white rounded-none px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                {isConnected ? 'Update' : 'Connect'}
              </button>
            </div>
            {isConnected && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-wider">Connected</span>
              </div>
            )}
          </div>
        )}

        {/* ── ElevenLabs Widget ── */}
        {isConnected && (
          <div data-testid="elevenlabs-widget-container" className="px-5 py-3 border-b border-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-zinc-500">
                AI Agent
              </span>
              <Volume2 size={12} className="text-zinc-300" />
            </div>
            <div
              id="elevenlabs-widget-mount"
              className="border border-zinc-200 bg-zinc-50/50 rounded-none min-h-[48px] flex items-center justify-center overflow-hidden"
            >
              <elevenlabs-convai agent-id={agentId} />
            </div>
          </div>
        )}

        {/* ── Input Mode Tabs ── */}
        <div className="px-5 pt-3 pb-2 border-b border-zinc-200">
          <div className="flex gap-0">
            <button
              data-testid="voice-tab"
              onClick={() => setActiveTab('voice')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border-2 border-r-0 transition-colors ${
                activeTab === 'voice'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <Mic size={13} />
              Voice
            </button>
            <button
              data-testid="text-tab"
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border-2 transition-colors ${
                activeTab === 'text'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <Type size={13} />
              Type
            </button>
          </div>
        </div>

        {/* ── Voice Controls ── */}
        {activeTab === 'voice' && (
          <div data-testid="speech-controls" className="px-5 py-3 border-b border-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-zinc-500">
                Transcript Capture
              </span>
              {isListening && (
                <span className="text-[10px] font-mono text-[#FF3B30] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-pulse" />
                  REC
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              <button
                data-testid="toggle-listening-btn"
                onClick={onToggleListening}
                disabled={!speechSupported}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-none text-xs font-semibold transition-all duration-150 ${
                  isListening
                    ? 'bg-[#FF3B30] text-white pulse-recording'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                } ${!speechSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                {isListening ? 'Stop' : 'Listen'}
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="process-transcript-btn"
                    onClick={onProcessTranscript}
                    disabled={isProcessing || !transcript.trim()}
                    className="flex items-center justify-center gap-1 px-4 py-2 bg-[#002FA7] text-white rounded-none text-xs font-semibold hover:bg-[#002FA7]/90 transition-colors disabled:opacity-30"
                  >
                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Process & Generate Notes</TooltipContent>
              </Tooltip>
            </div>
            {!speechSupported && (
              <p className="text-[9px] font-mono text-zinc-400 mt-1.5">
                Speech API not supported in this browser. Use Type tab instead.
              </p>
            )}
          </div>
        )}

        {/* ── Manual Text Input ── */}
        {activeTab === 'text' && (
          <div data-testid="text-input-panel" className="px-5 py-3 border-b border-zinc-200">
            <label className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-zinc-500 block mb-1.5">
              Type your thoughts
            </label>
            <div className="flex gap-1.5">
              <textarea
                data-testid="manual-text-input"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Explain a concept, paste notes, or describe what you discussed..."
                className="flex-1 border border-zinc-200 rounded-none px-2.5 py-2 text-xs font-mono focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none transition-colors bg-white resize-none min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onManualSubmit();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] font-mono text-zinc-300">Ctrl+Enter to send</span>
              <button
                data-testid="submit-text-btn"
                onClick={onManualSubmit}
                disabled={isProcessing || !manualInput.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#002FA7] text-white rounded-none text-xs font-semibold hover:bg-[#002FA7]/90 transition-colors disabled:opacity-30"
              >
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Process
              </button>
            </div>
          </div>
        )}

        {/* ── Transcript / Cleaned History ── */}
        <div data-testid="transcript-panel" className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-5 pt-3 pb-1.5">
            <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-zinc-500">
              {cleanedSegments.length > 0 ? 'Processed Notes' : 'Live Transcript'}
            </span>
            {(transcript || cleanedSegments.length > 0) && (
              <button
                data-testid="clear-transcript-btn"
                onClick={onClearTranscript}
                className="p-1 text-zinc-300 hover:text-zinc-600 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
          <ScrollArea className="flex-1 px-5 pb-3">
            <div className="space-y-2.5 custom-scrollbar">
              {/* Cleaned segments (processed) */}
              {cleanedSegments.map((segment, idx) => (
                <div key={`cleaned-${idx}`} className="relative">
                  <div className="text-[10px] font-mono text-[#002FA7] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Sparkles size={9} />
                    Processed #{idx + 1}
                  </div>
                  <div className="text-xs font-mono text-zinc-700 pl-2.5 border-l-2 border-[#002FA7] leading-relaxed">
                    {segment}
                  </div>
                </div>
              ))}

              {/* Raw history (unprocessed display) */}
              {cleanedSegments.length === 0 && transcriptHistory.map((entry, idx) => (
                <div key={`history-${idx}`} className="text-xs font-mono text-zinc-400 pl-2.5 border-l-2 border-zinc-200 leading-relaxed">
                  {entry}
                </div>
              ))}

              {/* Current live transcript */}
              {transcript && (
                <div data-testid="current-transcript" className="text-xs font-mono text-zinc-800 pl-2.5 border-l-2 border-zinc-400 leading-relaxed">
                  {transcript}
                </div>
              )}

              {/* Interim (being spoken) */}
              {interimTranscript && (
                <div className="text-xs font-mono text-zinc-400 italic pl-2.5 border-l-2 border-zinc-200 leading-relaxed animate-pulse">
                  {interimTranscript}
                </div>
              )}

              {/* Empty */}
              {!transcript && !interimTranscript && cleanedSegments.length === 0 && transcriptHistory.length === 0 && (
                <div className="text-[11px] font-mono text-zinc-300 text-center py-10 leading-relaxed">
                  {activeTab === 'voice'
                    ? 'Start listening to capture speech.\nNotes auto-generate on pause.'
                    : 'Type or paste text, then hit Process.\nCtrl+Enter for quick send.'}
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  );
}
