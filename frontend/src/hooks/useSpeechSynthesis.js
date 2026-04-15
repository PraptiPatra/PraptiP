import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export function useElevenLabsTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const audioRef = useRef(null);
  const queueRef = useRef([]);
  const playingRef = useRef(false);

  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      playingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    playingRef.current = true;
    setIsSpeaking(true);
    const audioB64 = queueRef.current.shift();

    const audio = new Audio(`data:audio/mpeg;base64,${audioB64}`);
    audioRef.current = audio;

    audio.onended = () => {
      playNext();
    };
    audio.onerror = () => {
      playNext();
    };

    audio.play().catch(() => {
      playNext();
    });
  }, []);

  const speak = useCallback(async (text) => {
    if (!voiceEnabled || !text) return;

    try {
      const res = await axios.post(`${API}/tts`, { text });
      if (res.data.audio) {
        queueRef.current.push(res.data.audio);
        if (!playingRef.current) {
          playNext();
        }
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  }, [voiceEnabled, playNext]);

  const stop = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      if (prev) {
        // Turning off - stop playback
        stop();
      }
      return !prev;
    });
  }, [stop]);

  return {
    isSpeaking,
    voiceEnabled,
    speak,
    stop,
    toggleVoice,
  };
}
