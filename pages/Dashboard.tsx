import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ArrowRight, AlertTriangle, CheckCircle, Clock, FileText, X, Loader2, Sparkles, Wand2, ClipboardPaste, ShieldCheck, Calendar } from 'lucide-react';
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
      // Pass ID and Name map for Ingestion logic
      const projectsMap = MOCK_PROJECTS.map(p => ({ id: p.id, name: p.name }));
      
      try {
        const result = await processDataIngestion(rawUpdateText, projectsMap);
        
        if (!result) {
            setIngestionError("Could not process update. Please check if the API Key is configured correctly.");
            setIsProcessingUpdate(false);
            return;
        }

        // If result has an ID, let's try to fill the name for UI friendliness if missing
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
    <div className="space-y-8">
      {/* Action Header */}
      <div className="flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl text-white shadow-lg">
          <div>
              <h2 className="text-xl font-bold">Executive Dashboard</h2>
              <p className="text-slate-400 text-sm mt-1">Portfolio overview for Week 21</p>
          </div>
          <div className="flex gap-3">
              <button 
                onClick={() => setIsSmartUpdateOpen(true)}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg font-medium transition-all hover:shadow-lg border border-slate-600"
              >
                  <Wand2 size={18} />
                  Ingest Daily Update
              </button>
              <button 
                onClick={handleGenerateBriefing}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all hover:shadow-lg hover:scale-105 active:scale-95"
              >
                  <Sparkles size={18} />
                  Generate Monday Briefing
              </button>
          </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI Card 1: Portfolio Health */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Portfolio Health</h3>
            <div className="flex items-center h-32">
                <div className="w-1/2 h-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                innerRadius={35}
                                outerRadius={50}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>On Track</span>
                        <span className="font-bold text-slate-900">{stats.onTrack}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600"><div className="w-2 h-2 rounded-full bg-amber-500"></div>At Risk</span>
                        <span className="font-bold text-slate-900">{stats.atRisk}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600"><div className="w-2 h-2 rounded-full bg-red-500"></div>Delayed</span>
                        <span className="font-bold text-slate-900">{stats.delayed}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* KPI Card 2: Critical Attention */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <AlertTriangle size={100} />
             </div>
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Critical Attention</h3>
             <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">{stats.delayed + stats.atRisk}</span>
                <span className="text-slate-500 ml-2">projects need review</span>
             </div>
             <p className="mt-4 text-sm text-slate-600">
                {stats.delayed} projects are currently stalled due to external blockers or missed milestones.
             </p>
        </div>

        {/* KPI Card 3: Budget Utilization */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Budget Utilization</h3>
            <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">68%</span>
                <span className="text-sm text-emerald-600 font-medium">+2% vs last week</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '68%' }}></div>
            </div>
            <p className="mt-4 text-sm text-slate-600">Aggregate spend across active portfolio.</p>
        </div>
      </div>

      {/* Main Board View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Active Projects</h2>
          <div className="flex gap-2">
             <select className="text-sm border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>All Owners</option>
             </select>
             <select className="text-sm border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option>All Statuses</option>
             </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Budget</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Update</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {MOCK_PROJECTS.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{project.name}</span>
                        <div className="flex gap-1 mt-1">
                            {project.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">{tag}</span>
                            ))}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-2">
                            {project.owner.name.charAt(0)}
                        </div>
                        <span className="text-sm text-slate-600">{project.owner.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-24">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">{project.budget_consumed_percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div 
                                className={`h-1.5 rounded-full ${project.budget_consumed_percent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
                                style={{ width: `${project.budget_consumed_percent}%` }}
                            ></div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 truncate max-w-xs">
                        {project.updates[0]?.summary_text || "No updates yet."}
                    </p>
                    <span className="text-xs text-slate-400 mt-1 block">
                        {project.updates[0]?.week_ending ? `Week ending ${project.updates[0].week_ending}` : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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