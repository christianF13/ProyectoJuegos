import React from 'react';

interface PhaseDisplayProps {
  phase: string;
  round: number;
  announcement?: string;
}

const PHASE_CONFIG: Record<string, { icon: string; label: string; color: string; glow: string }> = {
  lobby: { icon: '🏠', label: 'Sala de Espera', color: 'text-gray-400', glow: 'rgba(156,163,175,0.1)' },
  night: { icon: '🌙', label: 'NOCHE', color: 'text-blue-300', glow: 'rgba(147,197,253,0.15)' },
  day_discussion: { icon: '☀️', label: 'DÍA · DEBATE', color: 'text-yellow-300', glow: 'rgba(253,224,71,0.15)' },
  day_vote: { icon: '🗳️', label: 'DÍA · VOTACIÓN', color: 'text-orange-300', glow: 'rgba(253,186,116,0.15)' },
  finished: { icon: '🏆', label: 'FIN DE PARTIDA', color: 'text-village-gold', glow: 'rgba(201,162,39,0.2)' },
};

export default function PhaseDisplay({ phase, round, announcement }: PhaseDisplayProps) {
  const config = PHASE_CONFIG[phase] ?? { icon: '⚡', label: phase.toUpperCase(), color: 'text-white', glow: 'rgba(255,255,255,0.1)' };

  return (
    <div className="phase-enter flex flex-col items-center gap-3 text-center">
      <div
        className="text-8xl mb-2 transition-all duration-700"
        style={{ filter: `drop-shadow(0 0 20px ${config.glow})` }}
      >
        {config.icon}
      </div>
      <h2
        className={`text-4xl md:text-5xl font-black tracking-widest ${config.color}`}
        style={{ textShadow: `0 0 30px ${config.glow}` }}
      >
        {config.label}
      </h2>
      {round > 0 && phase !== 'lobby' && phase !== 'finished' && (
        <p className="text-gray-500 text-sm tracking-[0.3em] uppercase">Ronda {round}</p>
      )}
      {announcement && (
        <p className="text-gray-300 text-base max-w-md leading-relaxed mt-2 italic">
          "{announcement}"
        </p>
      )}
    </div>
  );
}
