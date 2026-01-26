import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, TrendingUp, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { DashboardProject } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all active projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // 2. Fetch latest update for each project
      // Note: While we could use complex joins, doing a second query for updates is often simpler/safer 
      // if we don't have specific foreign keys or RLS complexity set up perfectly.
      // But let's try a direct relational query first if 'project_daily_updates' is linked.
      // Since schema instructions didn't specify the FK name explicitly beyond 'project_id',
      // we will manual join in JS for guaranteed safety given the "No console.log" rule.
      
      const { data: updatesData, error: updatesError } = await supabase
        .from('project_daily_updates')
        .select('project_id, status_today, update_date, created_at')
        .order('created_at', { ascending: false }); // Newest first

      if (updatesError) throw updatesError;

      // 3. Map updates to projects
      const merged: DashboardProject[] = projectsData.map(p => {
        const latest = updatesData?.find(u => u.project_id === p.id);
        return {
            ...p,
            latest_update: latest ? {
                status_today: latest.status_today,
                update_date: latest.update_date
            } : null
        };
      });

      setProjects(merged);

    } catch (err: any) {
      console.error('Dashboard Error:', err);
      setError('Failed to load dashboard data. Check database connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Calculate Stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.active).length;
  const atRiskCount = projects.filter(p => p.latest_update?.status_today === 'At Risk' || p.latest_update?.status_today === 'Delayed').length;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Executive Dashboard</h2>
            <p className="text-slate-500 mt-1">Real-time portfolio overview from Supabase.</p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
            <AlertTriangle size={20} />
            {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Activity size={24} /></div>
            </div>
            <div className="text-4xl font-bold text-slate-900">{totalProjects}</div>
            <div className="text-sm font-medium text-slate-500 mt-1">Total Projects</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle size={24} /></div>
            </div>
            <div className="text-4xl font-bold text-slate-900">{activeProjects}</div>
            <div className="text-sm font-medium text-slate-500 mt-1">Active Projects</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between mb-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={24} /></div>
            </div>
            <div className="text-4xl font-bold text-slate-900">{atRiskCount}</div>
            <div className="text-sm font-medium text-slate-500 mt-1">At Risk / Delayed</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900">Portfolio Status</h3>
        </div>

        {loading ? (
            <div className="p-12 flex justify-center text-slate-400">
                <Loader2 className="animate-spin mr-2" /> Loading data...
            </div>
        ) : projects.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
                No projects found in database.
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Project Name</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Owner</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Latest Update</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {projects.map((p) => {
                             const status = p.latest_update?.status_today || 'No Update';
                             let badgeClass = 'bg-slate-100 text-slate-600';
                             if (status === 'On Track') badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                             if (status === 'At Risk') badgeClass = 'bg-amber-100 text-amber-800 border border-amber-200';
                             if (status === 'Delayed') badgeClass = 'bg-red-100 text-red-800 border border-red-200';
                             if (status === 'Completed') badgeClass = 'bg-blue-100 text-blue-800 border border-blue-200';

                             return (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-900">{p.project_name}</div>
                                        {!p.active && <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-600">Inactive</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{p.owner}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs rounded bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                                            {p.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {p.latest_update ? p.latest_update.update_date : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 text-xs rounded-full font-bold ${badgeClass}`}>
                                            {status}
                                        </span>
                                    </td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};