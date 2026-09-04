import React from 'react';

interface Player {
  id: string;
  name: string;
  isAlive: boolean;
  isConnected: boolean;
}

interface PlayerListProps {
  players: Player[];
}

const ROLE_ICONS: Record<string, string> = {
  werewolf: '🐺',
  seer: '🔮',
  witch: '🧙‍♀️',
  villager: '🧑‍🌾',
};

export default function PlayerList({ players }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 text-sm tracking-widest">ESPERANDO JUGADORES...</p>
      </div>
    );
  }

  const alive = players.filter(p => p.isAlive).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 tracking-widest uppercase">Jugadores</span>
        <span className="text-xs text-village-gold">
          {alive}/{players.length} vivos
        </span>
      </div>
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-500 ${
              player.isAlive
                ? 'border-night-border bg-night-card text-white'
                : 'border-transparent bg-transparent text-gray-600'
            }`}
          >
            <span className={`text-lg ${!player.isAlive ? 'grayscale opacity-30' : ''}`}>
              {player.isAlive ? '❤️' : '💀'}
            </span>
            <span
              className={`flex-1 font-medium text-sm ${
                player.isAlive ? 'text-white' : 'text-gray-600 line-through'
              }`}
            >
              {player.name}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                player.isConnected ? 'bg-green-500' : 'bg-gray-700'
              }`}
              title={player.isConnected ? 'Conectado' : 'Desconectado'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
