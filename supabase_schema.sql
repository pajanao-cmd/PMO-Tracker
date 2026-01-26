-- -----------------------------------------------------------------------------
-- Orbit PMO Tracker - Supabase Schema
-- -----------------------------------------------------------------------------

-- 1. Enable UUID extension (standard in Supabase, but good practice to include)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Define Enum Types for Type Safety
-- Matches ProjectStatus in types.ts
CREATE TYPE public.project_status AS ENUM (
    'ON_TRACK',
    'AT_RISK',
    'DELAYED',
    'COMPLETED',
    'ON_HOLD'
);

-- Matches MilestoneStatus in types.ts
CREATE TYPE public.milestone_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'MISSED'
);

-- Matches User role in types.ts
CREATE TYPE public.user_role AS ENUM (
    'PM',
    'EXEC',
    'ADMIN'
);

-- 3. Profiles Table (Extends auth.users)
-- This table mimics the User interface in types.ts
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'PM'::user_role,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Projects Table
-- The core entity of the tracking board
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES public.profiles(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status project_status DEFAULT 'ON_TRACK'::project_status,
    budget_consumed_percent INTEGER CHECK (budget_consumed_percent >= 0),
    tags TEXT[], -- PostgreSQL array type for tags
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Milestones Table
-- Key events mapped to projects
CREATE TABLE public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    due_date DATE NOT NULL,
    status milestone_status DEFAULT 'PENDING'::milestone_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Project Updates Table
-- Weekly executive updates (historical record)
CREATE TABLE public.project_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    week_ending DATE NOT NULL,
    author_id UUID REFERENCES public.profiles(id),
    
    -- Core Reporting Fields
    summary_text TEXT NOT NULL,
    risks_blockers TEXT,
    next_steps TEXT,
    rag_status project_status NOT NULL, -- Snapshot of status at time of update
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Indexes and Optimization
-- -----------------------------------------------------------------------------

-- Speed up filtering projects by owner (My Projects view)
CREATE INDEX idx_projects_owner ON public.projects(owner_id);

-- Speed up dashboard status counters (KPI cards)
CREATE INDEX idx_projects_status ON public.projects(status);

-- Speed up loading milestones for a specific project
CREATE INDEX idx_milestones_project ON public.milestones(project_id);

-- Speed up loading updates, sorted by newest first
CREATE INDEX idx_updates_project_date ON public.project_updates(project_id, week_ending DESC);

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS) - Security Baseline
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

-- Policy Example: View Access
-- "Anyone who is authenticated can view all projects"
CREATE POLICY "Enable read access for authenticated users" ON public.projects
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy Example: Update Access
-- "Only the project owner or an ADMIN can update a project"
CREATE POLICY "Enable update for owners and admins" ON public.projects
    FOR UPDATE
    USING (
        auth.uid() = owner_id 
        OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );
