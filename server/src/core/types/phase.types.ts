export interface PhaseDefinition {
  id: string;
  name: string;
  description: string;
  order: number;
  isNight: boolean;
  type?: 'narrative' | 'action' | 'voting';
  requiredActions: RequiredActionSpec[];
  allowedActions: string[];
  narrationTemplate?: {
    start?: string;
    end?: string;
  };
  nextPhase: string | null;
  timerKey: string | null;
}

export interface RequiredActionSpec {
  actionId: string;
  roleId: string;
  optional: boolean;
}
