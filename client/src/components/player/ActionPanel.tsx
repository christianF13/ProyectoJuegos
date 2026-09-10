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
}

export default function ActionPanel({ actions, targets, onAction, onTargetSelect, wolfPreviews = {}, confirmed, privateInfo }: ActionPanelProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (confirmed || submitted) {
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
