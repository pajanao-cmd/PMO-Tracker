import { ProjectDetail } from './types';

// Mock Users
export const USERS = {
  'u1': { id: 'u1', name: 'Sarah Chen', role: 'PM' },
  'u2': { id: 'u2', name: 'Mike Ross', role: 'PM' },
  'u3': { id: 'u3', name: 'Elena Fisher', role: 'EXEC' },
} as const;

// Empty projects array as requested
export const MOCK_PROJECTS: ProjectDetail[] = [];