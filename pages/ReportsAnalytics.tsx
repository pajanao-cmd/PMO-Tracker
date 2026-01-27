
import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FileText, Loader2, RefreshCw, Zap, TrendingUp, Download, Bot, Filter, Calendar, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { generateMondayBriefing } from '../services/geminiService';
import { ProjectStatus } from '../types';

export const ReportsAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    statusCounts: any[];
    typeCounts: any[];
    recentUpdates: any[];
    rawProjects: any[];
  }>({ statusCounts: [], typeCounts: [], recentUpdates: [], rawProjects: [] });

  // Filters State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState('All');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  // Load Project Types on Mount
  useEffect(() => {
    const fetchTypes = async () => {
        const { data } = await supabase.from('project_types').select('name').order('name');
        if (data) {
            setAvailableTypes(data.map(t => t.name));
        }
    };
    fetchTypes();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Projects (Filtered by Type)
      let projectQuery = supabase.from('projects').select('*');
      
      if (selectedType !== 'All') {
        projectQuery = projectQuery.eq('type', selectedType);
      }
      
      const { data: projects, error: projError } = await projectQuery;
      if (projError) throw projError;
      
      const projectIds = projects.map(p => p.id);

      if (projectIds.length === 0) {
          setData({ statusCounts: [], typeCounts: [], recentUpdates: [], rawProjects: [] });
          setLoading(false);
          return;
      }

      // 2. Fetch ALL Updates for these projects to determine "Latest Status" for Charts
      // (Optimization: In a real large-scale app, we would query a materialized view or use distinct on)
      const { data: allUpdates, error: allUpError } = await supabase
        .from('project_daily_updates')
        .select('project_id, status_today, update_date')
        .in('project_id', projectIds)
        .order('update_date', { ascending: false });
        
      if (allUpError) throw allUpError;

      // 3. Fetch Recent Updates for Table (Filtered by Date Range & Project Ids)
      const { data: recentUpdates, error: recentUpError } = await supabase
        .from('project_daily_updates')
        .select('*')
        .in('project_id', projectIds)
        .gte('update_date', startDate)
        .lte('update_date', endDate)
        .order('update_date', { ascending: false })
        .limit(100);

      if (recentUpError) throw recentUpError;

      // Process Status Distribution (Snapshot based on latest update of filtered projects)
      const statusMap: Record<string, number> = {};
      const typeMap: Record<string, number> = {};
      const latestStatusByProject: Record<string, string> = {};

      // Determine latest status for each project
      allUpdates?.forEach(u => {
          if (!latestStatusByProject[u.project_id]) {
              latestStatusByProject[u.project_id] = u.status_today;
          }
      });

      projects?.forEach((p) => {
          // Status Map
          const status = latestStatusByProject[p.id] || 'No Update';
          statusMap[status] = (statusMap[status] || 0) + 1;

          // Type Map
          const type = p.type || 'Other';
          typeMap[type] = (typeMap[type] || 0) + 1;
      });

      const statusCounts = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
      const typeCounts = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

      // Attach project name to updates
      const enrichedUpdates = recentUpdates?.map(u => {
          const p = projects?.find(proj => proj.id === u.project_id);
          return { ...u, project_name: p?.project_name || 'Unknown Project' };
      });

      setData({
          statusCounts,
          typeCounts,
          recentUpdates: enrichedUpdates || [],
          rawProjects: projects || []
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedType]);

  const handleGenerateBriefing = async () => {
      setGeneratingBriefing(true);
      
      // Map filtered data to the format expected by the service
      const mappedProjects: any[] = data.rawProjects.map(p => {
          // Find recent updates for this project within the current view
          const projectUpdates = data.recentUpdates
            .filter(u => u.project_id === p.id)
            .map(u => ({
                rag_status: u.status_today,
                summary_text: u.progress_note,
                risks_blockers: u.blocker_today
            }));

          return {
              name: p.project_name,
              status: projectUpdates[0]?.rag_status || 'Unknown',
              owner: { name: p.owner },
              updates: projectUpdates,
              milestones: [] 
          };
      });

      const htmlReport = await generateMondayBriefing(mappedProjects);
      setAiBriefing(htmlReport);
      setGeneratingBriefing(false);
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#94a3b8'];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h2>
            <p className="text-slate-500 text-sm mt-1">Portfolio health metrics and AI-generated insights.</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={fetchData} 
                disabled={loading}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh Data"
             >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
             </button>
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-bold shadow-sm">
                <Download size={16} /> Export CSV
             </button>
          </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="flex flex-col gap-1.5 w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Calendar size={12} /> Date Range
                  </label>
                  <div className="flex items-center gap-2">
                      <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500 w-full md:w-40"
                      />
                      <span className="text-slate-400 font-medium">to</span>
                      <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500 w-full md:w-40"
                      />
                  </div>
              </div>
              
              <div className="flex flex-col gap-1.5 w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Filter size={12} /> Project Type
                  </label>
                  <select 
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[180px]"
                  >
                      <option value="All">All Types</option>
                      {availableTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                      ))}
                  </select>
              </div>
          </div>
          
          {(selectedType !== 'All' || startDate !== new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) && (
              <button 
                onClick={() => {
                    setSelectedType('All');
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    setStartDate(d.toISOString().split('T')[0]);
                    setEndDate(new Date().toISOString().split('T')[0]);
                }}
                className="text-xs text-red-500 font-bold hover:text-red-700 flex items-center gap-1 py-2 px-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                  <X size={12} /> Clear Filters
              </button>
          )}
      </div>

      {loading ? (
          <div className="flex justify-center p-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <span className="text-slate-400 text-sm font-medium">Crunching the numbers...</span>
              </div>
          </div>
      ) : (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Status Distribution */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-600" />
                        Status Distribution
                    </h3>
                    <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">Current Snapshot</span>
                </div>
                <div className="h-64 w-full">
                    {data.statusCounts.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.statusCounts}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.statusCounts.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data matching filters</div>
                    )}
                </div>
            </div>

            {/* Chart 2: Project Types */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <FileText size={18} className="text-violet-600" />
                        Portfolio Composition
                    </h3>
                    <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">By Type</span>
                </div>
                <div className="h-64 w-full">
                    {data.typeCounts.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.typeCounts} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data matching filters</div>
                    )}
                </div>
            </div>
        </div>

        {/* AI Executive Briefing Section */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-lg overflow-hidden text-white">
            <div className="p-6 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                        <Bot size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">AI Executive Briefing</h3>
                        <p className="text-slate-400 text-sm">Analysis based on visible data ({data.recentUpdates.length} updates).</p>
                    </div>
                </div>
                <button 
                    onClick={handleGenerateBriefing}
                    disabled={generatingBriefing || data.recentUpdates.length === 0}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-900/50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generatingBriefing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                    Generate Briefing
                </button>
            </div>
            
            <div className="p-8 bg-slate-900/50 min-h-[200px]">
                {aiBriefing ? (
                    <div className="prose prose-invert prose-sm max-w-none animate-in fade-in slide-in-from-bottom-4">
                        <div dangerouslySetInnerHTML={{ __html: aiBriefing }} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-slate-500 gap-4">
                        <Bot size={48} className="opacity-20" />
                        <p>Click "Generate Briefing" to analyze the updates filtered above.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Recent Updates Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Update Feed</h3>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{data.recentUpdates.length}</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                    {startDate} → {endDate}
                </div>
            </div>
            {data.recentUpdates.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress Note</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {data.recentUpdates.map((update: any) => (
                                <tr key={update.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                        {update.project_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                                        {update.update_date}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                            update.status_today === 'On Track' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            update.status_today === 'At Risk' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            update.status_today === 'Delayed' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {update.status_today}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 max-w-md truncate">
                                        {update.progress_note}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-10 text-center text-slate-400 text-sm">
                    No updates found for the selected date range and filters.
                </div>
            )}
        </div>
      </>
      )}
    </div>
  );
};
