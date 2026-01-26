// Domain Entities corresponding to the database schema

export enum ProjectStatus {
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  DELAYED = 'DELAYED',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD'
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED'
}

export interface User {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'PM' | 'EXEC' | 'ADMIN';
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  due_date: string;
  status: MilestoneStatus;
}

export interface WeeklyUpdate {
  id: string;
  project_id: string;
  week_ending: string;
  author_id: string;
  summary_text: string; // The core executive summary
  risks_blockers: string; // Specific callouts
  next_steps: string;
  rag_status: ProjectStatus; // Snapshot of status at this update
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  budget_consumed_percent: number;
  tags: string[];
}

// Aggregated view model for frontend ease
export interface ProjectDetail extends Project {
  owner: User;
  milestones: Milestone[];
  updates: WeeklyUpdate[];
}

export interface DailyLog {
  update_date: string;
  status_today: string;
  progress_note: string;
  blocker_today: string;
  help_needed: boolean;
  risk_signal: 'none' | 'emerging' | 'critical';
}

export interface SmartUpdate {
  project_id?: string;
  project_name?: string; // Optional if derived
  update_date: string;
  status_today: string;
  progress_note: string;
  blocker_today: string | null;
  help_needed: boolean;
  risk_signal: 'none' | 'emerging' | 'critical';
  confidence_level: 'high' | 'medium' | 'low';
  target_date?: string | null;
}

export interface RiskAnalysis {
  project_name: string;
  risk_trend: 'stable' | 'worsening' | 'improving';
  escalation_required: boolean;
  reason: string;
}