'use client';
import React, { useState } from 'react';

interface Target {
  id: string;
  name: string;
}

interface VotePanelProps {
  targets: Target[];
  myPlayerId?: string;
  onVote: (targetId: string) => void;
  onTargetSelect?: (targetId: string) => void;
  votePreviews?: Record<string, string>; // playerName -> targetId
  confirmed?: boolean;
  seerVisions?: Array<{ targetId?: string; targetName: string; isWerewolf: boolean }>;
}

export default function VotePanel({ targets, myPlayerId, onVote, onTargetSelect, votePreviews = {}, confirmed, seerVisions = [] }: VotePanelProps) {
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

  const handleTargetSelect = (id: string) => {
    setSelectedTarget(id);
    if (onTargetSelect) onTargetSelect(id);
  };

  const handleVote = () => {
    if (!selectedTarget) return;
    onVote(selectedTarget);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-night flex flex-col px-5 py-8">
      <h2 className="text-xl font-black text-white text-center mb-1">Votación</h2>
      <p className="text-xs text-gray-600 text-center tracking-widest uppercase mb-3">¿A quién eliminas?</p>
      <p className="text-gray-500 text-sm text-center mb-6 leading-relaxed">
        Elige al jugador que crees que es el Hombre Lobo. Puedes ver la intención de voto de los demás.
      </p>

      {seerVisions.length > 0 && (
        <div className="mb-4 p-3 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-center">
          <p className="text-[10px] text-purple-300 font-bold uppercase tracking-widest mb-1.5">🔮 Tus Visiones Anteriores</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {seerVisions.map((v, i) => (
              <span key={i} className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                v.isWerewolf ? 'bg-red-950/80 border-red-500 text-red-300' : 'bg-green-950/80 border-green-500 text-green-300'
              }`}>
                {v.targetName}: {v.isWerewolf ? '🐺 Lobo' : '🛡️ Inocente'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3">
        {targets.map(target => {
          const isSelf = target.id === myPlayerId;
          const vision = seerVisions.find(v => v.targetId === target.id || v.targetName === target.name);
          const previwingPlayers = Object.entries(votePreviews)
            .filter(([_, tId]) => tId === target.id)
            .map(([pName]) => pName);

          return (
            <button
              key={target.id}
              onClick={() => !isSelf && handleTargetSelect(target.id)}
              disabled={isSelf}
              className={`w-full py-5 px-5 rounded-2xl border-2 text-xl font-bold text-center transition-all ${
                isSelf
                  ? 'border-gray-800 bg-gray-900/30 text-gray-600 cursor-default'
                  : selectedTarget === target.id
                  ? 'border-red-500 bg-red-500/15 text-red-300 scale-[1.02] active:scale-95'
                  : 'border-night-border bg-night-card text-white hover:border-red-500/40 active:scale-95'
              }`}
            >
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span>{isSelf ? '👤 ' : selectedTarget === target.id ? '⚔️ ' : ''}{target.name}{isSelf ? ' (Tú)' : ''}</span>
                {vision && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                    vision.isWerewolf ? 'bg-red-600/90 text-white border-red-400' : 'bg-green-600/90 text-white border-green-400'
                  }`}>
                    {vision.isWerewolf ? '🐺 LOBO' : '🛡️ INOCENTE'}
                  </span>
                )}
              </div>
              {previwingPlayers.length > 0 && (
                <div className="text-xs text-red-400 mt-2 font-normal">
                  👀 {previwingPlayers.join(', ')} quiere(n) votar aquí
                </div>
              )}
            </button>
          );
        })}
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
