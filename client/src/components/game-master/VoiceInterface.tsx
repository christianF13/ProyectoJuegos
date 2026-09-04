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
      {/* GM Response text */}
      {gmText && (
        <div className="w-full bg-night-card border border-night-border rounded-2xl p-5 text-center flex-1 min-h-0 overflow-y-auto flex flex-col">
          <p className="text-xs text-gray-600 tracking-widest mb-2 uppercase shrink-0">Game Master dice</p>
          <p className={`text-lg text-gray-200 leading-relaxed italic flex-1 ${isSpeaking ? 'text-white' : ''}`}>
            "{gmText}"
          </p>
          {isSpeaking && (
            <div className="flex items-center justify-center gap-1 mt-3 shrink-0">
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
      )}

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
