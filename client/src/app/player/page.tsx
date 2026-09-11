'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import JoinGame from '@/components/player/JoinGame';
import RoleCard from '@/components/player/RoleCard';
import ActionPanel from '@/components/player/ActionPanel';
import VotePanel from '@/components/player/VotePanel';
import WaitingScreen from '@/components/player/WaitingScreen';

// ── Types ─────────────────────────────────────────────────────────────
interface MyPlayer {
  id: string;
  name: string;
  roleId: string;
  faction: string;
  isAlive: boolean;
  hasActed: boolean;
  privateInfo: Record<string, unknown>;
}

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

type PlayerScreen =
  | 'joining'
  | 'waiting_start'
  | 'role_revealed'
  | 'night_action'
  | 'night_waiting'
  | 'day_discussion'
  | 'day_vote'
  | 'vote_done'
  | 'eliminated'
  | 'game_ended';

// ── Component ─────────────────────────────────────────────────────────
export default function PlayerPage() {
  const { emit, on } = useSocket();

  const [screen, setScreen] = useState<PlayerScreen>('joining');
  const [myPlayer, setMyPlayer] = useState<MyPlayer | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('lobby');
  const [actions, setActions] = useState<ActionDef[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [privateMsg, setPrivateMsg] = useState<string | null>(null);
  const [wolfPreviews, setWolfPreviews] = useState<Record<string, string>>({});
  const [joinError, setJoinError] = useState<string | undefined>();
  const [isJoining, setIsJoining] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [playerReveal, setPlayerReveal] = useState<Array<{id:string;name:string;roleId:string;faction:string;isAlive:boolean}>>([]);
  const [aliveTargets, setAliveTargets] = useState<Target[]>([]);
  const [actionConfirmed, setActionConfirmed] = useState(false);
  const [voteConfirmed, setVoteConfirmed] = useState(false);

  // Keep player ref for closures
  const myPlayerRef = useRef<MyPlayer | null>(null);
  const gameIdRef = useRef<string | null>(null);

  // ── Socket event handlers ──────────────────────────────────────────
  useEffect(() => {
    const unsubs = [
      // Successfully joined a game
      on('player:joined', ({ player, gameState }: { player: MyPlayer; gameState: any }) => {
        setMyPlayer(player);
        myPlayerRef.current = player;
        setGameId(gameState.id);
        gameIdRef.current = gameState.id;
        setCurrentPhase(gameState.phase);
        setIsJoining(false);
        setScreen('waiting_start');

        // Build alive targets (other alive players)
        const others = (gameState.players ?? [])
          .filter((p: any) => p.id !== player.id && p.isAlive)
          .map((p: any) => ({ id: p.id, name: p.name }));
        setAliveTargets(others);
      }),

      // Role revealed when game starts
      on('player:role_revealed', (roleData: MyPlayer) => {
        setMyPlayer(prev => ({ ...(prev ?? roleData), ...roleData }));
        myPlayerRef.current = { ...(myPlayerRef.current ?? roleData), ...roleData };
        setScreen('role_revealed');
        // El usuario debe darle al botón "¡Entendido!" para continuar.
      }),

      // Wolf coordination preview
      on('player:wolf_preview', ({ wolfName, targetId }: { wolfName: string; targetId: string }) => {
        setWolfPreviews(prev => ({ ...prev, [wolfName]: targetId }));
      }),

      // Day vote coordination preview
      on('player:vote_preview', ({ sourceName, targetId }: { sourceName: string; targetId: string }) => {
        setWolfPreviews(prev => ({ ...prev, [sourceName]: targetId }));
      }),

      // Server sends available actions for this player
      on('player:actions_available', (payload: any) => {
        const { actions: acts, targets: tgts, privateInfo } = payload;
        if (privateInfo) {
           setMyPlayer(prev => prev ? { ...prev, privateInfo } : null);
           myPlayerRef.current = myPlayerRef.current ? { ...myPlayerRef.current, privateInfo } : null;
        }
        setActions(acts);
        setTargets(tgts);
        setActionConfirmed(false);
        setScreen('night_action');
      }),

      // Player has no action this phase
      on('player:waiting', ({ phase }: { phase: string }) => {
        setWolfPreviews({}); // Clear previews
        setCurrentPhase(phase);
        if (phase.startsWith('night')) setScreen('night_waiting');
        else if (phase === 'day_discussion') setScreen('day_discussion');
        else if (phase === 'day_vote') setScreen('day_vote');
      }),

      // Action confirmed by server
      on('player:action_confirmed', ({ actionId }: { actionId?: string }) => {
        setActionConfirmed(true);
        if (actionId === 'witch_save' && myPlayerRef.current) {
          const updated = {
            ...myPlayerRef.current,
            privateInfo: { ...myPlayerRef.current.privateInfo, lifePotion: 'used' },
          };
          setMyPlayer(updated);
          myPlayerRef.current = updated;
        }
        if (actionId === 'witch_kill' && myPlayerRef.current) {
          const updated = {
            ...myPlayerRef.current,
            privateInfo: { ...myPlayerRef.current.privateInfo, deathPotion: 'used' },
          };
          setMyPlayer(updated);
          myPlayerRef.current = updated;
        }
        setScreen('night_waiting');
      }),

      // Vote confirmed by server
      on('player:vote_confirmed', () => {
        setVoteConfirmed(true);
        setScreen('vote_done');
      }),

      // Private info (e.g., seer result)
      on('player:private_info', ({ type, message }: { type: string; message: string }) => {
        setPrivateMsg(message);
        // Update privateInfo in myPlayer if seer result
        if (type === 'seer_result' && myPlayerRef.current) {
          const updated = {
            ...myPlayerRef.current,
            privateInfo: { ...myPlayerRef.current.privateInfo, seerResultMessage: message },
          };
          setMyPlayer(updated);
          myPlayerRef.current = updated;
        }
      }),

      // Wolf target preview
      on('player:wolf_preview', ({ wolfName, targetId }: { wolfName: string; targetId: string }) => {
        setWolfPreviews(prev => ({ ...prev, [wolfName]: targetId }));
      }),

      // Game state update — track phase changes
      on('game:updated', (state: any) => {
        setCurrentPhase(state.phase);
        // Update alive targets
        const me = myPlayerRef.current;
        if (me) {
          const others = (state.players ?? [])
            .filter((p: any) => p.id !== me.id && p.isAlive)
            .map((p: any) => ({ id: p.id, name: p.name }));
          setAliveTargets(others);

          // Check if this player was eliminated
          const myEntry = (state.players ?? []).find((p: any) => p.id === me.id);
          if (myEntry && !myEntry.isAlive) {
            setScreen('eliminated');
          }
        }
        // IMPORTANT: never reset from role_revealed or night_action — those are driven by separate events
      }),

      // Phase changed — update screen accordingly
      on('game:phase_started', ({ phase }: { phase: string }) => {
        setCurrentPhase(phase);
        setActionConfirmed(false);
        setVoteConfirmed(false);
        // If player is voting phase and alive → show vote panel
        const me = myPlayerRef.current;
        if (!me?.isAlive) return;
        if (phase === 'day_vote') {
          setScreen('day_vote');
        } else if (phase === 'day_discussion') {
          setScreen('day_discussion');
        } else if (phase === 'night') {
          setScreen('night_waiting');
        }
      }),

      // Player eliminated event
      on('game:player_eliminated', ({ playerName }: { playerName: string }) => {
        const me = myPlayerRef.current;
        if (me && me.name === playerName) {
          setScreen('eliminated');
          setMyPlayer(prev => prev ? { ...prev, isAlive: false } : prev);
        }
      }),

      // Game announcement (eliminations, night events)
      on('game:announcement', ({ messages }: { messages: string[] }) => {
        setAnnouncement(messages.join(' '));
        setTimeout(() => setAnnouncement(null), 9000);
      }),

      // Game ended
      on('game:ended', (data: { winnerFaction: string; description: string; playerReveal?: any[] }) => {
        setWinnerInfo(data.description);
        if (data.playerReveal) setPlayerReveal(data.playerReveal);
        setScreen('game_ended');
      }),

      // Error
      on('error', ({ message }: { message: string }) => {
        setJoinError(message);
        setIsJoining(false);
      }),
    ];

    return () => { unsubs.forEach(u => u && u()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleJoin = useCallback((code: string, name: string) => {
    setJoinError(undefined);
    setIsJoining(true);
    emit('player:join', { gameCode: code, playerName: name });
  }, [emit]);

  const handleAction = useCallback((actionId: string, targetId: string | null) => {
    emit('player:action', { actionId, targetId });
  }, [emit]);

  const handleVote = useCallback((targetId: string) => {
    emit('player:vote', { targetId });
  }, [emit]);

  // ── Render ─────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (screen) {
      case 'joining':
        return (
          <JoinGame
          onJoin={handleJoin}
          isLoading={isJoining}
          error={joinError}
        />
      );

    case 'waiting_start':
      return (
        <WaitingScreen
          phase="lobby"
          playerName={myPlayer?.name}
          message="Esperando a que el Game Master inicie la partida..."
        />
      );

    case 'role_revealed':
      return myPlayer?.roleId ? (
        <RoleCard
          roleId={myPlayer.roleId}
          faction={myPlayer.faction}
          privateInfo={myPlayer.privateInfo}
          playerName={myPlayer.name}
          onAcknowledge={() => {
            emit('player:ready', {});
            setScreen('waiting_start');
          }}
        />
      ) : null;

    case 'night_action':
      return (
        <ActionPanel
          actions={actions}
          targets={targets}
          onAction={handleAction}
          onTargetSelect={(targetId) => emit('player:target_preview', { targetId })}
          wolfPreviews={wolfPreviews}
          confirmed={actionConfirmed}
          privateInfo={myPlayer?.privateInfo}
        />
      );

    case 'night_waiting':
      return (
        <WaitingScreen
          phase="night"
          playerName={myPlayer?.name}
        />
      );

    case 'day_discussion':
      return (
        <div className="min-h-screen bg-night flex flex-col px-5 py-10">
          <WaitingScreen
            phase="day_discussion"
            playerName={myPlayer?.name}
          />
          {privateMsg && (
            <div className="fixed bottom-8 left-4 right-4 bg-seer-purple/20 border border-seer-purple/50 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 tracking-widest mb-1 uppercase">Info Secreta</p>
              <p className="text-white font-bold">{privateMsg}</p>
            </div>
          )}
        </div>
      );

    case 'day_vote':
      return voteConfirmed ? (
        <WaitingScreen
          phase="day_vote"
          playerName={myPlayer?.name}
          message="¡Voto registrado! Esperando resultados..."
        />
      ) : (
        <VotePanel
          targets={aliveTargets}
          myPlayerId={myPlayer?.id}
          onVote={handleVote}
          onTargetSelect={targetId => emit('player:target_preview', { targetId })}
          votePreviews={wolfPreviews}
          confirmed={voteConfirmed}
        />
      );

    case 'vote_done':
      return (
        <WaitingScreen
          phase="day_vote"
          playerName={myPlayer?.name}
          message="¡Voto registrado! Esperando que todos voten..."
        />
      );

    case 'eliminated':
      return (
        <div className="min-h-screen bg-night flex flex-col items-center justify-center px-6 text-center">
          <div className="text-8xl mb-6">💀</div>
          <h2 className="text-4xl font-black text-gray-400 mb-3">Has sido eliminado</h2>
          <p className="text-gray-600 mb-6">Puedes seguir viendo la partida pero no puedes actuar.</p>
          {myPlayer?.roleId && (
            <div className="bg-night-card border border-night-border rounded-2xl px-6 py-4">
              <p className="text-xs text-gray-600 mb-1">Eras</p>
              <p className="text-xl font-bold text-white capitalize">{myPlayer.roleId}</p>
            </div>
          )}
        </div>
      );

    case 'game_ended': {
      const ROLE_IMAGES: Record<string, string> = {
        werewolf: '/roles/werewolf.jpg',
        villager: '/roles/villager.jpg',
        seer: '/roles/seer.jpg',
        witch: '/roles/witch.jpg',
        healer: '/roles/healer.jpg',
        caperucita: '/roles/caperucita.jpg',
        hunter: '/roles/hunter.jpg',
        cupid: '/roles/cupid.jpg',
        mayor: '/roles/mayor.jpg',
      };
      const ROLE_NAMES: Record<string, string> = {
        werewolf: 'Hombre Lobo',
        villager: 'Aldeano',
        seer: 'Vidente',
        witch: 'Bruja',
        healer: 'Curandero',
        caperucita: 'Caperucita Roja',
        hunter: 'Cazador',
        cupid: 'Cupido',
        mayor: 'Alcalde',
      };
      return (
        <div className="min-h-screen bg-night flex flex-col items-center px-4 py-8 overflow-y-auto">
          <div className="text-7xl mb-3">🏆</div>
          <h2 className="text-3xl font-black text-village-gold mb-2">¡Fin de Partida!</h2>
          {winnerInfo && (
            <p className="text-base text-white mb-5 text-center max-w-sm leading-relaxed">{winnerInfo}</p>
          )}

          {playerReveal.length > 0 && (
            <div className="w-full max-w-sm mb-6">
              <p className="text-xs text-gray-500 tracking-widest uppercase mb-3 text-center">Roles de todos los jugadores</p>
              <div className="space-y-2">
                {playerReveal.map(p => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                      p.faction === 'wolves'
                        ? 'bg-red-950/40 border-red-900/60'
                        : 'bg-night-card border-night-border'
                    } ${!p.isAlive ? 'opacity-60' : ''}`}
                  >
                    <div className="w-10 h-14 rounded-lg overflow-hidden border border-night-border flex-shrink-0 bg-night shadow">
                      <img
                        src={ROLE_IMAGES[p.roleId] ?? '/roles/villager.jpg'}
                        alt={p.roleId}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.name}</p>
                      <p className={`text-xs ${p.faction === 'wolves' ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                        {ROLE_NAMES[p.roleId] ?? p.roleId}
                      </p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${p.isAlive ? 'text-green-400' : 'text-gray-500'}`}>
                      {p.isAlive ? '✅ Vivo' : '💀 Muerto'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-village-gold text-black font-black text-lg rounded-2xl hover:bg-yellow-400 transition-all shadow-lg shadow-village-gold/20"
          >
            🎮 Jugar de Nuevo
          </button>
        </div>
      );
    }

      default:
        return null;
    }
  };

  return (
    <>
      {announcement && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-red-950/95 border-2 border-red-500/80 rounded-2xl p-4 shadow-[0_0_30px_rgba(239,68,68,0.4)] text-center">
          <p className="text-xs text-red-300 tracking-widest uppercase mb-1 font-bold">📜 Anuncio de la Aldea</p>
          <p className="text-white text-sm font-semibold leading-relaxed">{announcement}</p>
        </div>
      )}
      {renderContent()}
    </>
  );
}
