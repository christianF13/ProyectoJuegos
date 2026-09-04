import React from 'react';

interface RoleCardProps {
  roleId: string;
  faction: string;
  privateInfo: Record<string, unknown>;
  playerName: string;
  onAcknowledge?: () => void;
}

const ROLE_CONFIG: Record<string, {
  icon: string;
  name: string;
  cardClass: string;
  textColor: string;
  instructions: string;
}> = {
  werewolf: {
    icon: '🐺',
    name: 'Hombre Lobo',
    cardClass: 'wolf-card',
    textColor: 'text-red-300',
    instructions: 'Cada noche, elige a quién atacar junto a tus compañeros lobos. De día, finge ser un aldeano.',
  },
  villager: {
    icon: '🧑‍🌾',
    name: 'Aldeano',
    cardClass: 'village-card',
    textColor: 'text-blue-300',
    instructions: 'Usa tu intuición para descubrir a los Hombres Lobo durante el debate y la votación.',
  },
  seer: {
    icon: '🔮',
    name: 'Vidente',
    cardClass: 'seer-card',
    textColor: 'text-purple-300',
    instructions: 'Cada noche puedes investigar a un jugador para saber si es Lobo o Aldeano. ¡Usa esa información con sabiduría!',
  },
  witch: {
    icon: '🧙‍♀️',
    name: 'Bruja',
    cardClass: 'witch-card',
    textColor: 'text-green-300',
    instructions: 'Tienes dos pociones: una de VIDA (salva a la víctima) y una de MUERTE (elimina a cualquiera). Cada una se usa una sola vez.',
  },
};

export default function RoleCard({ roleId, faction, privateInfo, playerName, onAcknowledge }: RoleCardProps) {
  const config = ROLE_CONFIG[roleId] ?? {
    icon: '❓',
    name: roleId,
    cardClass: 'role-card-base',
    textColor: 'text-white',
    instructions: String(privateInfo?.instructions ?? ''),
  };

  const seerResult = privateInfo?.seerResult as { targetName: string; isWerewolf: boolean } | undefined;

  return (
    <div className="min-h-screen bg-night flex flex-col items-center justify-center px-5 py-8">
      <p className="text-gray-600 text-sm tracking-widest mb-6 uppercase">{playerName}</p>

      {/* Role card */}
      <div className={`w-full max-w-sm ${config.cardClass} rounded-3xl p-8 text-center shadow-2xl mb-6`}>
        <div className="text-8xl mb-4" style={{ filter: 'drop-shadow(0 0 20px currentColor)' }}>
          {config.icon}
        </div>
        <p className="text-xs tracking-[0.4em] text-gray-500 uppercase mb-2">Tu Rol</p>
        <h2 className={`text-4xl font-black ${config.textColor} mb-4`}>
          {config.name}
        </h2>
        <div className="h-px bg-current opacity-20 mb-4" />
        <p className="text-gray-300 text-sm leading-relaxed">
          {config.instructions}
        </p>
      </div>

      {/* Seer private result (if available) */}
      {seerResult && (
        <div className={`w-full max-w-sm rounded-2xl p-5 text-center border ${
          seerResult.isWerewolf
            ? 'bg-red-950/50 border-red-800'
            : 'bg-green-950/50 border-green-800'
        }`}>
          <p className="text-xs text-gray-500 tracking-widest mb-2 uppercase">Resultado de investigación</p>
          <p className="text-xl font-bold">
            {seerResult.targetName} es{' '}
            <span className={seerResult.isWerewolf ? 'text-red-400' : 'text-green-400'}>
              {seerResult.isWerewolf ? '🐺 HOMBRE LOBO' : '✅ INOCENTE'}
            </span>
          </p>
        </div>
      )}

      {/* Witch potion status */}
      {roleId === 'witch' && (
        <div className="w-full max-w-sm grid grid-cols-2 gap-3 mt-3">
          <div className={`rounded-xl p-3 text-center border ${
            privateInfo?.lifePotion === 'used'
              ? 'bg-gray-900/50 border-gray-800 opacity-50'
              : 'bg-green-950/50 border-green-800'
          }`}>
            <p className="text-2xl mb-1">💊</p>
            <p className="text-xs text-gray-400">Poc. Vida</p>
            <p className="text-xs font-bold text-green-400">
              {privateInfo?.lifePotion === 'used' ? 'USADA' : 'DISPONIBLE'}
            </p>
          </div>
          <div className={`rounded-xl p-3 text-center border ${
            privateInfo?.deathPotion === 'used'
              ? 'bg-gray-900/50 border-gray-800 opacity-50'
              : 'bg-red-950/50 border-red-800'
          }`}>
            <p className="text-2xl mb-1">☠️</p>
            <p className="text-xs text-gray-400">Poc. Muerte</p>
            <p className="text-xs font-bold text-red-400">
              {privateInfo?.deathPotion === 'used' ? 'USADA' : 'DISPONIBLE'}
            </p>
          </div>
        </div>
      )}

      {/* Acknowledge Button */}
      {onAcknowledge && (
        <button
          onClick={onAcknowledge}
          className="mt-8 px-10 py-4 bg-village-gold text-black font-black text-xl rounded-2xl shadow-lg shadow-village-gold/20 hover:scale-105 active:scale-95 transition-all"
        >
          ¡ENTENDIDO!
        </button>
      )}

      <p className="text-xs text-gray-700 mt-6 text-center">
        ⚠️ No muestres esta pantalla a nadie
      </p>
    </div>
  );
}
