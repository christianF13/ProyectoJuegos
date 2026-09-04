export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  roleId: string;
  phase: string;
  targetType: 'player' | 'none';
  targetFilter: 'alive' | 'dead' | 'all' | 'others_alive';
  isSecret: boolean;
  oneTimeUse: boolean;
  label: string;
}

export interface ActionRequest {
  playerId: string;
  actionId: string;
  targetId: string | null;
  gameId: string;
  phase: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  publicAnnouncement: string | null;
  effects: ActionEffect[];
}

export interface ActionEffect {
  type: 'eliminate' | 'protect' | 'reveal' | 'revive' | 'none';
  targetId: string | null;
  data?: Record<string, unknown>;
}
