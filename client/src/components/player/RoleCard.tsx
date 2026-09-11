import React from 'react';

interface RoleCardProps {
  roleId: string;
  faction: string;
  privateInfo: Record<string, unknown>;
  playerName: string;
  onAcknowledge?: () => void;
}

const ROLE_CONFIG: Record<string, {
  image: string;
  icon: string;
  name: string;
  glowColor: string;
  borderColor: string;
  instructions: string;
}> = {
  werewolf: {
    image: '/roles/werewolf.jpg',
    icon: '🐺',
    name: 'Hombre Lobo',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    borderColor: 'border-red-600',
    instructions: 'Cada noche, eligen en grupo a un jugador para eliminar.',
  },
  seer: {
    image: '/roles/seer.jpg',
    icon: '🔮',
    name: 'Vidente',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    borderColor: 'border-blue-500',
    instructions: 'Cada noche, elige a un jugador para descubrir si es Lobo o Aldeano.',
  },
  witch: {
    image: '/roles/witch.jpg',
    icon: '🧙‍♀️',
    name: 'Bruja',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    borderColor: 'border-purple-500',
    instructions: 'Tiene poción de Curación (salva) y poción de Veneno (elimina).',
  },
  healer: {
    image: '/roles/healer.jpg',
    icon: '💊',
    name: 'Curandero',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    borderColor: 'border-green-500',
    instructions: 'Cada noche protege a un jugador de morir. No puede repetir el mismo objetivo.',
  },
  caperucita: {
    image: '/roles/caperucita.jpg',
    icon: '🧺',
    name: 'Caperucita Roja',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    borderColor: 'border-rose-600',
    instructions: 'No puede morir mientras el Cazador siga con vida.',
  },
  hunter: {
    image: '/roles/hunter.jpg',
    icon: '🎯',
    name: 'Cazador',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    borderColor: 'border-amber-600',
    instructions: 'Si es eliminado, dispara a un jugador antes de morir, eliminándolo también.',
  },
  cupid: {
    image: '/roles/cupid.jpg',
    icon: '💘',
    name: 'Cupido',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    borderColor: 'border-pink-500',
    instructions: 'Une a dos jugadores. Si uno de los dos muere, el otro muere de tristeza.',
  },
  mayor: {
    image: '/roles/mayor.jpg',
    icon: '👑',
    name: 'Alcalde',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    borderColor: 'border-yellow-500',
    instructions: 'El Alcalde tiene 2 votos en las votaciones durante el día.',
  },
  villager: {
    image: '/roles/villager.jpg',
    icon: '🧑‍🌾',
    name: 'Aldeano',
    glowColor: 'rgba(180, 83, 9, 0.3)',
    borderColor: 'border-amber-700',
    instructions: 'Descubre y elimina a los Hombres Lobo con el resto del pueblo.',
  },
};

export default function RoleCard({ roleId, faction, privateInfo, playerName, onAcknowledge }: RoleCardProps) {
  const config = ROLE_CONFIG[roleId] ?? {
    image: '/roles/villager.jpg',
    icon: '❓',
    name: roleId,
    glowColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'border-gray-600',
    instructions: String(privateInfo?.instructions ?? ''),
  };

  const seerResult = privateInfo?.seerResult as { targetName: string; isWerewolf: boolean } | undefined;
  const teammates = (privateInfo?.teammates as string[]) ?? [];

  return (
    <div className="min-h-screen bg-night flex flex-col items-center justify-center px-4 py-6">
      <p className="text-gray-500 text-xs tracking-widest uppercase mb-1">{playerName}</p>
      <p className="text-xs text-village-gold font-bold tracking-widest uppercase mb-4">TU ROL SECRETO</p>

      {/* Illustrated Role Card */}
      <div 
        className="relative group transition-transform duration-300 hover:scale-[1.02]"
        style={{ filter: `drop-shadow(0 0 25px ${config.glowColor})` }}
      >
        <div className={`overflow-hidden rounded-2xl border-2 ${config.borderColor} shadow-2xl bg-night-card max-w-[270px] sm:max-w-[290px]`}>
          <img
            src={config.image}
            alt={config.name}
            className="w-full h-auto object-contain block"
            loading="eager"
          />
        </div>
      </div>

      {/* Wolf pack info */}
      {roleId === 'werewolf' && teammates.length > 0 && (
        <div className="w-full max-w-[290px] mt-3 bg-red-950/60 border border-red-800 rounded-xl p-3 text-center">
          <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Tus compañeros lobos</p>
          <p className="text-white text-sm font-semibold">{teammates.join(', ')}</p>
        </div>
      )}

      {/* Seer private result (if available) */}
      {seerResult && (
        <div className={`w-full max-w-[290px] mt-3 rounded-xl p-3 text-center border ${
          seerResult.isWerewolf
            ? 'bg-red-950/60 border-red-800'
            : 'bg-green-950/60 border-green-800'
        }`}>
          <p className="text-[11px] text-gray-400 tracking-wider mb-1 uppercase">Resultado de investigación</p>
          <p className="text-base font-bold">
            {seerResult.targetName} es{' '}
            <span className={seerResult.isWerewolf ? 'text-red-400' : 'text-green-400'}>
              {seerResult.isWerewolf ? '🐺 HOMBRE LOBO' : '✅ INOCENTE'}
            </span>
          </p>
        </div>
      )}

      {/* Witch potion status */}
      {roleId === 'witch' && (
        <div className="w-full max-w-[290px] grid grid-cols-2 gap-2 mt-3">
          <div className={`rounded-xl p-2.5 text-center border ${
            privateInfo?.lifePotion === 'used'
              ? 'bg-gray-900/50 border-gray-800 opacity-50'
              : 'bg-green-950/50 border-green-800'
          }`}>
            <p className="text-xl mb-0.5">💊</p>
            <p className="text-[10px] text-gray-400">Poción de Vida</p>
            <p className="text-xs font-bold text-green-400">
              {privateInfo?.lifePotion === 'used' ? 'USADA' : 'DISPONIBLE'}
            </p>
          </div>
          <div className={`rounded-xl p-2.5 text-center border ${
            privateInfo?.deathPotion === 'used'
              ? 'bg-gray-900/50 border-gray-800 opacity-50'
              : 'bg-red-950/50 border-red-800'
          }`}>
            <p className="text-xl mb-0.5">☠️</p>
            <p className="text-[10px] text-gray-400">Poción de Muerte</p>
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
          className="mt-6 px-10 py-3.5 bg-village-gold text-black font-black text-lg rounded-2xl shadow-lg shadow-village-gold/25 hover:scale-105 active:scale-95 transition-all"
        >
          ¡ENTENDIDO!
        </button>
      )}

      <p className="text-[11px] text-gray-600 mt-4 text-center">
        🤫 Mantén tu pantalla oculta de los demás
      </p>
    </div>
  );
}
