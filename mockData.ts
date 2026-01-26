import { ProjectDetail, ProjectStatus, MilestoneStatus } from './types';

// Mock Users
const USERS = {
  'u1': { id: 'u1', name: 'Sarah Chen', role: 'PM' },
  'u2': { id: 'u2', name: 'Mike Ross', role: 'PM' },
  'u3': { id: 'u3', name: 'Elena Fisher', role: 'EXEC' },
} as const;

// Sample JSON Output for one project (Requirement #5)
export const MOCK_PROJECTS: ProjectDetail[] = [
  {
    id: 'p1',
    name: 'E-Commerce Platform Re-platform',
    description: 'Migrating legacy monolith to headless composable architecture.',
    owner_id: 'u1',
    owner: USERS['u1'],
    start_date: '2024-01-15',
    end_date: '2024-08-30',
    status: ProjectStatus.AT_RISK,
    budget_consumed_percent: 65,
    tags: ['Digital Transformation', 'Infrastructure'],
    milestones: [
      { id: 'm1', project_id: 'p1', name: 'Vendor Selection', due_date: '2024-02-01', status: MilestoneStatus.COMPLETED },
      { id: 'm2', project_id: 'p1', name: 'Architecture Sign-off', due_date: '2024-03-15', status: MilestoneStatus.COMPLETED },
      { id: 'm3', project_id: 'p1', name: 'MVP Backend', due_date: '2024-05-01', status: MilestoneStatus.PENDING },
      { id: 'm4', project_id: 'p1', name: 'Frontend Integration', due_date: '2024-06-15', status: MilestoneStatus.PENDING },
    ],
    updates: [
      {
        id: 'up1',
        project_id: 'p1',
        week_ending: '2024-05-24',
        author_id: 'u1',
        summary_text: 'Backend API development is proceeding, but we are encountering latency issues with the payment gateway integration.',
        risks_blockers: 'Payment Gateway API documentation is outdated. Vendor support is slow.',
        next_steps: 'Escalate to Vendor Account Manager. Implement caching layer.',
        rag_status: ProjectStatus.AT_RISK
      },
      {
        id: 'up2',
        project_id: 'p1',
        week_ending: '2024-05-17',
        author_id: 'u1',
        summary_text: 'Sprint 8 completed. Core catalog microservice is stable.',
        risks_blockers: 'None currently.',
        next_steps: 'Begin checkout flow implementation.',
        rag_status: ProjectStatus.ON_TRACK
      }
    ]
  },
  {
    id: 'p2',
    name: 'Mobile App Refresh (iOS/Android)',
    description: 'UI/UX overhaul for the consumer mobile application.',
    owner_id: 'u2',
    owner: USERS['u2'],
    start_date: '2024-03-01',
    end_date: '2024-07-01',
    status: ProjectStatus.ON_TRACK,
    budget_consumed_percent: 40,
    tags: ['Mobile', 'Consumer'],
    milestones: [
      { id: 'm21', project_id: 'p2', name: 'Design Phase', due_date: '2024-04-01', status: MilestoneStatus.COMPLETED },
      { id: 'm22', project_id: 'p2', name: 'User Testing', due_date: '2024-05-15', status: MilestoneStatus.COMPLETED },
      { id: 'm23', project_id: 'p2', name: 'Store Submission', due_date: '2024-06-25', status: MilestoneStatus.PENDING },
    ],
    updates: [
      {
        id: 'up21',
        project_id: 'p2',
        week_ending: '2024-05-24',
        author_id: 'u2',
        summary_text: 'User testing feedback has been overwhelmingly positive. Minor tweaks to the navigation bar required.',
        risks_blockers: 'None.',
        next_steps: 'Finalize implementation of dark mode.',
        rag_status: ProjectStatus.ON_TRACK
      }
    ]
  },
  {
    id: 'p3',
    name: 'Internal Data Warehouse',
    description: 'Centralizing analytics for marketing and sales data.',
    owner_id: 'u1',
    owner: USERS['u1'],
    start_date: '2023-11-01',
    end_date: '2024-05-01',
    status: ProjectStatus.DELAYED,
    budget_consumed_percent: 95,
    tags: ['Data', 'Internal'],
    milestones: [
      { id: 'm31', project_id: 'p3', name: 'ETL Pipelines', due_date: '2024-01-01', status: MilestoneStatus.COMPLETED },
      { id: 'm32', project_id: 'p3', name: 'Data Visualization Dashboard', due_date: '2024-03-01', status: MilestoneStatus.MISSED },
    ],
    updates: [
      {
        id: 'up31',
        project_id: 'p3',
        week_ending: '2024-05-24',
        author_id: 'u1',
        summary_text: 'Still waiting on sales team to provide access to CRM API keys.',
        risks_blockers: 'CRITICAL: Lack of access to source data.',
        next_steps: 'Meeting with CTO scheduled for Tuesday.',
        rag_status: ProjectStatus.DELAYED
      }
    ]
  }
];