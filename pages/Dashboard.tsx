
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle, Loader2, RefreshCw, Trash2, Edit, Eye, Filter, ArrowUpRight, Clock, FileText, Search, X, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { DashboardProject } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<DashboardProject[]>([]);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [lifecycleFilter, setLifecycleFilter] = useState('Active'); // Active, Archived, All

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // 2. Fetch Latest Updates (Optimization: specific columns)
      const { data: updatesData, error: updatesError } = await supabase
        .from('project_daily_updates')
        .select('project_id, status_today, update_date, created_at')
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;

      // 3. Merge Data
      const merged: DashboardProject[] = projectsData.map(p => {
        // Find the most recent update for this project
        // Note: updatesData is ordered by created_at desc, so find() gets the latest
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

  const fetchTypes = async () => {
      const { data } = await supabase.from('project_types').select('name').order('name');
      if (data) setProjectTypes(data.map(t => t.name));
  };

  useEffect(() => {
    fetchDashboardData();
    fetchTypes();
  }, []);

  // Filter Logic
  useEffect(() => {
      let result = projects;

      // 1. Lifecycle
      if (lifecycleFilter === 'Active') {
          result = result.filter(p => p.active);
      } else if (lifecycleFilter === 'Archived') {
          result = result.filter(p => !p.active);
      }

      // 2. Type
      if (typeFilter !== 'All') {
          result = result.filter(p => p.type === typeFilter);
      }

      // 3. Status
      if (statusFilter !== 'All') {
          result = result.filter(p => {
             const currentStatus = p.latest_update?.status_today || 'No Update';
             return currentStatus === statusFilter;
          });
      }

      // 4. Search
      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          result = result.filter(p => 
              p.project_name.toLowerCase().includes(q) || 
              p.owner.toLowerCase().includes(q)
          );
      }

      setFilteredProjects(result);
  }, [projects, lifecycleFilter, typeFilter, statusFilter, searchQuery]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
        setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
        alert('Error deleting project: ' + err.message);
    }
  };

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.active).length;
  const atRiskCount = projects.filter(p => p.active && (p.latest_update?.status_today === 'At Risk' || p.latest_update?.status_today === 'Delayed')).length;

  const hasActiveFilters = searchQuery !== '' || typeFilter !== 'All' || statusFilter !== 'All' || lifecycleFilter !== 'Active';

  const resetFilters = () => {
      setSearchQuery('');
      setTypeFilter('All');
      setStatusFilter('All');
      setLifecycleFilter('Active');
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h2>
            <p className="text-slate-500 text-sm mt-1">Real-time portfolio performance and risk analysis.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
                to="/daily-log" 
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-sm hover:shadow-md"
            >
                <FileText size={16} />
                Add Daily Entry
            </Link>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

            <span className="text-xs text-slate-400 font-medium flex items-center gap-1 hidden sm:flex">
                <Clock size={12} /> Last updated: Just now
            </span>
            <button 
                onClick={fetchDashboardData}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm font-medium"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center gap-3 text-sm font-medium">
            <AlertTriangle size={18} />
            {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
            title="Total Portfolio" 
            value={totalProjects} 
            subtitle="Projects in system" 
            icon={<Activity size={20} />} 
            color="blue" 
        />
        <KPICard 
            title="Active Projects" 
            value={activeProjects} 
            subtitle="Currently in progress" 
            icon={<CheckCircle size={20} />} 
            color="emerald" 
            trend="Stable"
        />
        <KPICard 
            title="Projects At Risk" 
            value={atRiskCount} 
            subtitle="Require immediate attention" 
            icon={<AlertTriangle size={20} />} 
            color="red" 
            trend="+2 vs last week"
            isNegativeTrend
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col xl:flex-row gap-4 justify-between">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search projects or owners..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="relative md:w-48">
                        <select 
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer"
                        >
                            <option value="All">All Types</option>
                            {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Status Filter */}
                    <div className="relative md:w-48">
                         <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            <option value="On Track">On Track</option>
                            <option value="At Risk">At Risk</option>
                            <option value="Delayed">Delayed</option>
                            <option value="Completed">Completed</option>
                            <option value="On Hold">On Hold</option>
                            <option value="No Update">No Update</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Lifecycle Filter */}
                     <div className="relative md:w-40">
                         <select 
                            value={lifecycleFilter}
                            onChange={(e) => setLifecycleFilter(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer font-medium text-slate-600"
                        >
                            <option value="Active">Active Only</option>
                            <option value="Archived">Archived</option>
                            <option value="All">Everything</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {hasActiveFilters && (
                    <button 
                        onClick={resetFilters}
                        className="flex items-center justify-center px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                        <X size={16} className="mr-1" /> Clear Filters
                    </button>
                )}
            </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Header / Stats */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
            <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Projects List</h3>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{filteredProjects.length}</span>
            </div>
        </div>

        {loading ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-3 text-blue-600" size={32} />
                <span className="text-sm font-medium">Synchronizing portfolio data...</span>
            </div>
        ) : filteredProjects.length === 0 ? (
            <div className="p-20 text-center text-slate-400 bg-slate-50/50">
                <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                    <Filter size={20} />
                </div>
                <p className="font-medium text-slate-600">No projects found</p>
                <p className="text-sm mt-1">Adjust your filters to see more results.</p>
                {hasActiveFilters && (
                    <button onClick={resetFilters} className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-bold">Clear all filters</button>
                )}
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Project Name</th>
                            <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Owner</th>
                            <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Progress</th>
                            <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Update</th>
                            <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {filteredProjects.map((p) => {
                             const status = p.latest_update?.status_today || 'No Update';
                             let statusBadge;
                             
                             if (status === 'On Track') statusBadge = <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center w-fit gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>On Track</span>;
                             else if (status === 'At Risk') statusBadge = <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 flex items-center w-fit gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>At Risk</span>;
                             else if (status === 'Delayed') statusBadge = <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100 flex items-center w-fit gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>Delayed</span>;
                             else if (status === 'Completed') statusBadge = <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center w-fit gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Completed</span>;
                             else statusBadge = <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-slate-100">No Update</span>;

                             return (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                                                {p.project_name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <Link to={`/projects/${p.id}`} className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors block">
                                                    {p.project_name}
                                                </Link>
                                                {!p.active && <span className="text-[10px] text-slate-400 font-medium">Archived</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-500">
                                                {(p.owner || '?').charAt(0)}
                                            </div>
                                            {p.owner || 'Unassigned'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-0.5 text-[11px] rounded bg-white border border-slate-200 text-slate-500 font-medium shadow-sm">
                                            {p.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progress || 0}%` }}></div>
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-600">{p.progress || 0}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono text-xs">
                                        {p.latest_update ? p.latest_update.update_date : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {statusBadge}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                             <button 
                                                onClick={() => navigate(`/projects/${p.id}`)}
                                                className="p-1.5 hover:bg-white text-slate-400 hover:text-blue-600 rounded-md transition-colors border border-transparent hover:border-slate-200 hover:shadow-sm"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button 
                                                onClick={() => navigate(`/projects/${p.id}/edit`)}
                                                className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-700 rounded-md transition-colors border border-transparent hover:border-slate-200 hover:shadow-sm"
                                                title="Edit Project"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(p.id, p.project_name)}
                                                className="p-1.5 hover:bg-white text-slate-400 hover:text-red-600 rounded-md transition-colors border border-transparent hover:border-red-100 hover:shadow-sm"
                                                title="Delete Project"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
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

// Helper Component for KPI Cards
const KPICard: React.FC<{
    title: string;
    value: number;
    subtitle: string;
    icon: React.ReactNode;
    color: 'blue' | 'emerald' | 'red';
    trend?: string;
    isNegativeTrend?: boolean;
}> = ({ title, value, subtitle, icon, color, trend, isNegativeTrend }) => {
    
    const colorStyles = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        red: 'bg-red-50 text-red-600 border-red-100',
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-2.5 rounded-lg border ${colorStyles[color]}`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center text-xs font-bold ${isNegativeTrend ? 'text-red-600' : 'text-emerald-600'}`}>
                        {trend}
                        <ArrowUpRight size={14} className="ml-0.5" />
                    </div>
                )}
            </div>
            <div className="relative z-10">
                <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
                <div className="text-sm font-medium text-slate-500 mt-1">{title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
            </div>
            {/* Background Decoration */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                {React.cloneElement(icon as React.ReactElement<any>, { size: 100 })}
            </div>
        </div>
    );
};
