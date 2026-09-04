'use client';
import React, { useState } from 'react';

interface VoiceInterfaceProps {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  gmText: string;
  onMicClick: () => void;
  onTextSubmit?: (text: string) => void;
}

export default function VoiceInterface({
  isListening,
  isSpeaking,
  transcript,
  gmText,
  onMicClick,
  onTextSubmit,
}: VoiceInterfaceProps) {
  const [inputText, setInputText] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputText.trim() && onTextSubmit) {
      onTextSubmit(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full max-h-full">
      {/* Eldrin Avatar */}
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0 relative">
        <div className={`relative rounded-full overflow-hidden border-4 transition-all duration-500 ease-in-out ${isSpeaking ? 'border-village-gold shadow-[0_0_50px_rgba(234,179,8,0.5)] scale-105' : 'border-gray-800'}`}>
           <img 
             src="/eldrin.jpg" 
             alt="Eldrin the Game Master" 
             className={`w-64 h-64 object-cover ${isSpeaking ? 'brightness-110' : 'brightness-75'}`}
           />
           {isSpeaking && (
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 bg-black/50 px-3 py-2 rounded-full">
               {[...Array(5)].map((_, i) => (
                 <div
                   key={i}
                   className="w-1 bg-village-gold rounded-full animate-pulse"
                   style={{
                     height: `${Math.random() * 16 + 8}px`,
                     animationDelay: `${i * 0.1}s`,
                   }}
                 />
               ))}
             </div>
           )}
        </div>
        <p className="mt-4 text-2xl font-black text-village-gold tracking-wider">ELDRIN</p>
        <p className="text-gray-500 uppercase tracking-widest text-xs">Tu Maestro de Juegos</p>
      </div>

      {/* Mic button */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {isListening && (
            <>
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDelay: '0.5s' }} />
            </>
          )}
          <button
            onClick={onMicClick}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold transition-all duration-300 shadow-lg ${
              isListening
                ? 'bg-red-600 border-2 border-red-400 scale-110 shadow-red-900'
                : isSpeaking
                ? 'bg-village-gold/20 border-2 border-village-gold/50 cursor-default'
                : 'bg-night-card border-2 border-night-border hover:border-village-gold/50 hover:bg-night-border'
            }`}
            disabled={isSpeaking}
          >
            {isListening ? '⏹' : isSpeaking ? '🔊' : '🎙️'}
          </button>
        </div>
        <p className="text-xs text-gray-600 tracking-widest">
          {isListening ? 'ESCUCHANDO...' : isSpeaking ? 'HABLANDO...' : 'PULSA PARA HABLAR'}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <p className="text-sm text-gray-500 italic max-w-sm text-center">
          Tú: "{transcript}"
        </p>
      )}

      {/* Text fallback input */}
      {onTextSubmit && (
        <div className="flex gap-2 w-full max-w-sm">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribir mensaje al GM..."
            className="flex-1 bg-night-card border border-night-border rounded-xl px-4 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-village-gold/50"
          />
          <button
            onClick={() => {
              if (inputText.trim() && onTextSubmit) {
                onTextSubmit(inputText.trim());
                setInputText('');
              }
            }}
            className="px-4 py-2 bg-night-card border border-night-border rounded-xl text-sm hover:border-village-gold/50 transition-colors"
          >
            ↩
          </button>
        </div>
      )}
    </div>
  );
}
