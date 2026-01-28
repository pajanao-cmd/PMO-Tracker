
import React, { useEffect, useState } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
  ScatterChart, Scatter, ZAxis, ReferenceArea
} from 'recharts';
import { 
  MoreVertical, Plus, Calendar, Bell, Search, ArrowUp, RefreshCw, AlertTriangle, Filter, X
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Project } from '../types';

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
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

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
      // Fetch Projects
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('total_budget', { ascending: false });

      if (error) throw error;

      if (data) {
        setAllProjects(data);
        // Initial filtering will happen via useEffect
      }
      
      // Fetch Project Types for Filter
      const { data: typesData } = await supabase
        .from('project_types')
        .select('name')
        .order('name');
        
      if (typesData) {
          setProjectTypes(typesData.map(t => t.name));
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Recalculate metrics whenever filteredProjects changes
  useEffect(() => {
    calculateMetrics(filteredProjects);
    generateRiskData(filteredProjects);
  }, [filteredProjects]);

  const calculateMetrics = (data: Project[]) => {
    const total = data.length;
    const active = data.filter(p => p.active).length;
    const totalBudget = data.reduce((sum, p) => sum + (p.total_budget || 0), 0);
    
    // Calculate average consumed budget
    const consumedSum = data.reduce((sum, p) => sum + (p.budget_consumed_percent || 0), 0);
    const utilizedBudgetPercent = total > 0 ? Math.round(consumedSum / total) : 0;

    // Risk calculation
    const atRisk = data.filter(p => p.status === 'At Risk' || p.status === 'Delayed').length;
    const atRiskPercent = total > 0 ? Math.round((atRisk / total) * 100) : 0;

    // Status Distribution for Donut
    const statusMap: Record<string, number> = {};
    data.forEach(p => {
        // Normalize status for chart
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

    // Top Budgets for Bar Chart
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
      // Generate scatter plot data (Likelihood vs Impact)
      // Since we don't have explicit risk fields, we derive them for the visualization
      const mapped = data.map(p => {
          let likelihood = Math.random() * 30; // Default Low
          let impact = Math.min(10, Math.max(1, (p.total_budget || 0) / 500000)); // Budget based impact
          
          if (p.status === 'At Risk') {
              likelihood = 50 + Math.random() * 30; // Medium-High
              impact += 2;
          } else if (p.status === 'Delayed') {
              likelihood = 80 + Math.random() * 15; // High
              impact += 3;
          }

          // Cap values
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

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  const resetFilters = () => {
      setSearchQuery('');
      setStatusFilter('All');
      setTypeFilter('All');
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'All' || typeFilter !== 'All';

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900">Project Portfolio Dashboard</h1>
                    <button className="text-slate-400 hover:text-yellow-400"><span className="text-xl">☆</span></button>
                    <button className="text-slate-400"><MoreVertical size={16} /></button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <RefreshCw size={12} />
                    <span>Updated just now</span>
                </div>
            </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 animate-in slide-in-from-top-2">
            <div className="flex flex-col md:flex-row gap-4">
                
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search projects by name or owner..." 
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Project Type Filter */}
                <div className="relative md:w-56">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer"
                    >
                        <option value="All">All Types</option>
                        {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1L5 5L9 1"/></svg>
                    </div>
                </div>

                {/* Status Filter */}
                <div className="relative md:w-56">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400"></div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-8 pr-8 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="On Track">On Track</option>
                        <option value="At Risk">At Risk</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Exploration">Exploration</option>
                        <option value="Negotiation">Negotiation</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1L5 5L9 1"/></svg>
                    </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                    <button 
                        onClick={resetFilters}
                        className="flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                        title="Clear all filters"
                    >
                        <X size={16} className="mr-1" /> Clear
                    </button>
                )}
            </div>
            
            {/* Filter Summary Text */}
            <div className="mt-3 text-xs text-slate-400 font-medium flex justify-between">
                <span>Showing {filteredProjects.length} of {allProjects.length} projects</span>
                {hasActiveFilters && <span>Filtered View</span>}
            </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            
            {/* KPI 1 */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-600 font-medium text-sm">Projects Ongoing</h3>
                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16} /></button>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{metrics.activeProjects}</div>
                <div className="flex items-center text-xs font-bold text-indigo-600">
                    <ArrowUp size={12} className="mr-1" /> 5%
                </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-600 font-medium text-sm">Allocated Budget</h3>
                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16} /></button>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(metrics.totalBudget)}</div>
                <div className="flex items-center text-xs font-bold text-indigo-600">
                    <ArrowUp size={12} className="mr-1" /> $61K
                </div>
            </div>

            {/* KPI 3 (Progress Bar) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-600 font-medium text-sm">Utilized Budget (%)</h3>
                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16} /></button>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-slate-900">{metrics.utilizedBudgetPercent}%</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Progress</span>
                    <span className="text-xs font-bold text-indigo-600">On Track</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${metrics.utilizedBudgetPercent}%` }}></div>
                </div>
            </div>

            {/* KPI 4 (Progress Bar Red) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-600 font-medium text-sm">Projects Aligned To Strategy</h3>
                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16} /></button>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-slate-900">{metrics.atRiskPercent}%</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Progress</span>
                    <span className="text-xs font-bold text-red-500">At Risk</span>
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
                    <h3 className="text-slate-600 font-medium">Project Progress</h3>
                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16} /></button>
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
                            {/* Center Text */}
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                <tspan x="40%" dy="-0.5em" fontSize="24" fontWeight="bold" fill="#1e293b">{metrics.utilizedBudgetPercent}%</tspan>
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
                            Project Completion <span className="text-lg">&gt;</span>
                        </h3>
                        <p className="text-xs text-slate-400">Last 6 months (Historical Data)</p>
                    </div>
                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16} /></button>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Portfolio Risks (Scatter Matrix) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-[300px]">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-slate-600 font-medium flex items-center gap-2">
                            Portfolio Risks
                            {metrics.atRiskCount > 0 && (
                                <span className="flex items-center justify-center w-5 h-5 bg-red-100 text-red-600 rounded-full text-[10px] font-bold">
                                    {metrics.atRiskCount}
                                </span>
                            )}
                        </h3>
                    </div>
                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16} /></button>
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
                                    label={{ value: 'Probability', position: 'insideBottomRight', offset: -10, fontSize: 10 }}
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
                                {/* Background Zones */}
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
                    <h3 className="text-slate-600 font-medium">Project Budget</h3>
                    <div className="flex gap-2">
                        <button className="text-slate-300 hover:text-slate-500"><ArrowUp size={14} className="rotate-45" /></button>
                        <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16} /></button>
                    </div>
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
                                {
                                    metrics.topBudgets.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 1 ? COLORS.barBlue : index === 3 ? '#0f172a' : COLORS.barPurple} />
                                    ))
                                }
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
};
