import React from 'react';

interface WaitingScreenProps {
  phase: string;
  playerName?: string;
  message?: string;
  seerResult?: { targetName: string; isWerewolf: boolean } | null;
  visions?: Array<{ targetName: string; isWerewolf: boolean }>;
}

const PHASE_MESSAGES: Record<string, { icon: string; title: string; subtitle: string }> = {
  lobby: { icon: '🏠', title: 'Sala de Espera', subtitle: 'Esperando a que el Game Master inicie la partida...' },
  night: { icon: '🌙', title: 'Es de Noche', subtitle: 'El pueblo duerme. Otros jugadores están actuando...' },
  day_discussion: { icon: '☀️', title: 'Debate del Pueblo', subtitle: 'Discutan quién creen que es el Hombre Lobo.' },
  day_vote: { icon: '🗳️', title: 'Tiempo de Votar', subtitle: 'Elige en tu pantalla a quién eliminar.' },
  finished: { icon: '🏁', title: 'Partida Terminada', subtitle: 'Gracias por jugar.' },
};

export default function WaitingScreen({ phase, playerName, message, seerResult, visions }: WaitingScreenProps) {
  const config = PHASE_MESSAGES[phase] ?? { icon: '⏳', title: 'Esperando...', subtitle: '' };

  return (
    <div className="min-h-screen bg-night flex flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl mb-4 animate-float">{config.icon}</div>
      <h2 className="text-2xl font-black text-white mb-2">{config.title}</h2>
      <p className="text-gray-400 leading-relaxed max-w-xs text-sm">
        {message || config.subtitle}
      </p>

      {/* Seer vision in waiting screen */}
      {seerResult && (
        <div className={`mt-5 p-4 rounded-2xl border-2 w-full max-w-xs transition-all shadow-xl ${
          seerResult.isWerewolf
            ? 'bg-red-950/80 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.3)]'
            : 'bg-green-950/80 border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.3)]'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xl">🔮</span>
            <p className="text-[10px] text-village-gold font-bold tracking-widest uppercase">Tu Visión Secreta</p>
          </div>
          <p className="text-xl font-black text-white mb-1">{seerResult.targetName}</p>
          <span className={`inline-block text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider ${
            seerResult.isWerewolf ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'
          }`}>
            {seerResult.isWerewolf ? '🐺 ES UN HOMBRE LOBO' : '🛡️ NO ES LOBO (INOCENTE)'}
          </span>
        </div>
      )}

      <div className="mt-8 flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-gray-700 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </div>
      {playerName && (
        <p className="mt-8 text-xs text-gray-700 tracking-widest">{playerName.toUpperCase()}</p>
      )}
    </div>
  );
}
