import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Flag, DollarSign, Activity, AlertCircle, Bot, X, FileText, Check, Loader2, Zap, User, Link as LinkIcon, Sparkles, Clock, Target, Edit, Diamond } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from '../components/StatusBadge';
import { DailyLog, RiskAnalysis, ProjectStatus, ProjectDetail as IProjectDetail, WeeklyUpdate, Milestone, MilestoneStatus } from '../types';
import { generateExecutiveRiskAnalysis, generateDailyLog, analyzeRiskPattern } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // Data State
  const [project, setProject] = useState<any>(null);
  const [dailyUpdates, setDailyUpdates] = useState<DailyLog[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI & Modal State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logStatus, setLogStatus] = useState('');
  const [logProgress, setLogProgress] = useState('');
  const [logBlockers, setLogBlockers] = useState('');
  const [logHelpNeeded, setLogHelpNeeded] = useState(false);
  const [generatedLog, setGeneratedLog] = useState<DailyLog | null>(null);
  const [generatingLog, setGeneratingLog] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [analyzingRisk, setAnalyzingRisk] = useState(false);

  // Mock Chart Data State
  const [chartData, setChartData] = useState<any[]>([]);

  // Fetch Data from Supabase
  const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
          // 1. Fetch Project Details
          const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('*')
              .eq('id', id)
              .single();
          
          if (projectError) throw projectError;
          setProject(projectData);

          // 2. Fetch Milestones
          const { data: milestonesData, error: milestonesError } = await supabase
              .from('milestones')
              .select('*')
              .eq('project_id', id)
              .order('due_date', { ascending: true });
          
          if (milestonesError) console.warn('Error fetching milestones', milestonesError);
          setMilestones(milestonesData || []);

          // 3. Fetch Daily Updates (Limit 30)
          const { data: updatesData, error: updatesError } = await supabase
              .from('project_daily_updates')
              .select('*')
              .eq('project_id', id)
              .order('update_date', { ascending: false })
              .limit(30);

          if (updatesError) throw updatesError;
          setDailyUpdates(updatesData || []);

          // 4. Generate Mock Chart Data (Simulating % Plan vs Actual)
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const mockData = months.map((m, index) => {
              const plannedVal = Math.round(((index + 1) / 12) * 100);
              // Simulate actual varying slightly from plan (lagging mostly)
              const actualVal = Math.min(100, Math.max(0, plannedVal - (Math.random() * 15 - 2)));
              return {
                  name: m,
                  planned: plannedVal,
                  actual: actualVal,
              };
          });
          setChartData(mockData);

      } catch (err: any) {
          console.error('Error loading project:', err);
          setError('Failed to load project data.');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, [id]);

  // Construct a ProjectDetail object compliant with the AI service
  const getProjectContextForAi = (): IProjectDetail => {
    if (!project) return {} as IProjectDetail;
    
    // Map daily updates to WeeklyUpdate format roughly for AI consumption
    const mockUpdates: WeeklyUpdate[] = dailyUpdates.slice(0, 5).map(u => ({
        id: u.update_date,
        week_ending: u.update_date,
        author_id: 'system',
        rag_status: u.status_today as ProjectStatus,
        summary_text: u.progress_note,
        risks_blockers: u.blocker_today || 'None',
        next_steps: ''
    }));

    return {
        id: project.id,
        name: project.project_name,
        status: dailyUpdates[0]?.status_today as ProjectStatus || ProjectStatus.ON_TRACK,
        description: project.description || 'No description provided.',
        budget_consumed_percent: project.budget_consumed_percent || 0,
        progress: project.progress || 0,
        tags: project.tags || [],
        start_date: project.start_date,
        end_date: project.end_date,
        owner: { id: '0', name: project.owner, role: 'PM' },
        updates: mockUpdates,
        milestones: milestones
    };
  };

  const handleAiAnalysis = async () => {
    if (!project) return;
    setLoadingAi(true);
    const analysis = await generateExecutiveRiskAnalysis(getProjectContextForAi());
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  const handleGenerateLog = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!project) return;
      setGeneratingLog(true);
      const result = await generateDailyLog(
          project.project_name,
          logStatus,
          logProgress,
          logBlockers,
          logHelpNeeded
      );
      setGeneratedLog(result);
      setGeneratingLog(false);
  };
  
  const saveGeneratedLog = async () => {
      if (!generatedLog || !id) return;
      try {
          const { error } = await supabase.from('project_daily_updates').insert([{
              project_id: id,
              update_date: generatedLog.update_date,
              status_today: generatedLog.status_today,
              progress_note: generatedLog.progress_note,
              blocker_today: generatedLog.blocker_today === 'None' ? null : generatedLog.blocker_today,
          }]);
          
          if (error) throw error;
          
          // Refresh data
          fetchData();
          closeLogModal();
      } catch (err: any) {
          alert('Failed to save log: ' + err.message);
      }
  };

  const handleAnalyzeRiskPattern = async () => {
      if (!project) return;
      setAnalyzingRisk(true);
      const result = await analyzeRiskPattern(project.project_name, dailyUpdates.slice(0, 3));
      setRiskAnalysis(result);
      setAnalyzingRisk(false);
  };

  const closeLogModal = () => {
      setIsLogModalOpen(false);
      setGeneratedLog(null);
      setLogStatus('');
      setLogProgress('');
      setLogBlockers('');
      setLogHelpNeeded(false);
  }

  // --- Timeline Rendering Helpers ---
  const renderTimeline = () => {
    if (!project) return null;

    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    const today = new Date();
    
    // Calculate timeline bounds (Start - 7 days, End + 14 days)
    const timelineStart = new Date(startDate);
    timelineStart.setDate(timelineStart.getDate() - 7);
    const timelineEnd = new Date(endDate);
    timelineEnd.setDate(timelineEnd.getDate() + 14);
    
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

    // Helper to get % position
    const getPos = (d: string | Date) => {
        const date = new Date(d);
        const diff = date.getTime() - timelineStart.getTime();
        return Math.max(0, Math.min(100, (diff / totalDuration) * 100));
    };

    const projectStartPos = getPos(project.start_date);
    const projectEndPos = getPos(project.end_date);
    const projectWidth = projectEndPos - projectStartPos;
    const todayPos = getPos(today);

    // Timeline color based on status
    const currentStatus = dailyUpdates[0]?.status_today || 'On Track';
    let barColor = 'bg-blue-600';
    if (currentStatus === 'At Risk') barColor = 'bg-amber-500';
    if (currentStatus === 'Delayed') barColor = 'bg-red-500';
    if (currentStatus === 'Completed') barColor = 'bg-emerald-500';

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Calendar size={16} className="text-slate-500" />
                    Project Timeline
                </h3>
                <div className="flex gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Active Duration</span>
                    <span className="flex items-center gap-1.5"><Diamond size={10} className="text-purple-600 fill-current" /> Milestone</span>
                    <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-red-500"></span> Today</span>
                </div>
            </div>
            
            <div className="p-6 overflow-x-auto">
                <div className="min-w-[600px] relative">
                    {/* Time Axis (Simplified) */}
                    <div className="flex justify-between text-xs text-slate-400 font-mono mb-2 border-b border-slate-100 pb-2">
                        <span>{timelineStart.toLocaleDateString()}</span>
                        <span>{timelineEnd.toLocaleDateString()}</span>
                    </div>

                    {/* Today Marker */}
                    <div 
                        className="absolute top-8 bottom-0 w-px bg-red-500 z-20 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                        style={{ left: `${todayPos}%` }}
                    >
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        <div className="absolute -top-6 -left-4 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">TODAY</div>
                    </div>

                    {/* Project Bar Row */}
                    <div className="relative h-12 flex items-center mb-2 group">
                        <div className="w-1/4 min-w-[150px] pr-4 text-sm font-bold text-slate-700 truncate border-r border-slate-100 mr-4 flex items-center gap-2">
                            Project Schedule
                        </div>
                        <div className="flex-1 relative h-full flex items-center">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex justify-between opacity-10 pointer-events-none">
                                {[...Array(10)].map((_, i) => <div key={i} className="w-px h-full bg-slate-400"></div>)}
                            </div>
                            {/* The Bar */}
                            <div 
                                className={`h-4 rounded-full ${barColor} shadow-sm relative group-hover:h-5 transition-all duration-300`}
                                style={{ left: `${projectStartPos}%`, width: `${projectWidth}%` }}
                            >
                                <span className="absolute -top-6 left-0 text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {project.start_date}
                                </span>
                                <span className="absolute -top-6 right-0 text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {project.end_date}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Milestones Rows */}
                    {milestones.length > 0 ? (
                        milestones.map((ms, idx) => {
                            const msPos = getPos(ms.due_date);
                            const isPast = new Date(ms.due_date) < today;
                            return (
                                <div key={ms.id} className="relative h-10 flex items-center group">
                                    <div className="w-1/4 min-w-[150px] pr-4 text-xs font-medium text-slate-600 truncate border-r border-slate-100 mr-4 pl-4 flex items-center gap-2">
                                        {ms.status === MilestoneStatus.COMPLETED ? <Check size={12} className="text-emerald-500" /> : <div className="w-3" />}
                                        {ms.name}
                                    </div>
                                    <div className="flex-1 relative h-full flex items-center">
                                         <div className="absolute inset-0 flex justify-between opacity-5 pointer-events-none">
                                            {[...Array(10)].map((_, i) => <div key={i} className="w-px h-full bg-slate-400"></div>)}
                                        </div>
                                        <div 
                                            className="absolute transform -translate-x-1/2 flex flex-col items-center cursor-pointer group-hover:z-10"
                                            style={{ left: `${msPos}%` }}
                                        >
                                            <Diamond 
                                                size={14} 
                                                className={`fill-current ${ms.status === MilestoneStatus.COMPLETED ? 'text-emerald-500' : isPast ? 'text-red-400' : 'text-purple-500'} mb-1`} 
                                            />
                                            <span className="text-[9px] bg-slate-800 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute top-5 whitespace-nowrap z-50">
                                                {ms.due_date}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-4 text-center text-xs text-slate-400 italic bg-slate-50/30 rounded border border-dashed border-slate-200 mt-2">
                            No milestones defined for this timeline.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };
  // ---------------------------------

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (error || !project) return <div className="text-center p-10 text-red-500 bg-red-50 rounded-lg m-10 border border-red-200">{error || 'Project not found'}</div>;

  const currentStatus = dailyUpdates[0]?.status_today as ProjectStatus || ProjectStatus.ON_TRACK;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative pb-20">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-slate-500 mb-2">
          <Link to="/" className="hover:text-slate-900 transition-colors font-medium">Dashboard</Link>
          <ChevronLeft size={14} className="mx-2 rotate-180 text-slate-300" />
          <span className="font-semibold text-slate-900 truncate">Project Details</span>
      </nav>

      {/* Header & Charter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-4 max-w-4xl">
                    <div className="flex items-center gap-3">
                         <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{project.project_name}</h1>
                         <StatusBadge status={currentStatus} />
                    </div>
                    <p className="text-slate-600 text-lg leading-relaxed font-light">
                        {project.description || 'No description available for this project.'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 uppercase tracking-wide">{project.type}</span>
                        {project.tags && project.tags.map((tag: string) => (
                            <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 uppercase tracking-wide">{tag}</span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                     <Link 
                        to={`/projects/${id}/edit`}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-bold"
                    >
                        <Edit size={16} />
                        Edit Details
                    </Link>
                    <button 
                        onClick={() => setIsLogModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-sm"
                    >
                        <FileText size={16} />
                        Add Daily Entry
                    </button>
                </div>
            </div>
         </div>
         
         {/* Stats Grid */}
         <div className="bg-slate-50/50 p-6 grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-slate-200 border-b border-slate-200">
            <div className="px-4 first:pl-0 flex flex-col justify-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Calendar size={12} /> Timeline
                </div>
                <div className="text-sm font-bold text-slate-900">
                    {project.start_date} <span className="text-slate-400 mx-1">→</span> {project.end_date}
                </div>
            </div>
            <div className="px-4 flex flex-col justify-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <User size={12} /> Project Owner
                </div>
                <div className="text-sm font-bold text-slate-900">
                    {project.owner}
                </div>
            </div>
            <div className="px-4 flex flex-col justify-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <DollarSign size={12} /> Budget Used
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1 max-w-[140px]">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${project.budget_consumed_percent || 0}%` }}></div>
                </div>
                <span className="text-xs font-medium text-slate-600">{project.budget_consumed_percent || 0}% Consumed</span>
            </div>
            <div className="px-4 flex flex-col justify-center">
                 <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Activity size={12} /> Quick Actions
                </div>
                 <div className="flex gap-2">
                     <button onClick={handleAiAnalysis} disabled={loadingAi} className="p-1.5 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded border border-violet-100 transition-colors" title="AI Risk Assessment">
                        {loadingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                     </button>
                     <button className="p-1.5 text-slate-500 bg-white hover:text-blue-600 hover:bg-slate-50 rounded border border-slate-200 transition-colors">
                        <LinkIcon size={16} />
                     </button>
                 </div>
            </div>
         </div>
      </div>

      {/* EXECUTIVE ANALYTICS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Chart Card */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-slate-900 text-base">Project Progress</h3>
                    <p className="text-slate-500 text-xs mt-1">% Plan vs Actual Cumulative Progress</p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Planned
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Actual
                    </div>
                </div>
              </div>
              <div className="flex-1 h-64 min-h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 12 }} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            domain={[0, 100]}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="planned" 
                            stroke="#cbd5e1" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                            dot={false} 
                            activeDot={{ r: 6, fill: '#cbd5e1', stroke: '#fff', strokeWidth: 2 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="actual" 
                            stroke="#2563eb" 
                            strokeWidth={3} 
                            dot={false}
                            activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} 
                          />
                      </LineChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Side Cards */}
          <div className="space-y-6 flex flex-col">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                  <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 z-10">Completion Progress</h4>
                  <div className="text-5xl font-bold text-slate-900 z-10 tracking-tight">{project.progress || 0}%</div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                      <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${project.progress || 0}%` }}></div>
                  </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                  <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 z-10">Budget Consumed</h4>
                  <div className="text-5xl font-bold text-slate-900 z-10 tracking-tight">
                    {project.budget_consumed_percent}%
                  </div>
                  {/* Decorative faint background dollar */}
                  <DollarSign className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 rotate-12" size={120} />
              </div>
          </div>
      </div>

      {/* TIMELINE SECTION */}
      {renderTimeline()}

      {/* AI Insight Box */}
      {aiAnalysis && (
        <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-xl p-6 flex items-start gap-4 animate-in slide-in-from-top-2 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
                <Sparkles size={100} className="text-violet-900" />
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm text-violet-600 border border-violet-100">
                <Bot size={24} />
            </div>
            <div className="relative z-10">
                <h4 className="font-bold text-violet-900 text-sm uppercase tracking-wide mb-1 flex items-center gap-2">
                    Gemini Executive Insight
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-medium">{aiAnalysis}</p>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Updates & Risk */}
        <div className="lg:col-span-2 space-y-6">
             
             {/* Risk Pattern Detector Widget - Redesigned to be cleaner */}
             <div className="bg-slate-900 rounded-xl shadow-lg overflow-hidden text-white relative">
                 <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2 text-base">
                            <Activity size={18} className="text-blue-400" />
                            Live Risk Monitor
                        </h2>
                    </div>
                    <button 
                        onClick={handleAnalyzeRiskPattern}
                        disabled={analyzingRisk}
                        className="text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white transition-all flex items-center gap-2"
                    >
                        {analyzingRisk ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        SCAN NOW
                    </button>
                 </div>
                 <div className="p-5">
                    {riskAnalysis ? (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <div className={`p-4 rounded-lg border flex items-start gap-4 ${
                                riskAnalysis.escalation_required 
                                ? 'bg-red-500/10 border-red-500/30' 
                                : 'bg-emerald-500/10 border-emerald-500/30'
                            }`}>
                                {riskAnalysis.escalation_required ? (
                                    <div className="p-2 bg-red-500/20 rounded-full"><AlertCircle className="text-red-500" size={24} /></div>
                                ) : (
                                    <div className="p-2 bg-emerald-500/20 rounded-full"><Check className="text-emerald-500" size={24} /></div>
                                )}
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className={`font-bold text-lg ${riskAnalysis.escalation_required ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {riskAnalysis.risk_trend.toUpperCase()} TREND
                                        </h3>
                                        {riskAnalysis.escalation_required && (
                                            <span className="bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm tracking-wide">Escalation Required</span>
                                        )}
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed">{riskAnalysis.reason}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2 text-center py-6 text-slate-500 text-sm">
                                <Activity className="mx-auto mb-2 opacity-30" size={32} />
                                System monitoring active. Run scan to detect patterns.
                            </div>
                        </div>
                    )}
                 </div>
             </div>

             {/* Updates Timeline */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                        <Clock size={16} className="text-slate-400" />
                        Update History
                    </h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {dailyUpdates.map((update, idx) => (
                        <div key={idx} className="p-5 hover:bg-slate-50 transition-colors group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                        {update.update_date}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">Daily Log</span>
                                </div>
                                <StatusBadge status={update.status_today as ProjectStatus} size="sm" />
                            </div>
                            
                            <div className="pl-2 border-l-2 border-slate-100 ml-1 space-y-2">
                                <p className="text-sm text-slate-700 leading-relaxed font-medium">{update.progress_note}</p>
                                
                                {update.blocker_today && update.blocker_today !== 'None' && (
                                    <div className="flex items-start gap-2 text-red-700 text-xs mt-2 bg-red-50 p-2 rounded border border-red-100 w-fit">
                                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                        <span className="font-semibold">Blocker: {update.blocker_today}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {dailyUpdates.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">No updates recorded yet.</div>}
                </div>
             </div>
        </div>

        {/* Right Column: Milestones & KPIs */}
        <div className="space-y-6">
             {/* Milestones Widget */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/30">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Flag size={16} className="text-slate-400" /> 
                        Key Milestones
                    </h3>
                </div>
                <div className="p-6">
                     {/* Simplified list view since we now have the big chart */}
                     {milestones.length > 0 ? (
                        <div className="space-y-4">
                            {milestones.map((ms) => (
                                <div key={ms.id} className="flex items-start gap-3">
                                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center border ${
                                        ms.status === MilestoneStatus.COMPLETED ? 'bg-emerald-100 border-emerald-300 text-emerald-600' : 'bg-slate-50 border-slate-300 text-slate-300'
                                    }`}>
                                        {ms.status === MilestoneStatus.COMPLETED && <Check size={10} />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-700">{ms.name}</div>
                                        <div className="text-xs text-slate-400 font-mono">{ms.due_date}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     ) : (
                        <div className="text-center text-slate-400 text-sm flex flex-col items-center gap-2 py-4">
                            <Target size={32} className="opacity-20" />
                            <span>No milestones configured.</span>
                        </div>
                     )}
                </div>
             </div>
        </div>
      </div>

      {/* Daily Log Modal */}
      {isLogModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Bot className="text-blue-600" size={24} />
                          AI Daily Log Assistant
                      </h3>
                      <button onClick={closeLogModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                      {!generatedLog ? (
                          <form onSubmit={handleGenerateLog} className="space-y-5">
                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status Today</label>
                                      <input 
                                          type="text" 
                                          required
                                          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2.5 text-sm transition-shadow"
                                          placeholder="e.g., Progressing slow"
                                          value={logStatus}
                                          onChange={e => setLogStatus(e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Escalation</label>
                                      <label className={`flex items-center px-4 py-2 rounded-lg border cursor-pointer transition-all h-[42px] ${logHelpNeeded ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                                          <input 
                                              type="checkbox" 
                                              className="rounded border-slate-300 text-red-600 shadow-sm focus:ring-red-500 h-4 w-4"
                                              checked={logHelpNeeded}
                                              onChange={e => setLogHelpNeeded(e.target.checked)}
                                          />
                                          <span className={`ml-2 text-sm font-semibold ${logHelpNeeded ? 'text-red-700' : 'text-slate-600'}`}>Require Help</span>
                                      </label>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Progress Notes</label>
                                  <textarea 
                                      required
                                      rows={4}
                                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 text-sm transition-shadow"
                                      placeholder="What was achieved today? Be concise."
                                      value={logProgress}
                                      onChange={e => setLogProgress(e.target.value)}
                                  ></textarea>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Blockers (if any)</label>
                                  <textarea 
                                      rows={2}
                                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 text-sm transition-shadow"
                                      placeholder="What is standing in the way?"
                                      value={logBlockers}
                                      onChange={e => setLogBlockers(e.target.value)}
                                  ></textarea>
                              </div>

                              <div className="pt-2">
                                  <button 
                                      type="submit" 
                                      disabled={generatingLog}
                                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                  >
                                      {generatingLog ? (
                                          <Loader2 className="animate-spin" size={20} />
                                      ) : (
                                          <Bot size={20} />
                                      )}
                                      Generate Structured Log
                                  </button>
                              </div>
                          </form>
                      ) : (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                              <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-inner font-mono text-sm overflow-x-auto relative group">
                                  <div className="absolute top-3 right-3 text-slate-600 text-[10px] uppercase font-bold tracking-wider">JSON Preview</div>
                                  <pre className="text-emerald-400">{JSON.stringify(generatedLog, null, 2)}</pre>
                              </div>
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                                  <div className="p-2 bg-blue-100 rounded text-blue-600 h-fit"><Check size={16} /></div>
                                  <div>
                                    <h4 className="text-blue-900 font-bold text-sm mb-1">Log Structured Successfully</h4>
                                    <p className="text-blue-800 text-xs leading-relaxed">
                                        The AI has normalized your input. Review the structure before confirming.
                                    </p>
                                  </div>
                              </div>
                              <div className="flex gap-4 pt-2">
                                  <button 
                                      onClick={() => setGeneratedLog(null)}
                                      className="flex-1 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-bold transition-colors"
                                  >
                                      Back to Edit
                                  </button>
                                  <button 
                                      onClick={saveGeneratedLog}
                                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                                  >
                                      <Check size={18} />
                                      Confirm & Save
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};