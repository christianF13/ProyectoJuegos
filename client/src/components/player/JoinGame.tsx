'use client';
import React, { useState } from 'react';

interface JoinGameProps {
  onJoin: (code: string, name: string) => void;
  isLoading?: boolean;
  error?: string;
}

export default function JoinGame({ onJoin, isLoading, error }: JoinGameProps) {
  const [step, setStep] = useState<'code' | 'name'>('code');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const handleCodeSubmit = () => {
    if (code.trim().length >= 4) setStep('name');
  };

  const handleJoin = () => {
    if (name.trim()) onJoin(code.trim().toUpperCase(), name.trim());
  };

  return (
    <div className="min-h-screen bg-night flex flex-col items-center justify-center px-6">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4 animate-float">🎭</div>
        <h1 className="text-3xl font-bold text-village-gold tracking-widest">GAME MASTER</h1>
        <p className="text-gray-600 text-sm mt-1">Únete a la partida</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {step === 'code' ? (
          <>
            <div>
              <label className="block text-xs text-gray-500 tracking-widest uppercase mb-2">
                Código de Sala
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
                placeholder="Ej: ABCD12"
                maxLength={8}
                autoFocus
                className="w-full bg-night-card border-2 border-night-border rounded-2xl px-6 py-5 text-3xl font-black text-center text-white tracking-widest placeholder-gray-700 focus:outline-none focus:border-village-gold/50 transition-colors"
              />
            </div>
            <button
              onClick={handleCodeSubmit}
              disabled={code.trim().length < 4}
              className="w-full py-5 bg-village-gold text-black text-xl font-black rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-village-gold/20"
            >
              SIGUIENTE →
            </button>
          </>
        ) : (
          <>
            <div>
              <button
                onClick={() => setStep('code')}
                className="text-xs text-gray-600 mb-4 flex items-center gap-1 hover:text-gray-400"
              >
                ← Volver
              </button>
              <div className="text-center mb-6">
                <span className="bg-village-gold/10 border border-village-gold/30 rounded-xl px-4 py-2 text-village-gold font-mono text-lg font-bold">
                  {code}
                </span>
              </div>
              <label className="block text-xs text-gray-500 tracking-widest uppercase mb-2">
                Tu Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="¿Cómo te llamas?"
                maxLength={20}
                autoFocus
                className="w-full bg-night-card border-2 border-night-border rounded-2xl px-6 py-5 text-2xl font-semibold text-center text-white placeholder-gray-700 focus:outline-none focus:border-village-gold/50 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 rounded-xl py-3">
                ⚠️ {error}
              </p>
            )}
            <button
              onClick={handleJoin}
              disabled={!name.trim() || isLoading}
              className="w-full py-5 bg-village-gold text-black text-xl font-black rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-village-gold/20"
            >
              {isLoading ? 'ENTRANDO...' : '¡ENTRAR A LA PARTIDA!'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
