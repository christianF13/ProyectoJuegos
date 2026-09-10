'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useVoice } from '@/hooks/useVoice';
import VoiceInterface from '@/components/game-master/VoiceInterface';
import PhaseDisplay from '@/components/game-master/PhaseDisplay';
import PlayerList from '@/components/game-master/PlayerList';
import Timer from '@/components/game-master/Timer';
import QRCode from 'react-qr-code';
import { soundEngine } from '@/lib/soundEngine';

interface PublicPlayer {
  id: string;
  name: string;
  isAlive: boolean;
  isConnected: boolean;
}

interface PublicGameState {
  id: string;
  code: string;
  phase: string;
  round: number;
  status: string;
  players: PublicPlayer[];
  winner: string | null;
  winnerFaction: string | null;
  aliveCount: number;
  totalCount: number;
}

interface TimerState {
  remaining: number;
  total: number;
  phase: string;
}

interface GameDef {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

export default function GameMasterPage() {
  const { emit, on } = useSocket();
  const { speak, startListening, stopListening, isListening, isSpeaking, transcript } = useVoice();

  const [gmText, setGmText] = useState('');
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [availableGames, setAvailableGames] = useState<GameDef[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const gameIdRef = useRef<string | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-8), msg]);

  // Client-side origin for QR Code
  const [originUrl, setOriginUrl] = useState('');

  // Modo de Narración: 'room' (Alexa / Altavoz Bluetooth con SFX) | 'remote' (Web solo voz)
  const [audioMode, setAudioMode] = useState<'room' | 'remote'>('room');
  const audioModeRef = useRef<'room' | 'remote'>('room');

  const handleToggleAudioMode = (mode: 'room' | 'remote') => {
    setAudioMode(mode);
    audioModeRef.current = mode;
    if (mode === 'room') {
      soundEngine.playMorningBell();
    }
  };

  // ── Socket event handlers ──────────────────────────────────────────
  useEffect(() => {
    setOriginUrl(window.location.origin);
    emit('gm:join', {});
    // El fetch falla por culpa del CORS de LocalTunnel en navegadores.
    // Como solo hay un juego por ahora, lo fijamos manualmente:
    setAvailableGames([{
      id: 'werewolf',
      name: 'Hombre Lobo',
      description: 'Juego de deducción social',
      minPlayers: 4,
      maxPlayers: 18
    }]);

    // Register socket handlers
    const unsubs = [
      on('gm:joined', () => addLog('Conectado como Game Master')),
      on('gm:response', async ({ text }: { text: string }) => {
        setGmText(text);
        await speak(text);
      }),
      on('game:updated', (state: PublicGameState) => {
        setGameState(state);
        if (state.id !== gameIdRef.current) {
          gameIdRef.current = state.id;
          setGameId(state.id);
          setGameCode(state.code);
        }
      }),
      on('game:phase_started', ({ phase, announcement: ann }: { phase: string; announcement: string }) => {
        setAnnouncement(ann || '');
        setTimer(null);
        addLog(`Fase: ${phase}`);

        if (audioModeRef.current === 'room') {
          if (phase === 'night_start' || phase === 'night') {
            soundEngine.playNightFall();
          } else if (phase === 'day_discussion') {
            soundEngine.playMorningBell();
          } else if (phase === 'day_vote') {
            soundEngine.playSuspenseDrums();
          } else if (phase.startsWith('night_')) {
            soundEngine.playMagicChime();
          }
        }
      }),
      on('game:timer', (t: TimerState) => setTimer(t)),
      on('game:player_eliminated', ({ playerName, roleId }: { playerName: string; roleId: string }) => {
        addLog(`💀 ${playerName} eliminado`);
        if (audioModeRef.current === 'room') {
          soundEngine.playDeathGong();
        }
      }),
      on('game:announcement', ({ messages }: { messages: string[] }) => {
        const text = messages.join(' ');
        addLog(text);
        setAnnouncement(text);
        if (audioModeRef.current === 'room' && (text.includes('eliminado') || text.includes('horca') || text.includes('muerte'))) {
          soundEngine.playDeathGong();
        }
      }),
      on('game:ended', ({ winnerFaction }: { winnerFaction: string }) => {
        addLog(`🏆 Ganador: ${winnerFaction === 'wolves' ? 'Hombres Lobo' : 'Aldeanos'}`);
        if (audioModeRef.current === 'room') {
          soundEngine.playVictoryFanfare();
        }
      }),
      on('error', ({ message }: { message: string }) => addLog(`⚠️ ${message}`)),
    ];

    return () => { unsubs.forEach(u => u && u()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening((text) => {
      addLog(`🗣 Tú: "${text}"`);
      emit('gm:chat', { message: text, gameId: gameIdRef.current || undefined });
    });
  };

  const handleTextSubmit = (text: string) => {
    addLog(`🗣 Tú: "${text}"`);
    emit('gm:chat', { message: text, gameId: gameIdRef.current || undefined });
  };

  const createGame = async (defId: string) => {
    try {
      const res = await fetch(`${SERVER}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameDefinitionId: defId }),
      });
      const data = await res.json();
      setGameId(data.gameId);
      setGameCode(data.code);
      gameIdRef.current = data.gameId;
      emit('gm:join', { gameId: data.gameId });
      addLog(`✅ Partida creada: ${data.code}`);
      emit('gm:chat', { message: `Se creó una partida de ${availableGames.find(g => g.id === defId)?.name}. El código es ${data.code}. Anuncia esto a los jugadores de manera dramática.`, gameId: data.gameId });
    } catch (e) {
      addLog('❌ Error creando partida');
    }
  };

  const startGame = () => {
    if (!gameId) return;
    emit('gm:start_game', { gameId });
    addLog('🎮 Iniciando partida...');
  };

  const currentPhase = gameState?.phase ?? 'lobby';
  const isActive = gameState?.status === 'active';

  return (
    <div className="min-h-screen bg-night text-white overflow-hidden relative">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-village-gold/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex h-screen">
        {/* LEFT SIDEBAR — Players */}
        <aside className="w-64 border-r border-night-border bg-night-card/50 flex flex-col p-4 gap-4 shrink-0">
          <div>
            <p className="text-xs text-gray-600 tracking-widest uppercase mb-1">Sistema</p>
            <div className="flex gap-2 items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-400">Conectado</span>
            </div>
          </div>

          {/* Game code */}
          {gameCode && (
            <div className="bg-night border border-village-gold/20 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-600 tracking-widest mb-1">CÓDIGO DE SALA</p>
              <p className="text-3xl font-black text-village-gold tracking-widest">{gameCode}</p>
              <p className="text-xs text-gray-600 mt-1">Jugadores escanean en su celular</p>
            </div>
          )}

          {/* Player list */}
          <div className="flex-1 overflow-y-auto">
            <PlayerList players={gameState?.players ?? []} />
          </div>

          {/* Action log */}
          <div className="border-t border-night-border pt-3">
            <p className="text-xs text-gray-600 tracking-widest mb-2 uppercase">Registro</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {logs.slice().reverse().map((log, i) => (
                <p key={i} className="text-xs text-gray-500 leading-relaxed">{log}</p>
              ))}
              {logs.length === 0 && <p className="text-xs text-gray-700">Sin eventos aún.</p>}
            </div>
          </div>
        </aside>

        {/* MAIN CENTER — Phase + Timer */}
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-6 overflow-y-auto">
          {/* Phase display */}
          <PhaseDisplay
            phase={currentPhase}
            round={gameState?.round ?? 0}
            announcement={announcement}
          />

          {/* Timer */}
          {timer && isActive && (
            <Timer remaining={timer.remaining} total={timer.total} phase={timer.phase} />
          )}

          {/* Game ended banner */}
          {gameState?.status === 'finished' && (
            <div className="bg-village-gold/10 border border-village-gold/50 rounded-2xl px-10 py-6 text-center">
              <p className="text-5xl mb-3">🏆</p>
              <p className="text-2xl font-bold text-village-gold">{gameState.winner}</p>
            </div>
          )}

          {/* Control buttons */}
          {!gameState && (
            <div className="flex flex-col gap-6 items-center mt-4">
              <h1 className="text-4xl font-black text-village-gold tracking-widest text-center">EL PORTAL<br/>DE JUEGOS</h1>
              <p className="text-gray-400 text-center max-w-sm text-sm">
                Selecciona un juego para abrir la sala y comenzar la aventura.
              </p>
              
              <div className="grid gap-4 w-full max-w-md">
                {availableGames.map(g => (
                  <button
                    key={g.id}
                    onClick={() => {
                      speak(`Excelente elección. He preparado la sala para ${g.name}. Que los jugadores entren por el portal.`);
                      createGame(g.id);
                    }}
                    className="group relative px-8 py-5 bg-night-card border border-village-gold/30 rounded-2xl hover:border-village-gold transition-all overflow-hidden shadow-lg hover:shadow-village-gold/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-village-gold/0 via-village-gold/10 to-village-gold/0 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                    <p className="text-village-gold font-bold text-xl text-center flex items-center justify-center gap-3">
                      <span className="text-3xl">🔮</span> {g.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState?.status === 'lobby' && (
            <div className="flex flex-col items-center gap-4 w-full mt-2">
              <div className="bg-white p-3 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                {originUrl && (
                  <QRCode
                    value={`${originUrl}/player`}
                    size={160}
                    level="H"
                  />
                )}
              </div>
              <p className="text-gray-400 text-center max-w-sm text-sm">
                Escanea el código QR para entrar a la sala, o diles que entren a la web e ingresen el código:
              </p>
              <div className="bg-night-card border border-night-border rounded-xl px-6 py-2">
                <p className="text-2xl font-black text-white tracking-[0.2em]">{gameCode}</p>
              </div>

              <div className="flex flex-col items-center gap-2 mt-2">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">
                  {gameState.players.length} jugador{gameState.players.length !== 1 ? 'es' : ''} en sala
                </p>
                <button
                  onClick={startGame}
                  disabled={gameState.players.length < 4}
                  className="px-10 py-4 bg-village-gold text-black font-bold text-lg rounded-xl hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-village-gold/20"
                >
                  🚀 Iniciar Partida
                </button>
                {gameState.players.length < 4 && (
                  <>
                    <p className="text-xs text-gray-600 mt-2">Mínimo 4 jugadores para comenzar</p>
                    <button
                      onClick={() => {
                        if (gameId) emit('gm:add_bots', { gameId });
                      }}
                      className="mt-2 px-4 py-2 bg-night-border border border-gray-700 text-gray-400 text-xs rounded-lg hover:text-white transition-all"
                    >
                      🤖 Rellenar con Bots (Modo Prueba)
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {gameState?.status === 'active' && (!currentPhase || currentPhase === 'lobby') && (
            <div className="flex flex-col items-center gap-3 mt-4">
              <p className="text-sm text-gray-500 text-center max-w-sm">
                Los roles han sido repartidos.<br/>
                Cuando todos hayan entendido su rol, presiona este botón para comenzar.
              </p>
              <button
                onClick={() => {
                  if (gameId) emit('gm:start_night', { gameId });
                }}
                className="px-10 py-4 bg-night-border border-2 border-village-gold text-village-gold font-bold text-lg rounded-xl hover:bg-village-gold hover:text-black transition-all shadow-lg shadow-village-gold/20 mt-2"
              >
                🌙 Comenzar Primera Noche
              </button>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR — Voice & Audio Mode */}
        <aside className="w-80 border-l border-night-border bg-night-card/50 flex flex-col p-4 gap-3 shrink-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 tracking-widest uppercase">Modo de Audio</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                audioMode === 'room' ? 'bg-village-gold/20 text-village-gold border border-village-gold/40' : 'bg-gray-800 text-gray-400'
              }`}>
                {audioMode === 'room' ? '🔊 Salón' : '🌐 Remoto'}
              </span>
            </div>

            {/* Audio Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 border border-night-border rounded-xl mb-2">
              <button
                onClick={() => handleToggleAudioMode('room')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                  audioMode === 'room'
                    ? 'bg-village-gold text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-sm">🔊 Salón (Alexa)</span>
                <span className="text-[9px] font-normal opacity-75">SFX + Voz</span>
              </button>
              <button
                onClick={() => handleToggleAudioMode('remote')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                  audioMode === 'remote'
                    ? 'bg-village-gold text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-sm">🌐 Remoto</span>
                <span className="text-[9px] font-normal opacity-75">Solo Voz</span>
              </button>
            </div>

            {audioMode === 'room' && (
              <div className="p-2.5 bg-village-gold/10 border border-village-gold/30 rounded-xl text-[11px] text-gray-300 leading-snug">
                <p className="font-semibold text-village-gold mb-1 flex items-center gap-1">
                  <span>📻</span> Parlante Alexa / Bluetooth
                </p>
                <p className="text-gray-400 text-[10px] mb-2">
                  Conecta tu laptop/móvil diciendo: <em className="text-white">"Alexa, conecta Bluetooth"</em>.
                </p>
                <button
                  onClick={() => soundEngine.playNightFall()}
                  className="w-full py-1.5 bg-night border border-village-gold/40 text-village-gold rounded-lg hover:bg-village-gold hover:text-black font-bold transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span>🐺</span> Probar Sonido en Alexa
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-end">
            <VoiceInterface
              isListening={isListening}
              isSpeaking={isSpeaking}
              transcript={transcript}
              gmText={gmText}
              onMicClick={handleMicClick}
              onTextSubmit={handleTextSubmit}
            />
          </div>
          <div className="border-t border-night-border pt-3">
            <p className="text-[11px] text-gray-600 text-center leading-relaxed">
              {audioMode === 'room'
                ? '🔊 Efectos ambientales cinemáticos activados.'
                : '🌐 Modo voz estándar para jugadores a distancia.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
