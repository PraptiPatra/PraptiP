import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Canvas from '../components/Canvas';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { Toaster, toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function WhiteboardPage() {
  const [agentId, setAgentId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const widgetScriptLoaded = useRef(false);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition();

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const res = await axios.post(`${API}/sessions`, { name: 'Voice Session' });
        setSessionId(res.data.id);
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    };
    createSession();
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

  const handleProcessTranscript = useCallback(async () => {
    if (!transcript.trim() || !sessionId) return;

    setIsProcessing(true);
    const existingTopics = nodes.map(n => n.title);

    try {
      const res = await axios.post(`${API}/process-transcript`, {
        transcript: transcript.trim(),
        session_id: sessionId,
        existing_topics: existingTopics,
      });

      if (res.data.error) {
        toast.error(res.data.error);
        return;
      }

      const newNodes = (res.data.nodes || []).map((n, i) => ({
        ...n,
        id: n.id || `node-${Date.now()}-${i}`,
        x: n.x || 150 + (i % 3) * 300,
        y: n.y || 100 + Math.floor(i / 3) * 200,
      }));

      setNodes(prev => [...prev, ...newNodes]);
      setConnections(prev => [...prev, ...(res.data.connections || [])]);
      setTranscriptHistory(prev => [...prev, transcript.trim()]);
      clearTranscript();
      toast.success(`Added ${newNodes.length} note${newNodes.length !== 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Error processing:', err);
      toast.error('Failed to process transcript');
    } finally {
      setIsProcessing(false);
    }
  }, [transcript, sessionId, nodes, clearTranscript]);

  // Auto-process when there's enough transcript
  const autoProcessTimerRef = useRef(null);
  useEffect(() => {
    if (transcript.length > 200 && !isProcessing) {
      if (autoProcessTimerRef.current) clearTimeout(autoProcessTimerRef.current);
      autoProcessTimerRef.current = setTimeout(() => {
        handleProcessTranscript();
      }, 3000);
    }
    return () => {
      if (autoProcessTimerRef.current) clearTimeout(autoProcessTimerRef.current);
    };
  }, [transcript, isProcessing, handleProcessTranscript]);

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
    if (sessionId) {
      try {
        await axios.delete(`${API}/sessions/${sessionId}/nodes`);
      } catch (err) {
        console.error('Failed to clear session:', err);
      }
    }
    toast.success('Canvas cleared');
  }, [sessionId]);

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
        speechSupported={isSupported}
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
