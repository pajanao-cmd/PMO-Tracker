
import React, { useEffect, useState, useRef } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
  ScatterChart, Scatter, ZAxis, ReferenceArea
} from 'recharts';
import { 
  MoreVertical, Calendar, Bell, Search, ArrowUp, RefreshCw, Filter, X, Bot, Zap, Loader2, Download, TrendingUp, FileText, CheckCircle, AlertTriangle, ChevronDown, Check
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { generateMondayBriefing } from '../services/geminiService';
import { Project, ProjectStatus } from '../types';

// --- Types & Interfaces ---

interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalBudget: number;
  utilizedBudgetPercent: number;
  atRiskCount: number;
  atRiskPercent: number;
  statusDistribution: { name: string; value: number; color: string }[];
  topBudgets: { name: string; value: number }[];
}

interface EnrichedUpdate {
    id: string;
    project_id: string;
    project_name: string;
    update_date: string;
    status_today: string;
    progress_note: string;
    blocker_today: string | null;
}

// --- Components ---

const ProjectTypeDropdown = ({ 
    options, 
    value, 
    onChange 
}: { 
    options: string[], 
    value: string, 
    onChange: (val: string) => void 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative md:w-56" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between transition-all"
            >
                <div className="flex items-center gap-2 truncate">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <span className={`truncate ${value === 'All' ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                        {value === 'All' ? 'All Types' : value}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-200 py-2 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 pb-2 border-b border-slate-100 mb-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-slate-200">
                        <div 
                            className="px-2 py-1.5 hover:bg-slate-50 rounded-md cursor-pointer flex items-center gap-2 text-sm text-slate-600 mb-1"
                            onClick={() => { onChange('All'); setIsOpen(false); }}
                        >
                            <div className={`w-4 h-4 flex items-center justify-center ${value === 'All' ? 'text-blue-600' : 'text-transparent'}`}>
                                <Check size={14} />
                            </div>
                            All Types
                        </div>
                        {filteredOptions.length > 0 ? filteredOptions.map(option => (
                            <div 
                                key={option}
                                className="px-2 py-1.5 hover:bg-slate-50 rounded-md cursor-pointer flex items-center gap-2 text-sm text-slate-700"
                                onClick={() => { onChange(option); setIsOpen(false); }}
                            >
                                <div className={`w-4 h-4 flex items-center justify-center ${value === option ? 'text-blue-600' : 'text-transparent'}`}>
                                    <Check size={14} />
                                </div>
                                {option}
                            </div>
                        )) : (
                            <div className="px-2 py-4 text-xs text-slate-400 text-center">No types found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Mock Data Generators for Visuals (where DB history is missing) ---
const generateMonthlyData = () => {
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  return months.map(m => ({
    name: m,
    completed: Math.floor(Math.random() * 100) + 200, // Random 200-300
    delayed: Math.floor(Math.random() * 50) + 20,     // Random 20-70
    average: 350 // Reference line
  }));
};

const COLORS = {
  purple: '#6366f1',
  lime: '#a3e635',
  blue: '#1e3a8a',
  orange: '#f97316',
  red: '#ef4444',
  green: '#10b981',
  barPurple: '#6366f1',
  barLightPurple: '#c7d2fe',
  barBlue: '#0ea5e9'
};

export const SalesPipeline: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<EnrichedUpdate[]>([]);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // AI State
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  // Visual State
  const [riskData, setRiskData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProjects: 0,
    activeProjects: 0,
    totalBudget: 0,
    utilizedBudgetPercent: 0,
    atRiskCount: 0,
    atRiskPercent: 0,
    statusDistribution: [],
    topBudgets: []
  });

  const [monthlyData] = useState(generateMonthlyData());

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Projects
      const { data: projectsData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('total_budget', { ascending: false });

      if (projError) throw projError;
      if (projectsData) {
        setAllProjects(projectsData);
      }
      
      // 2. Fetch Project Types
      const { data: typesData } = await supabase
        .from('project_types')
        .select('name')
        .order('name');
        
      if (typesData) {
          setProjectTypes(typesData.map(t => t.name));
      }

      // 3. Fetch Updates (for Feed and AI)
      const { data: updatesData, error: updatesError } = await supabase
        .from('project_daily_updates')
        .select('*')
        .gte('update_date', startDate)
        .lte('update_date', endDate)
        .order('update_date', { ascending: false });

      if (updatesError) throw updatesError;

      if (updatesData && projectsData) {
          const enriched = updatesData.map((u: any) => {
              const proj = projectsData.find(p => p.id === u.project_id);
              return {
                  ...u,
                  project_name: proj?.project_name || 'Unknown Project'
              };
          });
          setRecentUpdates(enriched);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]); // Re-fetch updates when date range changes

  // Filtering Logic
  useEffect(() => {
    let result = allProjects;

    if (statusFilter !== 'All') {
        result = result.filter(p => p.status === statusFilter);
    }

    if (typeFilter !== 'All') {
        result = result.filter(p => p.type === typeFilter);
    }

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(p => 
            p.project_name.toLowerCase().includes(q) || 
            (p.owner && p.owner.toLowerCase().includes(q))
        );
    }

    setFilteredProjects(result);
  }, [allProjects, statusFilter, typeFilter, searchQuery]);

  // Recalculate metrics
  useEffect(() => {
    calculateMetrics(filteredProjects);
    generateRiskData(filteredProjects);
  }, [filteredProjects]);

  const calculateMetrics = (data: Project[]) => {
    const total = data.length;
    const active = data.filter(p => p.active).length;
    const totalBudget = data.reduce((sum, p) => sum + (p.total_budget || 0), 0);
    
    const consumedSum = data.reduce((sum, p) => sum + (p.budget_consumed_percent || 0), 0);
    const utilizedBudgetPercent = total > 0 ? Math.round(consumedSum / total) : 0;

    const atRisk = data.filter(p => p.status === 'At Risk' || p.status === 'Delayed').length;
    const atRiskPercent = total > 0 ? Math.round((atRisk / total) * 100) : 0;

    // Status Distribution
    const statusMap: Record<string, number> = {};
    data.forEach(p => {
        let s = p.status || 'On Track';
        if (s === 'Exploration' || s === 'Negotiation') s = 'Stand-by'; 
        if (s === 'On Track') s = 'In progress';
        statusMap[s] = (statusMap[s] || 0) + 1;
    });

    const statusDist = Object.keys(statusMap).map(key => ({
        name: key,
        value: statusMap[key],
        color: key === 'In progress' ? COLORS.purple 
             : key === 'Completed' ? COLORS.blue 
             : key === 'Stand-by' ? COLORS.lime 
             : COLORS.orange
    }));

    // Top Budgets
    const topBudgets = data
        .slice(0, 5)
        .map(p => ({
            name: p.project_name.length > 15 ? p.project_name.substring(0, 15) + '...' : p.project_name,
            value: p.total_budget || 0
        }));

    setMetrics({
        totalProjects: total,
        activeProjects: active,
        totalBudget,
        utilizedBudgetPercent,
        atRiskCount: atRisk,
        atRiskPercent,
        statusDistribution: statusDist,
        topBudgets
    });
  };

  const generateRiskData = (data: Project[]) => {
      const mapped = data.map(p => {
          let likelihood = Math.random() * 30;
          let impact = Math.min(10, Math.max(1, (p.total_budget || 0) / 500000));
          
          if (p.status === 'At Risk') {
              likelihood = 50 + Math.random() * 30;
              impact += 2;
          } else if (p.status === 'Delayed') {
              likelihood = 80 + Math.random() * 15;
              impact += 3;
          }

          likelihood = Math.min(98, likelihood);
          impact = Math.min(9.5, impact);

          return {
              name: p.project_name,
              likelihood: Math.round(likelihood),
              impact: parseFloat(impact.toFixed(1)),
              status: p.status || 'On Track',
              budget: p.total_budget
          };
      });
      setRiskData(mapped);
  };

  const handleGenerateBriefing = async () => {
      setGeneratingBriefing(true);
      
      // Map data for AI service
      const mappedProjects: any[] = filteredProjects.map(p => {
          const updates = recentUpdates
            .filter(u => u.project_id === p.id)
            .map(u => ({
                rag_status: u.status_today,
                summary_text: u.progress_note,
                risks_blockers: u.blocker_today
            }));

          return {
              name: p.project_name,
              status: p.status || 'Unknown',
              owner: { name: p.owner },
              updates: updates,
              milestones: [] 
          };
      });

      const htmlReport = await generateMondayBriefing(mappedProjects);
      setAiBriefing(htmlReport);
      setGeneratingBriefing(false);
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  const resetFilters = () => {
      setSearchQuery('');
      setStatusFilter('All');
      setTypeFilter('All');
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'All' || typeFilter !== 'All';

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900">Portfolio Analytics & Reporting</h1>
                    <button className="text-slate-400 hover:text-yellow-400"><span className="text-xl">☆</span></button>
                    <button className="text-slate-400"><MoreVertical size={16} /></button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <RefreshCw size={12} />
                    <span>Last updated: Just now</span>
                </div>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={handleGenerateBriefing}
                    disabled={generatingBriefing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-sm text-sm font-bold transition-all disabled:opacity-70"
                 >
                    {generatingBriefing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="text-yellow-400" />}
                    Generate Executive Briefing
                 </button>
            </div>
        </div>

        {/* AI Briefing Section (Conditional) */}
        {aiBriefing && (
            <div className="mb-6 bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden text-slate-200 animate-in fade-in slide-in-from-top-4">
                 <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                     <div className="flex items-center gap-2 text-blue-400 font-bold">
                         <Bot size={18} /> AI Executive Summary
                     </div>
                     <button onClick={() => setAiBriefing(null)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                 </div>
                 <div className="p-8 prose prose-invert max-w-none prose-sm">
                     <div dangerouslySetInnerHTML={{ __html: aiBriefing }} />
                 </div>
            </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 animate-in slide-in-from-top-2">
            <div className="flex flex-col xl:flex-row gap-4 justify-between">
                
                {/* Text & Dropdown Filters */}
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <ProjectTypeDropdown 
                        options={projectTypes} 
                        value={typeFilter} 
                        onChange={setTypeFilter} 
                    />

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
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 pointer-events-none"></div>
                    </div>
                </div>
                
                {/* Date Range & Clear */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <div className="flex items-center px-2 text-slate-400">
                            <Calendar size={14} />
                        </div>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 w-32 p-1.5"
                        />
                        <span className="text-slate-300">-</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 w-32 p-1.5"
                        />
                    </div>

                    {hasActiveFilters && (
                        <button 
                            onClick={resetFilters}
                            className="flex items-center justify-center px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            <X size={16} className="mr-1" /> Clear
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-600 font-medium text-sm">Projects Ongoing</h3>
                    <MoreVertical size={16} className="text-slate-300" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{metrics.activeProjects}</div>
                <div className="flex items-center text-xs font-bold text-indigo-600">
                    <ArrowUp size={12} className="mr-1" /> <span className="text-slate-400 font-normal">Active in period</span>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-600 font-medium text-sm">Total Budget</h3>
                    <MoreVertical size={16} className="text-slate-300" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(metrics.totalBudget)}</div>
                <div className="flex items-center text-xs font-bold text-indigo-600">
                    <ArrowUp size={12} className="mr-1" /> <span className="text-slate-400 font-normal">Allocated</span>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-600 font-medium text-sm">Avg. Utilization</h3>
                    <MoreVertical size={16} className="text-slate-300" />
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-slate-900">{metrics.utilizedBudgetPercent}%</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Consumed</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${metrics.utilizedBudgetPercent}%` }}></div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-600 font-medium text-sm">Risk Exposure</h3>
                    <MoreVertical size={16} className="text-slate-300" />
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-slate-900">{metrics.atRiskPercent}%</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Of Portfolio</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${metrics.atRiskPercent}%` }}></div>
                </div>
            </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Donut Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-slate-600 font-medium">Status Distribution</h3>
                </div>
                <div className="flex-1 min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={metrics.statusDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={0}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                            >
                                {metrics.statusDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                                ))}
                            </Pie>
                            <Legend 
                                layout="vertical" 
                                verticalAlign="middle" 
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ fontSize: '12px', color: '#64748b' }}
                            />
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                <tspan x="40%" dy="-0.5em" fontSize="24" fontWeight="bold" fill="#1e293b">{metrics.totalProjects}</tspan>
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bar Chart (Project Completion) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-indigo-600 font-bold flex items-center gap-1 cursor-pointer">
                            Monthly Completion Trends <span className="text-lg">&gt;</span>
                        </h3>
                        <p className="text-xs text-slate-400">Historical velocity (Mock Data)</p>
                    </div>
                </div>
                
                <div className="flex-1 min-h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={monthlyData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                            barSize={40}
                        >
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
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <ReferenceLine y={350} stroke="#6366f1" strokeDasharray="3 3" />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                            <Bar dataKey="completed" name="Completed in time" stackId="a" fill={COLORS.barPurple} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="delayed" name="Delayed" stackId="a" fill={COLORS.barLightPurple} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Portfolio Risks (Scatter Matrix) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-[300px]">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-slate-600 font-medium flex items-center gap-2">
                            Risk Matrix
                            {metrics.atRiskCount > 0 && (
                                <span className="flex items-center justify-center w-5 h-5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">
                                    {metrics.atRiskCount}
                                </span>
                            )}
                        </h3>
                    </div>
                </div>
                <div className="flex-1 w-full relative">
                    {riskData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    type="number" 
                                    dataKey="likelihood" 
                                    name="Likelihood" 
                                    unit="%" 
                                    domain={[0, 100]} 
                                    tick={{ fontSize: 10 }}
                                    label={{ value: 'Prob.', position: 'insideBottomRight', offset: -10, fontSize: 10 }}
                                />
                                <YAxis 
                                    type="number" 
                                    dataKey="impact" 
                                    name="Impact" 
                                    domain={[0, 10]} 
                                    tick={{ fontSize: 10 }}
                                    label={{ value: 'Impact', angle: -90, position: 'insideLeft', fontSize: 10 }}
                                />
                                <ZAxis type="number" dataKey="budget" range={[50, 400]} />
                                <Tooltip 
                                    cursor={{ strokeDasharray: '3 3' }} 
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs">
                                                    <p className="font-bold text-slate-800 mb-1">{data.name}</p>
                                                    <p className="text-slate-500">Status: <span className="font-semibold text-slate-700">{data.status}</span></p>
                                                    <p className="text-slate-500">Prob: {data.likelihood}% | Impact: {data.impact}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceArea x1={0} x2={50} y1={0} y2={5} fill="#f0fdf4" fillOpacity={0.3} /> 
                                <ReferenceArea x1={50} x2={100} y1={5} y2={10} fill="#fef2f2" fillOpacity={0.3} />
                                <Scatter name="Projects" data={riskData} fill="#8884d8">
                                    {riskData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={
                                                entry.status === 'Delayed' ? COLORS.red : 
                                                entry.status === 'At Risk' ? COLORS.orange : 
                                                entry.status === 'Completed' ? COLORS.blue :
                                                COLORS.green
                                            } 
                                        />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data available</div>
                    )}
                </div>
            </div>

            {/* Project Budget (Horizontal Bar) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-[300px]">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-600 font-medium">Top Budgets</h3>
                </div>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={metrics.topBudgets}
                            margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                            barSize={24}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 500 }} 
                                width={100}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(val) => formatCurrency(Number(val))}
                            />
                            <Bar dataKey="value" fill={COLORS.barPurple} radius={[0, 4, 4, 0]}>
                                {metrics.topBudgets.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 1 ? COLORS.barBlue : index === 3 ? '#0f172a' : COLORS.barPurple} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Update Feed Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Recent Updates Feed</h3>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{recentUpdates.length}</span>
                </div>
                <div className="flex gap-2">
                    <button className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>
            {recentUpdates.length > 0 ? (
                <div className="overflow-x-auto max-h-[400px]">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Note</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Blockers</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {recentUpdates.map((update) => (
                                <tr key={update.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                        {update.project_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                                        {update.update_date}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 w-fit ${
                                            update.status_today === 'On Track' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            update.status_today === 'At Risk' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            update.status_today === 'Delayed' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {update.status_today === 'Completed' && <CheckCircle size={10} />}
                                            {update.status_today === 'At Risk' && <AlertTriangle size={10} />}
                                            {update.status_today}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                                        {update.progress_note}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-red-600 font-medium max-w-xs truncate">
                                        {update.blocker_today}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-10 text-center text-slate-400 text-sm">
                    No updates found for the selected filters.
                </div>
            )}
        </div>
    </div>
  );
};
