import React from 'react';

interface WaitingScreenProps {
  phase: string;
  playerName?: string;
  message?: string;
}

const PHASE_MESSAGES: Record<string, { icon: string; title: string; subtitle: string }> = {
  lobby: { icon: '🏠', title: 'Sala de Espera', subtitle: 'Esperando a que el Game Master inicie la partida...' },
  night: { icon: '🌙', title: 'Es de Noche', subtitle: 'El pueblo duerme. Otros jugadores están actuando...' },
  day_discussion: { icon: '☀️', title: 'Debate del Pueblo', subtitle: 'Discutan quién creen que es el Hombre Lobo.' },
  day_vote: { icon: '🗳️', title: 'Tiempo de Votar', subtitle: 'Elige en tu pantalla a quién eliminar.' },
  finished: { icon: '🏁', title: 'Partida Terminada', subtitle: 'Gracias por jugar.' },
};

export default function WaitingScreen({ phase, playerName, message }: WaitingScreenProps) {
  const config = PHASE_MESSAGES[phase] ?? { icon: '⏳', title: 'Esperando...', subtitle: '' };

  return (
    <div className="min-h-screen bg-night flex flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl mb-6 animate-float">{config.icon}</div>
      <h2 className="text-2xl font-black text-white mb-3">{config.title}</h2>
      <p className="text-gray-400 leading-relaxed max-w-xs">
        {message || config.subtitle}
      </p>
      <div className="mt-10 flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-gray-700 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </div>
      {playerName && (
        <p className="mt-10 text-xs text-gray-700 tracking-widest">{playerName.toUpperCase()}</p>
      )}
    </div>
  );
}
