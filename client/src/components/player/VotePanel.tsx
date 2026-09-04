'use client';
import React, { useState } from 'react';

interface Target {
  id: string;
  name: string;
}

interface VotePanelProps {
  targets: Target[];
  onVote: (targetId: string) => void;
  confirmed?: boolean;
}

export default function VotePanel({ targets, onVote, confirmed }: VotePanelProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (confirmed || submitted) {
    return (
      <div className="min-h-screen bg-night flex flex-col items-center justify-center px-5 text-center">
        <div className="text-7xl mb-6">🗳️</div>
        <h2 className="text-3xl font-black text-village-gold mb-3">¡Voto Registrado!</h2>
        <p className="text-gray-400">Esperando a que todos voten...</p>
        <div className="mt-8 flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const handleVote = () => {
    if (!selectedTarget) return;
    onVote(selectedTarget);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-night flex flex-col px-5 py-8">
      <h2 className="text-xl font-black text-white text-center mb-1">Votación</h2>
      <p className="text-xs text-gray-600 text-center tracking-widest uppercase mb-3">¿A quién eliminas?</p>
      <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
        Elige al jugador que crees que es el Hombre Lobo. Tu voto es secreto.
      </p>

      <div className="flex-1 space-y-3">
        {targets.map(target => (
          <button
            key={target.id}
            onClick={() => setSelectedTarget(target.id)}
            className={`w-full py-5 px-5 rounded-2xl border-2 text-xl font-bold text-center transition-all active:scale-95 ${
              selectedTarget === target.id
                ? 'border-red-500 bg-red-500/15 text-red-300 scale-[1.02]'
                : 'border-night-border bg-night-card text-white hover:border-red-500/40'
            }`}
          >
            {selectedTarget === target.id ? '⚔️ ' : ''}{target.name}
          </button>
        ))}
      </div>

      <div className="pt-6">
        <button
          onClick={handleVote}
          disabled={!selectedTarget}
          className="w-full py-5 bg-red-700 hover:bg-red-600 text-white text-2xl font-black rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-red-900/40"
        >
          VOTAR
        </button>
      </div>
    </div>
  );
}
