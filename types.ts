// Database Entities based on strict schema

export interface Project {
  id: string; // uuid
  project_name: string;
  owner: string;
  type: string;
  start_date: string; // date string YYYY-MM-DD
  end_date: string;   // date string YYYY-MM-DD
  active: boolean;
  created_at: string;
}

export interface ProjectDailyUpdate {
  id: string; // uuid
  project_id: string; // uuid FK
  update_date: string; // date string YYYY-MM-DD
  status_today: 'On Track' | 'At Risk' | 'Delayed' | 'Completed';
  progress_note: string;
  blocker_today: string | null;
  created_at: string;
}

// Joined View for Dashboard
export interface DashboardProject extends Project {
  latest_update?: {
    status_today: string;
    update_date: string;
  } | null;
}

// Enums
export enum ProjectStatus {
  ON_TRACK = 'On Track',
  AT_RISK = 'At Risk',
  DELAYED = 'Delayed',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold'
}

export enum MilestoneStatus {
  COMPLETED = 'Completed',
  MISSED = 'Missed',
  PENDING = 'Pending'
}

// AI Service Types
export interface DailyLog {
  update_date: string;
  status_today: string;
  progress_note: string;
  blocker_today: string | null;
  help_needed: boolean;
  risk_signal: string;
}

export interface SmartUpdate {
  project_id?: string;
  project_name: string;
  update_date: string;
  status_today: string;
  progress_note: string;
  blocker_today: string | null;
  target_date: string | null;
  help_needed: boolean;
  risk_signal: string;
  confidence_level: string;
}

export interface RiskAnalysis {
  project_name: string;
  risk_trend: "stable" | "worsening" | "improving";
  escalation_required: boolean;
  reason: string;
}

export interface ProjectDraft {
  project_name: string;
  project_type: string | null;
  owner: string | null;
  target_date: string | null;
  initial_status: string;
}

export interface DailyUpdateAnalysis {
  project_id: string;
  status_today: 'On Track' | 'At Risk' | 'Delayed' | 'Completed';
  progress_note: string;
  blocker_today: string | null;
  target_date: string | null;
}

// Detailed Project View (Mock Data / Detail Page)
export interface Milestone {
  id: string;
  name: string;
  status: MilestoneStatus;
  due_date: string;
}

export interface WeeklyUpdate {
  id: string;
  week_ending: string;
  author_id: string;
  rag_status: ProjectStatus;
  summary_text: string;
  risks_blockers: string;
  next_steps: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  status: ProjectStatus;
  description: string;
  budget_consumed_percent: number;
  tags: string[];
  start_date: string;
  end_date: string;
  owner: {
    id: string;
    name: string;
    role: string;
  };
  updates: WeeklyUpdate[];
  milestones: Milestone[];
}
