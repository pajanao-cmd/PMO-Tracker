import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Flag, DollarSign, Activity, AlertCircle, Bot, X, FileText, Check, Loader2, Zap } from 'lucide-react';
import { MOCK_PROJECTS } from '../mockData';
import { StatusBadge } from '../components/StatusBadge';
import { MilestoneStatus, DailyLog, RiskAnalysis } from '../types';
import { generateExecutiveRiskAnalysis, generateDailyLog, analyzeRiskPattern } from '../services/geminiService';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const project = MOCK_PROJECTS.find(p => p.id === id);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Daily Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logStatus, setLogStatus] = useState('');
  const [logProgress, setLogProgress] = useState('');
  const [logBlockers, setLogBlockers] = useState('');
  const [logHelpNeeded, setLogHelpNeeded] = useState(false);
  const [generatedLog, setGeneratedLog] = useState<DailyLog | null>(null);
  const [generatingLog, setGeneratingLog] = useState(false);

  // Risk Pattern State
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [analyzingRisk, setAnalyzingRisk] = useState(false);

  // Mock History for Demo
  const mockHistory: DailyLog[] = [
      {
          update_date: '2024-05-22',
          status_today: 'at_risk',
          progress_note: 'Backend latency observed.',
          blocker_today: 'API Latency',
          help_needed: false,
          risk_signal: 'emerging'
      },
      {
          update_date: '2024-05-23',
          status_today: 'at_risk',
          progress_note: 'Trying caching strategies. No improvement.',
          blocker_today: 'API Latency',
          help_needed: false,
          risk_signal: 'emerging'
      },
      {
          update_date: '2024-05-24',
          status_today: 'at_risk',
          progress_note: 'Still stuck. Need vendor support.',
          blocker_today: 'API Latency - Critical',
          help_needed: true,
          risk_signal: 'critical'
      }
  ];

  if (!project) return <div className="text-center p-10">Project not found</div>;

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const analysis = await generateExecutiveRiskAnalysis(project);
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  const handleGenerateLog = async (e: React.FormEvent) => {
      e.preventDefault();
      setGeneratingLog(true);
      const result = await generateDailyLog(
          project.name,
          logStatus,
          logProgress,
          logBlockers,
          logHelpNeeded
      );
      setGeneratedLog(result);
      setGeneratingLog(false);
  };

  const handleAnalyzeRiskPattern = async () => {
      setAnalyzingRisk(true);
      const result = await analyzeRiskPattern(project.name, mockHistory);
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500 relative">
      {/* Navigation */}
      <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ChevronLeft size={16} className="mr-1" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
                    <StatusBadge status={project.status} />
                </div>
                <p className="text-slate-500 max-w-2xl text-lg">{project.description}</p>
                <div className="flex items-center gap-6 mt-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="p-1.5 bg-slate-100 rounded-md"><Calendar size={16} /></div>
                        {project.start_date} → {project.end_date}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="p-1.5 bg-slate-100 rounded-md"><UserAvatar name={project.owner.name} /></div>
                        Owned by <span className="font-medium text-slate-900">{project.owner.name}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col gap-2">
                <button 
                    onClick={handleAiAnalysis}
                    disabled={loadingAi}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm font-medium w-full justify-center"
                >
                    {loadingAi ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Bot size={18} />
                    )}
                    Generate AI Risk Analysis
                </button>
                <button 
                    onClick={() => setIsLogModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium w-full justify-center"
                >
                    <FileText size={18} />
                    Draft Daily Log
                </button>
            </div>
        </div>

        {/* AI Insight Box */}
        {aiAnalysis && (
            <div className="mt-6 p-4 bg-violet-50 border border-violet-100 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
                <Bot className="text-violet-600 mt-1 flex-shrink-0" size={20} />
                <div>
                    <h4 className="font-bold text-violet-900 text-sm">Gemini Executive Insight</h4>
                    <p className="text-violet-800 text-sm mt-1 whitespace-pre-line">{aiAnalysis}</p>
                </div>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Updates */}
        <div className="lg:col-span-2 space-y-8">
             
             {/* Risk Pattern Detector Widget */}
             <div className="bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-slate-700 text-white">
                 <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2 text-lg">
                            <Zap size={20} className="text-amber-400" />
                            Risk Pattern Detector
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Analyzing daily signals for escalation patterns.</p>
                    </div>
                    <button 
                        onClick={handleAnalyzeRiskPattern}
                        disabled={analyzingRisk}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {analyzingRisk ? <Loader2 className="animate-spin" /> : 'Run Analysis'}
                    </button>
                 </div>
                 <div className="p-6">
                    {riskAnalysis ? (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <div className={`p-4 rounded-lg border flex items-start gap-4 ${
                                riskAnalysis.escalation_required 
                                ? 'bg-red-500/10 border-red-500/30' 
                                : 'bg-emerald-500/10 border-emerald-500/30'
                            }`}>
                                {riskAnalysis.escalation_required ? (
                                    <AlertCircle className="text-red-500 mt-1" size={24} />
                                ) : (
                                    <Check className="text-emerald-500 mt-1" size={24} />
                                )}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-bold text-lg ${riskAnalysis.escalation_required ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {riskAnalysis.risk_trend.toUpperCase()} TREND
                                        </h3>
                                        {riskAnalysis.escalation_required && (
                                            <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">Escalation Required</span>
                                        )}
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed">{riskAnalysis.reason}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Simulated Recent History (Last 3 Days)</h4>
                            <div className="space-y-2">
                                {mockHistory.map((h, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm text-slate-400 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                        <span className="font-mono text-slate-500">{h.update_date}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                            h.status_today === 'at_risk' ? 'bg-amber-900/50 text-amber-400' : 'bg-slate-700 text-slate-300'
                                        }`}>{h.status_today.replace('_', ' ')}</span>
                                        <span className="truncate">{h.blocker_today}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>
             </div>

             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <Activity size={20} className="text-blue-600" />
                        Weekly Updates
                    </h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {project.updates.map((update, idx) => (
                        <div key={update.id} className="p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-sm font-semibold text-slate-900">Week ending {update.week_ending}</span>
                                <StatusBadge status={update.rag_status} size="sm" />
                            </div>
                            <div className="prose prose-sm max-w-none text-slate-600 space-y-3">
                                <p><span className="font-medium text-slate-900">Summary: </span>{update.summary_text}</p>
                                {update.risks_blockers && update.risks_blockers !== 'None.' && (
                                    <div className="flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-100 text-red-800">
                                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                        <span><span className="font-bold">Risks/Blockers: </span>{update.risks_blockers}</span>
                                    </div>
                                )}
                                <p><span className="font-medium text-slate-900">Next Steps: </span>{update.next_steps}</p>
                            </div>
                        </div>
                    ))}
                    {project.updates.length === 0 && <div className="p-6 text-slate-500 italic">No updates recorded yet.</div>}
                </div>
             </div>
        </div>

        {/* Right Column: Milestones & KPIs */}
        <div className="space-y-8">
             {/* Key Metrics */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-2 text-xs font-semibold uppercase">
                        <DollarSign size={14} /> Budget
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{project.budget_consumed_percent}%</div>
                    <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{width: `${project.budget_consumed_percent}%`}}></div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-2 text-xs font-semibold uppercase">
                        <Flag size={14} /> Scope
                    </div>
                    <div className="text-2xl font-bold text-slate-900">Stable</div>
                    <div className="text-xs text-emerald-600 font-medium">No creep detected</div>
                </div>
             </div>

             {/* Milestones Widget */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-slate-900 text-sm">Milestones</h3>
                </div>
                <div className="p-4 space-y-4">
                    {project.milestones.map(m => (
                        <div key={m.id} className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                m.status === MilestoneStatus.COMPLETED ? 'bg-emerald-500' :
                                m.status === MilestoneStatus.MISSED ? 'bg-red-500' : 'bg-slate-300'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${m.status === MilestoneStatus.COMPLETED ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                    {m.name}
                                </p>
                                <p className="text-xs text-slate-500">{m.due_date}</p>
                            </div>
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                m.status === MilestoneStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                                m.status === MilestoneStatus.MISSED ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {m.status}
                            </span>
                        </div>
                    ))}
                </div>
             </div>
        </div>
      </div>

      {/* Daily Log Modal */}
      {isLogModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Bot className="text-blue-600" size={24} />
                          AI Daily Log Assistant
                      </h3>
                      <button onClick={closeLogModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {!generatedLog ? (
                          <form onSubmit={handleGenerateLog} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Status Today</label>
                                      <input 
                                          type="text" 
                                          required
                                          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                          placeholder="e.g., Progressing slow"
                                          value={logStatus}
                                          onChange={e => setLogStatus(e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Help Needed?</label>
                                      <div className="flex items-center h-10">
                                          <label className="flex items-center cursor-pointer">
                                              <input 
                                                  type="checkbox" 
                                                  className="rounded border-slate-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 h-5 w-5"
                                                  checked={logHelpNeeded}
                                                  onChange={e => setLogHelpNeeded(e.target.checked)}
                                              />
                                              <span className="ml-2 text-sm text-slate-600">Yes, require escalation</span>
                                          </label>
                                      </div>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Progress Notes</label>
                                  <textarea 
                                      required
                                      rows={4}
                                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      placeholder="What was achieved today?"
                                      value={logProgress}
                                      onChange={e => setLogProgress(e.target.value)}
                                  ></textarea>
                              </div>

                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Blockers (if any)</label>
                                  <textarea 
                                      rows={2}
                                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      placeholder="What is standing in the way?"
                                      value={logBlockers}
                                      onChange={e => setLogBlockers(e.target.value)}
                                  ></textarea>
                              </div>

                              <div className="pt-2">
                                  <button 
                                      type="submit" 
                                      disabled={generatingLog}
                                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-sm overflow-x-auto">
                                  <pre className="text-slate-800">{JSON.stringify(generatedLog, null, 2)}</pre>
                              </div>
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                  <h4 className="text-blue-900 font-bold text-sm mb-2">Review & Confirm</h4>
                                  <p className="text-blue-800 text-sm">
                                      The AI has structured your input into a standard daily log format. 
                                      In a real app, clicking "Save Log" would store this JSON in the database.
                                  </p>
                              </div>
                              <div className="flex gap-3 pt-2">
                                  <button 
                                      onClick={() => setGeneratedLog(null)}
                                      className="flex-1 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                                  >
                                      Edit Input
                                  </button>
                                  <button 
                                      onClick={closeLogModal}
                                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                  >
                                      <Check size={18} />
                                      Save Log
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

// Helper for generic avatar
const UserAvatar: React.FC<{name: string}> = ({name}) => (
    <div className="w-4 h-4 rounded-full bg-slate-300 text-[8px] flex items-center justify-center font-bold text-white">
        {name.charAt(0)}
    </div>
);