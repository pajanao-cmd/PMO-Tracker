import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FileText, Loader2, RefreshCw, Zap, TrendingUp, Download, Bot } from 'lucide-react';
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

  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select('*');
      
      if (projError) throw projError;

      // Fetch latest updates for context
      const { data: updates, error: upError } = await supabase
        .from('project_daily_updates')
        .select('*')
        .order('update_date', { ascending: false })
        .limit(20);

      if (upError) throw upError;

      // Process Status Counts
      const statusMap: Record<string, number> = {};
      const typeMap: Record<string, number> = {};

      projects?.forEach((p) => {
          // Status Map
          // Note: In a real app we'd join with the latest status, here we use the project's 'active' or 'status' field if updated
          // For this view, let's look for the latest update status for this project
          const latest = updates?.find(u => u.project_id === p.id);
          const status = latest?.status_today || 'No Update';
          statusMap[status] = (statusMap[status] || 0) + 1;

          // Type Map
          const type = p.type || 'Other';
          typeMap[type] = (typeMap[type] || 0) + 1;
      });

      const statusCounts = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
      const typeCounts = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

      // Attach project name to updates
      const enrichedUpdates = updates?.map(u => {
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
  }, []);

  const handleGenerateBriefing = async () => {
      setGeneratingBriefing(true);
      
      // Map data to the format expected by the service
      // We need to mock the structure slightly as the service expects 'ProjectDetail[]' 
      // but 'rawProjects' are simple 'Project[]'.
      const mappedProjects: any[] = data.rawProjects.map(p => {
          // Find recent updates for this project
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

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h2>
            <p className="text-slate-500 text-sm mt-1">Portfolio health metrics and AI-generated insights.</p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={fetchData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw size={18} />
             </button>
             <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-bold shadow-sm">
                <Download size={16} /> Export CSV
             </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Status Distribution */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp size={18} className="text-blue-600" />
                      Project Status Distribution
                  </h3>
              </div>
              <div className="h-64 w-full">
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
              </div>
          </div>

          {/* Chart 2: Project Types */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <FileText size={18} className="text-violet-600" />
                      Portfolio Composition
                  </h3>
              </div>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.typeCounts} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                  </ResponsiveContainer>
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
                    <p className="text-slate-400 text-sm">Automated Monday morning portfolio analysis.</p>
                  </div>
              </div>
              <button 
                onClick={handleGenerateBriefing}
                disabled={generatingBriefing}
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
                     <p>Click "Generate Briefing" to analyze all project updates from the last 7 days.</p>
                 </div>
             )}
          </div>
      </div>

      {/* Recent Updates Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Live Feed: Recent Updates</h3>
          </div>
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
      </div>
    </div>
  );
};