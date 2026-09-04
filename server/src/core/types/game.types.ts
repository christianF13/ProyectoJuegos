import { RoleDefinition } from './player.types';
import { PhaseDefinition } from './phase.types';
import { ActionDefinition } from './action.types';

export type PrivacyLevel = 'PUBLIC' | 'PLAYER_PRIVATE' | 'GAME_MASTER_PRIVATE';

export interface VictoryCondition {
  id: string;
  description: string;
  winnerFaction: string;
  check: (state: GameState) => boolean;
}

export interface MessageTemplates {
  phaseAnnouncements: Record<string, string>;
  roleReveal: Record<string, string>;
  elimination: string;
  victory: Record<string, string>;
  nightStart: string;
  dayStart: string;
}

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  roles: RoleDefinition[];
  phases: PhaseDefinition[];
  actions: ActionDefinition[];
  timers: Record<string, number>;
  victoryConditions: VictoryCondition[];
  messages: MessageTemplates;
  assignRoles: (playerIds: string[], definition: GameDefinition) => Map<string, string>;
  processPhaseEnd?: (state: GameState, phase: string) => PhaseResult;
}

export interface PhaseResult {
  eliminations: string[];
  announcements: string[];
  nextPhase: string;
}

export interface GameState {
  id: string;
  gameDefinitionId: string;
  code: string;
  phase: string;
  round: number;
  players: PlayerState[];
  pendingActions: PendingAction[];
  votes: Vote[];
  status: 'lobby' | 'active' | 'finished';
  winner: string | null;
  winnerFaction: string | null;
  history: PhaseHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerState {
  id: string;
  name: string;
  gameId: string;
  roleId: string | null;
  faction: string | null;
  isAlive: boolean;
  isConnected: boolean;
  hasActed: boolean;
  isReady?: boolean; // True when player clicks '¡Entendido!'
  privateInfo: Record<string, unknown>;
}

export interface PendingAction {
  playerId: string;
  actionId: string;
  targetId: string | null;
  phase: string;
  timestamp: Date;
}

export interface Vote {
  voterId: string;
  targetId: string;
  phase: string;
  round: number;
  timestamp: Date;
}

export interface PhaseHistoryEntry {
  phase: string;
  round: number;
  eliminations: string[];
  actions: PendingAction[];
  timestamp: Date;
}
