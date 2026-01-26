import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Flag, DollarSign, Activity, AlertCircle, Bot, X, FileText, Check, Loader2, Zap, User, Link as LinkIcon, Sparkles } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { MilestoneStatus, DailyLog, RiskAnalysis, ProjectStatus, ProjectDetail as IProjectDetail, WeeklyUpdate } from '../types';
import { generateExecutiveRiskAnalysis, generateDailyLog, analyzeRiskPattern } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // Data State
  const [project, setProject] = useState<any>(null);
  const [dailyUpdates, setDailyUpdates] = useState<DailyLog[]>([]);
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

          // 2. Fetch Daily Updates (Limit 30)
          const { data: updatesData, error: updatesError } = await supabase
              .from('project_daily_updates')
              .select('*')
              .eq('project_id', id)
              .order('update_date', { ascending: false })
              .limit(30);

          if (updatesError) throw updatesError;
          setDailyUpdates(updatesData || []);

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
        tags: project.tags || [],
        start_date: project.start_date,
        end_date: project.end_date,
        owner: { id: '0', name: project.owner, role: 'PM' },
        updates: mockUpdates,
        milestones: []
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

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (error || !project) return <div className="text-center p-10 text-red-500">{error || 'Project not found'}</div>;

  const currentStatus = dailyUpdates[0]?.status_today as ProjectStatus || ProjectStatus.ON_TRACK;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative pb-20">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-slate-500">
          <Link to="/" className="hover:text-slate-900 transition-colors">Dashboard</Link>
          <ChevronLeft size={14} className="mx-2 rotate-180" />
          <span className="font-semibold text-slate-900 truncate">{project.project_name}</span>
      </nav>

      {/* Project Charter Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 pb-6 border-b border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{project.project_name}</h1>
                         <StatusBadge status={currentStatus} />
                    </div>
                    <p className="text-slate-500 max-w-3xl text-lg leading-relaxed">
                        {project.description || 'No description available for this project.'}
                    </p>
                    <div className="flex gap-2">
                        <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200">Type: {project.type}</span>
                        {project.tags && project.tags.map((tag: string) => (
                            <span key={tag} className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200">{tag}</span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                    <button 
                        onClick={handleAiAnalysis}
                        disabled={loadingAi}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all disabled:opacity-70 shadow-md text-sm font-medium"
                    >
                        {loadingAi ? <Loader2 className="animate-spin" size={16} /> : <Bot size={16} />}
                        AI Risk Assessment
                    </button>
                    <button 
                        onClick={() => setIsLogModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium"
                    >
                        <FileText size={16} />
                        Add Daily Entry
                    </button>
                </div>
            </div>
         </div>
         <div className="bg-slate-50/50 p-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-slate-200">
            <div className="px-4 first:pl-0">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Timeline</div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    {project.start_date} — {project.end_date}
                </div>
            </div>
            <div className="px-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Owner</div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    {project.owner}
                </div>
            </div>
            <div className="px-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Budget</div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <DollarSign size={16} className="text-slate-400" />
                    {project.budget_consumed_percent || 0}% Consumed
                </div>
            </div>
            <div className="px-4">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Links</div>
                 <div className="flex gap-3">
                     <LinkIcon size={16} className="text-blue-500 cursor-pointer hover:text-blue-700" />
                     <Activity size={16} className="text-blue-500 cursor-pointer hover:text-blue-700" />
                 </div>
            </div>
         </div>
      </div>

      {/* AI Insight Box (Conditional) */}
      {aiAnalysis && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-6 flex items-start gap-4 animate-in slide-in-from-top-2 shadow-sm">
            <div className="p-2 bg-white rounded-lg shadow-sm text-violet-600">
                <Sparkles size={24} />
            </div>
            <div>
                <h4 className="font-bold text-violet-900 text-sm uppercase tracking-wide mb-1">Executive Insight</h4>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Updates & Risk */}
        <div className="lg:col-span-2 space-y-8">
             
             {/* Risk Pattern Detector Widget */}
             <div className="bg-slate-900 rounded-xl shadow-xl overflow-hidden text-white relative group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Activity size={120} />
                 </div>
                 <div className="p-6 border-b border-slate-800 flex justify-between items-center relative z-10">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2 text-lg">
                            <Zap size={20} className="text-yellow-400" />
                            Live Risk Monitor
                        </h2>
                        <p className="text-slate-400 text-xs mt-1 font-mono">Scanning daily logs for escalation patterns...</p>
                    </div>
                    <button 
                        onClick={handleAnalyzeRiskPattern}
                        disabled={analyzingRisk}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded shadow-lg transition-all"
                    >
                        {analyzingRisk ? <Loader2 className="animate-spin" /> : 'SCAN NOW'}
                    </button>
                 </div>
                 <div className="p-6 relative z-10">
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
                                            <span className="bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm">Escalation Required</span>
                                        )}
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed">{riskAnalysis.reason}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Activity</h4>
                            </div>
                            <div className="space-y-3">
                                {dailyUpdates.slice(0, 3).map((h, i) => (
                                    <div key={i} className="flex items-center gap-4 text-sm text-slate-400 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                                        <div className="font-mono text-slate-500 text-xs">{h.update_date}</div>
                                        <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                            h.status_today === 'At Risk' || h.status_today === 'Delayed' ? 'bg-amber-900/40 text-amber-400 border border-amber-900/50' : 'bg-slate-700 text-slate-300'
                                        }`}>{h.status_today}</div>
                                        <div className="truncate flex-1 text-slate-300">{h.blocker_today ? `Blocker: ${h.blocker_today}` : h.progress_note}</div>
                                    </div>
                                ))}
                                {dailyUpdates.length === 0 && <span className="text-slate-500 text-xs italic">No updates recorded.</span>}
                            </div>
                        </div>
                    )}
                 </div>
             </div>

             {/* Updates Timeline */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <FileText size={20} className="text-slate-400" />
                        Daily Updates
                    </h2>
                    <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">Recent History</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {dailyUpdates.map((update, idx) => (
                        <div key={idx} className="p-6 hover:bg-slate-50 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                        DL
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Update {update.update_date}</p>
                                        <p className="text-xs text-slate-500">Daily Log</p>
                                    </div>
                                </div>
                                <StatusBadge status={update.status_today as ProjectStatus} size="sm" />
                            </div>
                            
                            <div className="pl-12 space-y-3">
                                <p className="text-sm text-slate-700 leading-relaxed">{update.progress_note}</p>
                                
                                {update.blocker_today && update.blocker_today !== 'None' && (
                                    <div className="flex items-start gap-3 bg-red-50 p-3 rounded-lg border border-red-100 text-red-800 text-sm mt-2">
                                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="font-bold block text-xs uppercase mb-1">Blockers / Risks</span>
                                            {update.blocker_today}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {dailyUpdates.length === 0 && <div className="p-8 text-center text-slate-400 italic">No updates recorded yet.</div>}
                </div>
             </div>
        </div>

        {/* Right Column: Milestones & KPIs */}
        <div className="space-y-6">
             {/* Milestones Widget - Vertical Timeline */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Flag size={16} className="text-slate-500" /> 
                        Key Milestones
                    </h3>
                </div>
                <div className="p-6 relative">
                    <div className="text-center text-slate-400 text-sm italic">
                        Milestone tracking not yet configured for this project.
                    </div>
                </div>
             </div>
        </div>
      </div>

      {/* Daily Log Modal */}
      {isLogModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Bot className="text-blue-600" size={24} />
                          AI Daily Log Assistant
                      </h3>
                      <button onClick={closeLogModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={24} />
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
                                          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 text-sm"
                                          placeholder="e.g., Progressing slow"
                                          value={logStatus}
                                          onChange={e => setLogStatus(e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Escalation</label>
                                      <label className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all ${logHelpNeeded ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                          <input 
                                              type="checkbox" 
                                              className="rounded border-slate-300 text-red-600 shadow-sm focus:ring-red-500 h-4 w-4"
                                              checked={logHelpNeeded}
                                              onChange={e => setLogHelpNeeded(e.target.checked)}
                                          />
                                          <span className={`ml-2 text-sm font-medium ${logHelpNeeded ? 'text-red-700' : 'text-slate-600'}`}>Require Executive Help</span>
                                      </label>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Progress Notes</label>
                                  <textarea 
                                      required
                                      rows={4}
                                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 text-sm"
                                      placeholder="What was achieved today?"
                                      value={logProgress}
                                      onChange={e => setLogProgress(e.target.value)}
                                  ></textarea>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Blockers (if any)</label>
                                  <textarea 
                                      rows={2}
                                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 text-sm"
                                      placeholder="What is standing in the way?"
                                      value={logBlockers}
                                      onChange={e => setLogBlockers(e.target.value)}
                                  ></textarea>
                              </div>

                              <div className="pt-4">
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
                              <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-inner font-mono text-sm overflow-x-auto">
                                  <pre className="text-emerald-400">{JSON.stringify(generatedLog, null, 2)}</pre>
                              </div>
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                                  <div className="p-2 bg-blue-100 rounded text-blue-600 h-fit"><Check size={16} /></div>
                                  <div>
                                    <h4 className="text-blue-900 font-bold text-sm mb-1">Log Structured Successfully</h4>
                                    <p className="text-blue-800 text-xs leading-relaxed">
                                        The AI has normalized your input. Review the JSON structure above before saving to the database.
                                    </p>
                                  </div>
                              </div>
                              <div className="flex gap-4 pt-2">
                                  <button 
                                      onClick={() => setGeneratedLog(null)}
                                      className="flex-1 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                                  >
                                      Discard & Edit
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