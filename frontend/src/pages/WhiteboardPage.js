import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Canvas from '../components/Canvas';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useElevenLabsTTS } from '../hooks/useSpeechSynthesis';
import { Toaster, toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const DEFAULT_AGENT_ID = process.env.REACT_APP_ELEVENLABS_AGENT_ID || '';

export default function WhiteboardPage() {
  const [agentId, setAgentId] = useState(DEFAULT_AGENT_ID);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [cleanedSegments, setCleanedSegments] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [aiResponses, setAiResponses] = useState([]);
  const widgetScriptLoaded = useRef(false);
  const processingLock = useRef(false);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition();

  const {
    isSpeaking,
    voiceEnabled,
    speak,
    stop: stopSpeaking,
    toggleVoice,
  } = useElevenLabsTTS();

  // Create session + auto-connect on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Create session
        const sessionRes = await axios.post(`${API}/sessions`, { name: 'Voice Session' });
        setSessionId(sessionRes.data.id);

        // Fetch config (agent ID)
        if (!DEFAULT_AGENT_ID) {
          try {
            const configRes = await axios.get(`${API}/config`);
            if (configRes.data.elevenlabs_agent_id) {
              setAgentId(configRes.data.elevenlabs_agent_id);
              setIsConnected(true);
            }
          } catch (e) {
            // Config endpoint optional
          }
        } else {
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Init failed:', err);
      }
    };
    init();
  }, []);

  // Load ElevenLabs widget script
  useEffect(() => {
    if (!widgetScriptLoaded.current) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.async = true;
      script.type = 'text/javascript';
      document.body.appendChild(script);
      widgetScriptLoaded.current = true;
    }
  }, []);

  const handleConnect = useCallback((id) => {
    setIsConnected(true);
    toast.success('Agent connected');
  }, []);

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const processText = useCallback(async (text) => {
    if (!text.trim() || !sessionId || processingLock.current) return;

    processingLock.current = true;
    setIsProcessing(true);
    const existingTopics = nodes.map(n => n.title);

    try {
      const res = await axios.post(`${API}/process-transcript`, {
        transcript: text.trim(),
        session_id: sessionId,
        existing_topics: existingTopics,
        node_count: nodes.length,
      });

      if (res.data.error) {
        toast.error(res.data.error);
        return;
      }

      const newNodes = (res.data.nodes || []).map((n, i) => ({
        ...n,
        id: n.id || `node-${Date.now()}-${i}`,
        x: n.x || 150 + ((nodes.length + i) % 4) * 280,
        y: n.y || 80 + Math.floor((nodes.length + i) / 4) * 200,
      }));

      if (newNodes.length > 0) {
        setNodes(prev => [...prev, ...newNodes]);
        setConnections(prev => [...prev, ...(res.data.connections || [])]);
        toast.success(`+${newNodes.length} note${newNodes.length !== 1 ? 's' : ''} added`);
      }

      if (res.data.cleaned_transcript) {
        setCleanedSegments(prev => [...prev, res.data.cleaned_transcript]);
      }

      // AI speaks back about what was drawn
      if (res.data.voice_response) {
        setAiResponses(prev => [...prev, res.data.voice_response]);
        speak(res.data.voice_response);
      }

      setTranscriptHistory(prev => [...prev, text.trim()]);
    } catch (err) {
      console.error('Error processing:', err);
      toast.error('Failed to process transcript');
    } finally {
      setIsProcessing(false);
      processingLock.current = false;
    }
  }, [sessionId, nodes]);

  const handleProcessTranscript = useCallback(async () => {
    if (transcript.trim()) {
      await processText(transcript);
      clearTranscript();
    }
  }, [transcript, processText, clearTranscript]);

  const handleManualSubmit = useCallback(async () => {
    if (manualInput.trim()) {
      await processText(manualInput);
      setManualInput('');
    }
  }, [manualInput, processText]);

  // Auto-process: when user pauses speaking for 4s with enough text
  const autoProcessTimerRef = useRef(null);
  useEffect(() => {
    if (autoProcessTimerRef.current) clearTimeout(autoProcessTimerRef.current);

    if (transcript.length > 80 && !isProcessing && !interimTranscript) {
      autoProcessTimerRef.current = setTimeout(() => {
        handleProcessTranscript();
      }, 4000);
    }
    return () => {
      if (autoProcessTimerRef.current) clearTimeout(autoProcessTimerRef.current);
    };
  }, [transcript, isProcessing, interimTranscript, handleProcessTranscript]);

  const handleUpdateNode = useCallback((nodeId, newPos) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, x: newPos.x, y: newPos.y } : n
    ));
  }, []);

  const handleRemoveNode = useCallback((nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from_id !== nodeId && c.to_id !== nodeId));
  }, []);

  const handleClearAll = useCallback(async () => {
    setNodes([]);
    setConnections([]);
    setTranscriptHistory([]);
    setCleanedSegments([]);
    setAiResponses([]);
    stopSpeaking();
    if (sessionId) {
      try { await axios.delete(`${API}/sessions/${sessionId}/nodes`); } catch (e) {}
    }
    toast.success('Canvas cleared');
  }, [sessionId, stopSpeaking]);

  return (
    <div data-testid="whiteboard-page" className="h-screen flex overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar
        agentId={agentId}
        setAgentId={setAgentId}
        isConnected={isConnected}
        onConnect={handleConnect}
        isListening={isListening}
        onToggleListening={handleToggleListening}
        transcript={transcript}
        interimTranscript={interimTranscript}
        onProcessTranscript={handleProcessTranscript}
        isProcessing={isProcessing}
        onClearTranscript={clearTranscript}
        transcriptHistory={transcriptHistory}
        cleanedSegments={cleanedSegments}
        aiResponses={aiResponses}
        speechSupported={isSupported}
        manualInput={manualInput}
        setManualInput={setManualInput}
        onManualSubmit={handleManualSubmit}
        nodeCount={nodes.length}
        isSpeaking={isSpeaking}
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
        onStopSpeaking={stopSpeaking}
      />
      <Canvas
        nodes={nodes}
        connections={connections}
        onUpdateNode={handleUpdateNode}
        onRemoveNode={handleRemoveNode}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
