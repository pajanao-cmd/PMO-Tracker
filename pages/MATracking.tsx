
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Calendar, AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw, ArrowRight, Eye, MoreHorizontal, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Project } from '../types';

interface MAProject extends Project {
  ma_status: 'Active' | 'Expiring Soon' | 'Expired' | 'Pending';
  days_remaining: number;
  progress_percent: number;
}

export const MATracking: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<MAProject[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    expiring: 0,
    expired: 0,
    totalBudget: 0
  });

  const fetchMAData = async () => {
    setLoading(true);
    try {
      // Fetch only projects with MA enabled
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('has_ma', true)
        .order('ma_end_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      
      const processed: MAProject[] = (data || []).map((p: Project) => {
        const start = p.ma_start_date ? new Date(p.ma_start_date) : null;
        const end = p.ma_end_date ? new Date(p.ma_end_date) : null;
        
        let ma_status: MAProject['ma_status'] = 'Pending';
        let days_remaining = 0;
        let progress_percent = 0;

        if (start && end) {
            const totalDuration = end.getTime() - start.getTime();
            const elapsed = today.getTime() - start.getTime();
            const remaining = end.getTime() - today.getTime();
            
            days_remaining = Math.ceil(remaining / (1000 * 60 * 60 * 24));
            progress_percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

            if (today < start) {
                ma_status = 'Pending';
            } else if (today > end) {
                ma_status = 'Expired';
                days_remaining = 0;
                progress_percent = 100;
            } else if (days_remaining <= 30) {
                ma_status = 'Expiring Soon';
            } else {
                ma_status = 'Active';
            }
        }

        return {
            ...p,
            ma_status,
            days_remaining,
            progress_percent
        };
      });

      setProjects(processed);
      setStats({
          active: processed.filter(p => p.ma_status === 'Active').length,
          expiring: processed.filter(p => p.ma_status === 'Expiring Soon').length,
          expired: processed.filter(p => p.ma_status === 'Expired').length,
          totalBudget: processed.reduce((acc, curr) => acc + (curr.total_budget || 0), 0)
      });

    } catch (error) {
      console.error('Error fetching MA projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMAData();
  }, []);

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
          case 'Expiring Soon': return 'bg-amber-50 text-amber-700 border-amber-200';
          case 'Expired': return 'bg-red-50 text-red-700 border-red-200';
          case 'Pending': return 'bg-slate-50 text-slate-700 border-slate-200';
          default: return 'bg-slate-50 text-slate-700';
      }
  };

  const getProgressBarColor = (status: string) => {
      switch (status) {
          case 'Active': return 'bg-emerald-500';
          case 'Expiring Soon': return 'bg-amber-500';
          case 'Expired': return 'bg-red-500';
          default: return 'bg-slate-300';
      }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">MA Tracking Board</h2>
            <p className="text-slate-500 text-sm mt-1">Monitor post-project maintenance agreements, renewals, and SLAs.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1 hidden sm:flex">
                <Clock size={12} /> Live Status
            </span>
            <button 
                onClick={fetchMAData}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm font-medium"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
            </button>
          </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                  <ShieldCheck size={24} />
              </div>
              <div>
                  <div className="text-3xl font-bold text-slate-900">{stats.active}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Contracts</div>
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
                  <Clock size={24} />
              </div>
              <div>
                  <div className="text-3xl font-bold text-slate-900">{stats.expiring}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiring Soon</div>
                  <div className="text-[10px] text-amber-600 font-medium mt-0.5">Renewals needed within 30 days</div>
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-lg text-red-600 border border-red-100">
                  <AlertTriangle size={24} />
              </div>
              <div>
                  <div className="text-3xl font-bold text-slate-900">{stats.expired}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expired / No Coverage</div>
              </div>
          </div>
      </div>

      {/* MA Grid */}
      {loading ? (
          <div className="flex justify-center p-20">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
      ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <ShieldCheck size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Active Maintenance Agreements</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                  Projects will appear here once they reach 100% completion and have MA tracking enabled in their settings.
              </p>
          </div>
      ) : (
          <div className="grid grid-cols-1 gap-4">
              {projects.map((project) => (
                  <div key={project.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col md:flex-row md:items-center gap-6">
                      
                      {/* Project Info */}
                      <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-3 mb-1">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(project.ma_status)}`}>
                                  {project.ma_status}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">{project.type}</span>
                          </div>
                          <Link to={`/projects/${project.id}`} className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                              {project.project_name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                              <User size={12} /> {project.owner}
                          </div>
                      </div>

                      {/* Timeline Visualization */}
                      <div className="flex-[2] w-full">
                          <div className="flex justify-between items-end mb-2 text-xs">
                              <div className="flex items-center gap-1 font-mono text-slate-500">
                                  <Calendar size={12} /> {project.ma_start_date}
                              </div>
                              <div className="font-bold text-slate-700">
                                  {project.ma_status === 'Expired' 
                                    ? 'Coverage Ended' 
                                    : `${project.days_remaining} Days Remaining`
                                  }
                              </div>
                              <div className="flex items-center gap-1 font-mono text-slate-500">
                                  {project.ma_end_date} <FlagIcon />
                              </div>
                          </div>
                          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                              <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${getProgressBarColor(project.ma_status)}`} 
                                  style={{ width: `${project.progress_percent}%` }}
                              ></div>
                              {/* Markers for Quarters */}
                              <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/50"></div>
                              <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white/50"></div>
                              <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/50"></div>
                          </div>
                      </div>

                      {/* Financials & Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-6 min-w-[200px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 mt-2 md:mt-0">
                          <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget/Value</div>
                              <div className="font-mono font-bold text-slate-700">
                                {project.total_budget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.total_budget) : '-'}
                              </div>
                          </div>
                          
                          <Link 
                            to={`/projects/${project.id}`} 
                            className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all"
                            title="View Details"
                          >
                              <ArrowRight size={20} />
                          </Link>
                      </div>

                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

const FlagIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
);
