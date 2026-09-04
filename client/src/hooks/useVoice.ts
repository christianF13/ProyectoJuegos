'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
// Usando Antoni porque es la voz 100% verificada que funcionó con tu API
const ELEVENLABS_VOICE_ID = 'ErXwobaYiN019PkySvjV'; 

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pre-load voices para el fallback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Función para limpiar Markdown y acotaciones teatrales como (con voz grave)
  const cleanTextForSpeech = (text: string) => {
    // Elimina asteriscos, guiones bajos, y todo lo que esté entre paréntesis
    return text.replace(/[*_#]/g, '').replace(/\([^)]*\)/g, '').trim();
  };

  const speakFallback = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
      utterance.lang = 'es-ES';
      utterance.rate = 0.88;
      utterance.pitch = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const preferred = [
        voices.find(v => v.lang === 'es-ES' && v.localService),
        voices.find(v => v.lang === 'es-MX' && v.localService),
        voices.find(v => v.lang.startsWith('es') && v.localService),
      ].find(Boolean);
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };
      window.speechSynthesis.speak(utterance);
    });
  };

  const speak = useCallback(async (text: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    // Detener cualquier audio previo
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    
    // Usar siempre la voz nativa temporalmente para ahorrar cuota de ElevenLabs durante las pruebas
    return speakFallback(text);

    try {
      setIsSpeaking(true);
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY || '',
        },
        body: JSON.stringify({
          text: cleanTextForSpeech(text),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.2,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs error: ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      return new Promise((resolve) => {
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.play();
      });
    } catch (err) {
      console.error('Error usando ElevenLabs, cayendo al fallback:', err);
      setIsSpeaking(false);
      return speakFallback(text);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      alert('Tu navegador no soporta reconocimiento de voz. Por favor usa Chrome o Edge.');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      onResult(text);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      console.error('STT error:', e.error);
      setIsListening(false);
    };
    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { speak, stopSpeaking, startListening, stopListening, isListening, isSpeaking, transcript };
}
