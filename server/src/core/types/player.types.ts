export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  faction: string;
  maxCount: number | null;
  minCount: number;
  nightActions: string[];
  dayActions: string[];
  privateInstructions: string;
  publicDescription: string;
  revealsOnElimination: boolean;
}
