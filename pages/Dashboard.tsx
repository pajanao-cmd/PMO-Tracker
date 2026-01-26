import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ArrowRight, AlertTriangle, Clock, FileText, X, Loader2, Sparkles, Wand2, ClipboardPaste, ShieldCheck, Calendar, Filter, Download, MoreHorizontal, TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { MOCK_PROJECTS } from '../mockData';
import { ProjectStatus, SmartUpdate } from '../types';
import { generateMondayBriefing, processDataIngestion } from '../services/geminiService';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Briefing State
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [briefingHtml, setBriefingHtml] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);

  // Smart Update State
  const [isSmartUpdateOpen, setIsSmartUpdateOpen] = useState(false);
  const [rawUpdateText, setRawUpdateText] = useState('');
  const [processedUpdate, setProcessedUpdate] = useState<SmartUpdate | null>(null);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const [ingestionError, setIngestionError] = useState<string | null>(null);

  // Calculate high-level stats
  const stats = useMemo(() => {
    const total = MOCK_PROJECTS.length;
    const delayed = MOCK_PROJECTS.filter(p => p.status === ProjectStatus.DELAYED).length;
    const atRisk = MOCK_PROJECTS.filter(p => p.status === ProjectStatus.AT_RISK).length;
    const onTrack = MOCK_PROJECTS.filter(p => p.status === ProjectStatus.ON_TRACK).length;
    return { total, delayed, atRisk, onTrack };
  }, []);

  const chartData = [
    { name: 'On Track', value: stats.onTrack, color: '#10b981' },
    { name: 'At Risk', value: stats.atRisk, color: '#f59e0b' },
    { name: 'Delayed', value: stats.delayed, color: '#ef4444' },
  ];

  const handleGenerateBriefing = async () => {
      setIsBriefingOpen(true);
      if (!briefingHtml) {
          setIsGeneratingBriefing(true);
          const html = await generateMondayBriefing(MOCK_PROJECTS);
          setBriefingHtml(html);
          setIsGeneratingBriefing(false);
      }
  };

  const handleProcessSmartUpdate = async () => {
      setIngestionError(null);
      if (!rawUpdateText.trim()) return;
      
      setIsProcessingUpdate(true);
      const projectsMap = MOCK_PROJECTS.map(p => ({ id: p.id, name: p.name }));
      
      try {
        const result = await processDataIngestion(rawUpdateText, projectsMap);
        
        if (!result) {
            setIngestionError("Could not process update. Please check if the API Key is configured correctly.");
            setIsProcessingUpdate(false);
            return;
        }

        if (result && result.project_id) {
           const found = MOCK_PROJECTS.find(p => p.id === result.project_id);
           if (found && !result.project_name) {
               result.project_name = found.name;
           }
        }
        
        setProcessedUpdate(result);
      } catch (e) {
        setIngestionError("An unexpected error occurred during processing.");
      } finally {
        setIsProcessingUpdate(false);
      }
  };

  const closeSmartUpdate = () => {
      setIsSmartUpdateOpen(false);
      setRawUpdateText('');
      setProcessedUpdate(null);
      setIngestionError(null);
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Executive Control Panel Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h2>
              <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Portfolio Overview • Week 21
              </p>
          </div>
          <div className="flex gap-3">
              <button 
                onClick={() => setIsSmartUpdateOpen(true)}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border border-slate-200 shadow-sm hover:shadow-md"
              >
                  <Wand2 size={16} className="text-violet-600" />
                  Smart Ingest
              </button>
              <button 
                onClick={handleGenerateBriefing}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30"
              >
                  <Sparkles size={16} />
                  AI Briefing
              </button>
          </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* KPI 1: Active Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Activity size={20} />
                </div>
                <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <TrendingUp size={12} className="mr-1" /> +2
                </span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">Active Projects</div>
        </div>

        {/* KPI 2: Critical Risks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <AlertTriangle size={20} />
                </div>
                {stats.delayed > 0 && (
                     <span className="flex items-center text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                        Action Required
                    </span>
                )}
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.delayed}</div>
            <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">Critical / Delayed</div>
        </div>

        {/* KPI 3: At Risk */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <AlertCircle size={20} />
                </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.atRisk}</div>
            <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">At Risk</div>
        </div>

        {/* KPI 4: Budget */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                    <TrendingDown size={20} />
                </div>
                <span className="text-xs font-medium text-slate-400">Total CapEx</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">68%</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div className="bg-slate-800 h-1.5 rounded-full" style={{ width: '68%' }}></div>
            </div>
        </div>
      </div>

      {/* Main Board View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
             <div className="bg-white border border-slate-300 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm text-sm text-slate-600 hover:border-blue-400 transition-colors cursor-pointer">
                <Filter size={16} />
                <span className="font-medium">Filter</span>
             </div>
             <div className="h-6 w-px bg-slate-300 mx-1"></div>
             <button className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">All Owners</button>
             <button className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">Status</button>
          </div>
          <div className="flex items-center gap-2">
             <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <Download size={18} />
             </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Project Name</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Owner</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Health</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider w-48">Progress / Budget</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Latest Update</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {MOCK_PROJECTS.map((project) => (
                <tr key={project.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{project.name}</span>
                        <div className="flex gap-1.5 mt-1.5">
                            {project.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 font-medium rounded-md border border-slate-200">{tag}</span>
                            ))}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-white shadow-sm">
                            {project.owner.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-600">{project.owner.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full">
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                            <span className="text-slate-500">Budget</span>
                            <span className="text-slate-900">{project.budget_consumed_percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-100">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${project.budget_consumed_percent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
                                style={{ width: `${project.budget_consumed_percent}%` }}
                            ></div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="relative pl-3 border-l-2 border-slate-200">
                        <p className="text-sm text-slate-600 line-clamp-2">
                            {project.updates[0]?.summary_text || "No updates yet."}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                            {project.updates[0]?.week_ending || 'No Date'}
                        </span>
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                        <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {MOCK_PROJECTS.length} active projects</span>
            <div className="flex gap-2">
                <button className="px-3 py-1 border border-slate-300 bg-white rounded hover:bg-slate-50 disabled:opacity-50">Previous</button>
                <button className="px-3 py-1 border border-slate-300 bg-white rounded hover:bg-slate-50">Next</button>
            </div>
        </div>
      </div>

      {/* Monday Briefing Modal */}
      {isBriefingOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                              <Sparkles className="text-blue-600" size={20} />
                              Monday Executive Briefing
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">AI-generated summary based on portfolio status and recent updates</p>
                      </div>
                      <button onClick={() => setIsBriefingOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8">
                      {isGeneratingBriefing ? (
                          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
                              <Loader2 className="animate-spin text-blue-600" size={40} />
                              <p className="animate-pulse font-medium">Analyzing portfolio signals...</p>
                          </div>
                      ) : (
                          <div 
                            className="prose prose-slate prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: briefingHtml || '' }} 
                          />
                      )}
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                      <button 
                          onClick={() => setIsBriefingOpen(false)}
                          className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                      >
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Smart Update Processor Modal */}
      {isSmartUpdateOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                              <Wand2 className="text-violet-600" size={20} />
                              Smart Data Ingestion
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">Normalize and validate raw daily logs into structured data.</p>
                      </div>
                      <button onClick={closeSmartUpdate} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {!processedUpdate ? (
                          <div className="space-y-4">
                                {ingestionError && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                                        <AlertTriangle size={20} />
                                        <p className="text-sm font-medium">{ingestionError}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Raw Input</label>
                                    <div className="relative">
                                        <textarea 
                                            value={rawUpdateText}
                                            onChange={(e) => setRawUpdateText(e.target.value)}
                                            className="w-full h-48 rounded-lg border-slate-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 p-4 text-sm font-mono"
                                            placeholder={`Paste raw update form data here (Thai supported)... \nExample:\n"Project A: ทีมงานติดงานเลือกตั้งเลยช้าหน่อยครับ คาดว่าจะเสร็จสิ้นเดือนนี้"`}
                                        ></textarea>
                                        <ClipboardPaste className="absolute bottom-4 right-4 text-slate-400" size={16} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        The AI will normalize language, check for consistency, and output clean JSON.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleProcessSmartUpdate}
                                    disabled={isProcessingUpdate || !rawUpdateText.trim()}
                                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessingUpdate ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                    Process & Normalize
                                </button>
                          </div>
                      ) : (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-center gap-3">
                                  <ShieldCheck className="text-emerald-600" size={24} />
                                  <div>
                                      <p className="text-sm font-bold text-emerald-900">Data Validated & Normalized</p>
                                      <p className="text-xs text-emerald-700">Ready for database insertion.</p>
                                  </div>
                              </div>

                              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                  <div>
                                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Project</p>
                                      <h4 className="text-lg font-bold text-slate-900">{processedUpdate.project_name || processedUpdate.project_id}</h4>
                                      {processedUpdate.project_id && <span className="text-xs font-mono text-slate-400">ID: {processedUpdate.project_id}</span>}
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                      processedUpdate.status_today === 'on_track' ? 'bg-emerald-100 text-emerald-700' :
                                      processedUpdate.status_today === 'at_risk' ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                                  }`}>
                                      {processedUpdate.status_today.replace('_', ' ')}
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Date</p>
                                      <p className="text-sm font-medium">{processedUpdate.update_date}</p>
                                  </div>
                                  
                                  {processedUpdate.target_date && (
                                    <div className="bg-violet-50 p-4 rounded-lg border border-violet-100">
                                        <p className="text-xs text-violet-500 font-bold uppercase mb-1 flex items-center gap-1">
                                            <Calendar size={10} /> Target Date
                                        </p>
                                        <p className="text-sm font-bold text-violet-900">{processedUpdate.target_date}</p>
                                    </div>
                                  )}
                              </div>

                              <div>
                                  <p className="text-xs text-slate-500 font-bold uppercase mb-2">Normalized Progress Note</p>
                                  <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed shadow-sm">
                                      {processedUpdate.progress_note}
                                  </div>
                              </div>

                              {processedUpdate.blocker_today ? (
                                  <div>
                                      <p className="text-xs text-slate-500 font-bold uppercase mb-2 text-red-600">Blockers Detected</p>
                                      <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-sm text-red-800">
                                          {processedUpdate.blocker_today}
                                      </div>
                                  </div>
                              ) : (
                                  <div className="text-xs text-slate-400 italic pl-1">No blockers reported (Null)</div>
                              )}
                              
                              <div className="pt-4 flex gap-3">
                                  <button 
                                      onClick={() => setProcessedUpdate(null)}
                                      className="flex-1 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                                  >
                                      Process Another
                                  </button>
                                  <button 
                                      onClick={closeSmartUpdate}
                                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                                  >
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