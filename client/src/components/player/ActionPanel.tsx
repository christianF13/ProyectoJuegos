'use client';
import React, { useState } from 'react';

interface ActionDef {
  id: string;
  name: string;
  label: string;
  targetType: 'player' | 'none';
  oneTimeUse: boolean;
}

interface Target {
  id: string;
  name: string;
}

interface ActionPanelProps {
  actions: ActionDef[];
  targets: Target[];
  onAction: (actionId: string, targetId: string | null) => void;
  onTargetSelect?: (targetId: string) => void;
  wolfPreviews?: Record<string, string>; // wolfName -> targetId
  confirmed?: boolean;
  privateInfo?: Record<string, unknown>;
  seerResult?: { targetName: string; isWerewolf: boolean } | null;
}

export default function ActionPanel({ actions, targets, onAction, onTargetSelect, wolfPreviews = {}, confirmed, privateInfo, seerResult }: ActionPanelProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isSeer = actions.some(a => a.id === 'seer_see');
  const targetObj = targets.find(t => t.id === selectedTarget);

  if (confirmed || submitted) {
    if (isSeer) {
      if (seerResult) {
        return (
          <div className="min-h-screen bg-night flex flex-col items-center justify-center px-5 text-center animate-fade-in">
            <div className="text-6xl mb-3 animate-bounce">🔮</div>
            <p className="text-xs text-village-gold font-bold tracking-widest uppercase mb-1">Visión Revelada</p>
            <h2 className="text-2xl font-black text-white mb-5">El rol de {seerResult.targetName}</h2>

            <div className={`w-full max-w-xs p-6 rounded-3xl border-2 flex flex-col items-center mb-6 shadow-2xl transition-all ${
              seerResult.isWerewolf
                ? 'bg-red-950/80 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.5)]'
                : 'bg-green-950/80 border-green-500 shadow-[0_0_35px_rgba(34,197,94,0.4)]'
            }`}>
              <div className="w-24 h-32 rounded-2xl overflow-hidden border-2 mb-4 relative shadow-lg bg-night">
                <img
                  src={seerResult.isWerewolf ? '/roles/werewolf.jpg' : '/roles/villager.jpg'}
                  alt={seerResult.isWerewolf ? 'Hombre Lobo' : 'Aldeano'}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-2xl font-black text-white mb-2">{seerResult.targetName}</p>
              <div className={`px-4 py-1.5 rounded-full font-black text-sm uppercase tracking-wider mb-3 ${
                seerResult.isWerewolf ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'
              }`}>
                {seerResult.isWerewolf ? '🐺 ES HOMBRE LOBO' : '🛡️ NO ES LOBO (INOCENTE)'}
              </div>
              <p className="text-xs text-gray-300 leading-relaxed text-center">
                {seerResult.isWerewolf
                  ? '¡Cuidado! Este jugador forma parte de la manada de los lobos. Convence a la aldea en el día sin descubrirte.'
                  : 'Este jugador duerme tranquilo esta noche. No es un enemigo de la aldea.'}
              </p>
            </div>

            <p className="text-xs text-gray-500 tracking-widest uppercase">Esperando que termine la noche...</p>
            <div className="mt-4 flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        );
      } else {
        return (
          <div className="min-h-screen bg-night flex flex-col items-center justify-center px-5 text-center">
            <div className="text-6xl mb-4 animate-pulse">🔮</div>
            <h2 className="text-2xl font-black text-village-gold mb-2">Consultando la Bola de Cristal...</h2>
            <p className="text-gray-400 text-sm max-w-xs mb-6">
              Descifrando el aura de {targetObj?.name ?? 'tu objetivo'}...
            </p>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-village-gold rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="min-h-screen bg-night flex flex-col items-center justify-center px-5 text-center">
        <div className="text-7xl mb-6">✅</div>
        <h2 className="text-3xl font-black text-green-400 mb-3">¡Acción Registrada!</h2>
        <p className="text-gray-400">Esperando a que los demás terminen...</p>
        <div className="mt-8 flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const actionDef = actions.find(a => a.id === selectedAction);
  const needsTarget = actionDef?.targetType === 'player';
  const canConfirm = selectedAction && (!needsTarget || selectedTarget);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onAction(selectedAction!, needsTarget ? selectedTarget : null);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-night flex flex-col px-5 py-8">
      <h2 className="text-xl font-black text-white text-center mb-1">Es tu turno</h2>
      <p className="text-xs text-gray-600 text-center tracking-widest uppercase mb-8">NOCHE · ACCIÓN</p>

      {/* Select action */}
      {actions.length > 1 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 tracking-widest uppercase mb-3">¿Qué haces?</p>
          <div className="space-y-3">
            {actions.map(action => {
              const isUsed =
                (action.id === 'witch_save' && privateInfo?.lifePotion === 'used') ||
                (action.id === 'witch_kill' && privateInfo?.deathPotion === 'used');
              return (
                <button
                  key={action.id}
                  onClick={() => !isUsed && setSelectedAction(action.id)}
                  disabled={isUsed}
                  className={`w-full py-4 px-5 rounded-2xl border-2 text-lg font-bold text-left transition-all active:scale-95 ${
                    isUsed
                      ? 'border-gray-800 text-gray-700 bg-transparent opacity-50 cursor-not-allowed'
                      : selectedAction === action.id
                      ? 'border-village-gold bg-village-gold/15 text-village-gold'
                      : 'border-night-border bg-night-card text-white hover:border-village-gold/50'
                  }`}
                >
                  {action.name}
                  {isUsed && <span className="ml-2 text-xs text-gray-600">(ya usada)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-select if only one valid unused action */}
      {(() => {
        const unused = actions.filter(a => {
          if (a.id === 'witch_save' && privateInfo?.lifePotion === 'used') return false;
          if (a.id === 'witch_kill' && privateInfo?.deathPotion === 'used') return false;
          return true;
        });
        if (unused.length === 1 && selectedAction !== unused[0].id) {
          setSelectedAction(unused[0].id);
        }
        return null;
      })()}

      {/* Select target */}
      {(selectedAction || actions.length === 1) && needsTarget && (
        <div className="flex-1 mb-6">
          <p className="text-xs text-gray-500 tracking-widest uppercase mb-3">
            {actionDef?.label ?? 'Elige un jugador'}
          </p>
          {/* Healer notice: server already excludes last healed from targets */}
          {selectedAction === 'healer_protect' && (privateInfo?.lastHealedId as string) && (
            <p className="text-xs text-amber-500 mb-3 text-center">
              ⚠️ No puedes curar a la misma persona que protegiste la ronda pasada.
            </p>
          )}
          <div className="space-y-3">
            {targets.map(target => {
              // Buscar qué lobos están apuntando a este target
              const wolvesTargetingThis = Object.entries(wolfPreviews)
                .filter(([_, tId]) => tId === target.id)
                .map(([wName]) => wName);

              return (
                <button
                  key={target.id}
                  onClick={() => {
                    setSelectedTarget(target.id);
                    if (onTargetSelect) onTargetSelect(target.id);
                  }}
                  className={`w-full py-5 px-5 rounded-2xl border-2 text-xl font-bold text-center flex flex-col items-center transition-all active:scale-95 ${
                    selectedTarget === target.id
                      ? 'border-village-gold bg-village-gold/15 text-village-gold scale-[1.02]'
                      : 'border-night-border bg-night-card text-white hover:border-village-gold/30'
                  }`}
                >
                  <span>{target.name}</span>
                  {wolvesTargetingThis.length > 0 && (
                    <span className="text-xs text-red-500 mt-1 font-normal">
                      🐺 {wolvesTargetingThis.join(', ')} quiere(n) atacar
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirm button */}
      {(selectedAction || actions.length === 1) && (
        <div className="mt-auto pt-4">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full py-5 bg-village-gold text-black text-2xl font-black rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-village-gold/20"
          >
            CONFIRMAR
          </button>
        </div>
      )}
    </div>
  );
}
