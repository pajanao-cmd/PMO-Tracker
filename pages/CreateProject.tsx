
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, User, Tag, ArrowRight, LayoutDashboard, Loader2, AlertCircle, Settings, DollarSign, Repeat } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ProjectTypeManager } from '../components/ProjectTypeManager';
import { ProjectType } from '../types';

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  
  // Data State
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    project_name: '',
    type: 'Digital',
    owner: '',
    start_date: '',
    end_date: '',
    progress: 0,
    total_budget: '',
    billing_cycle_count: 1
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectTypes();
  }, []);

  const fetchProjectTypes = async () => {
    const { data } = await supabase.from('project_types').select('*').order('name');
    if (data && data.length > 0) {
        setProjectTypes(data);
        // Ensure default type is valid if current selection is invalid
        const exists = data.some(t => t.name === formData.type);
        if (!exists && formData.type === 'Digital') {
             setFormData(prev => ({ ...prev, type: data[0].name }));
        }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        
        // Smart Date Validation & Auto-fill
        if (name === 'start_date') {
            // 1. Validation: If Start Date is pushed beyond End Date, push End Date to match
            if (newData.end_date && value > newData.end_date) {
                newData.end_date = value;
            }
            // 2. Usability: If End Date is empty, default it to Start Date + 3 months
            if (!newData.end_date && value) {
                const start = new Date(value);
                const defaultEnd = new Date(start.setMonth(start.getMonth() + 3));
                if (!isNaN(defaultEnd.getTime())) {
                    newData.end_date = defaultEnd.toISOString().split('T')[0];
                }
            }
        }
        
        if (name === 'end_date') {
            // If End Date is pulled before Start Date, pull Start Date to match
            if (newData.start_date && value < newData.start_date) {
                newData.start_date = value;
            }
        }

        return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    
    try {
        const { error } = await supabase
            .from('projects')
            .insert([
                {
                    project_name: formData.project_name,
                    owner: formData.owner,
                    type: formData.type,
                    start_date: formData.start_date || new Date().toISOString().split('T')[0],
                    end_date: formData.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    progress: formData.progress,
                    total_budget: formData.total_budget ? parseFloat(formData.total_budget) : 0,
                    billing_cycle_count: formData.billing_cycle_count,
                    active: true
                }
            ]);

        if (error) throw error;

        // Redirect to dashboard on success
        navigate('/dashboard');

    } catch (error: any) {
        console.error('Error creating project:', error);
        setErrorMsg(error.message || 'Failed to create project');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-20">
      
      <div className="flex items-center gap-4 mb-2 md:mb-6 px-1 md:px-0">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 flex-shrink-0 transition-all">
            <Plus size={20} className="md:w-6 md:h-6" />
        </div>
        <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">New Project</h1>
            <p className="text-slate-500 text-xs md:text-sm">Initialize a new initiative in the PMO system.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-5 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6 md:space-y-8">
        
        {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm font-medium">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
            </div>
        )}

        {/* Project Name */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Name <span className="text-red-500">*</span></label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <LayoutDashboard size={18} />
                </div>
                <input
                    type="text"
                    name="project_name"
                    required
                    value={formData.project_name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 placeholder:text-slate-400 font-medium transition-all text-base md:text-sm"
                    placeholder="e.g. ERP Migration Phase 1"
                    autoFocus
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Type */}
            <div>
                <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Project Type</label>
                    <button 
                        type="button" 
                        onClick={() => setIsTypeManagerOpen(true)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors whitespace-nowrap active:bg-blue-100"
                    >
                        <Settings size={12} /> Manage Types
                    </button>
                </div>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Tag size={18} />
                    </div>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 bg-white transition-all appearance-none text-base md:text-sm"
                    >
                        {projectTypes.length > 0 ? (
                            projectTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                        ) : (
                            <option value="Digital">Digital (Default)</option>
                        )}
                    </select>
                </div>
            </div>

            {/* Owner */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-1 md:mt-0">Owner / PM</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <User size={18} />
                    </div>
                    <input
                        type="text"
                        name="owner"
                        required
                        value={formData.owner}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 placeholder:text-slate-400 font-medium transition-all text-base md:text-sm"
                        placeholder="e.g. Somchai Jai-dee"
                    />
                </div>
            </div>

            {/* Start Date */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="date"
                        name="start_date"
                        required
                        value={formData.start_date}
                        onChange={handleChange}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 transition-all cursor-pointer appearance-none text-base md:text-sm"
                    />
                </div>
            </div>

            {/* End Date */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target End Date</label>
                <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="date"
                        name="end_date"
                        required
                        min={formData.start_date}
                        value={formData.end_date}
                        onChange={handleChange}
                        onClick={(e) => (e.target as any).showPicker?.()}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 transition-all cursor-pointer appearance-none text-base md:text-sm"
                    />
                </div>
            </div>

            {/* Financials Section */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="md:col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2">
                    Financials & Billing
                </div>
                
                {/* Total Budget */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Project Value</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-green-600 transition-colors">
                            <DollarSign size={18} />
                        </div>
                        <input
                            type="number"
                            name="total_budget"
                            min="0"
                            step="0.01"
                            value={formData.total_budget}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-green-500 shadow-sm text-slate-900 font-mono transition-all text-base md:text-sm"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                {/* Billing Cycles */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Billing Cycles</label>
                    <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Repeat size={18} />
                        </div>
                        <input
                            type="number"
                            name="billing_cycle_count"
                            min="1"
                            step="1"
                            value={formData.billing_cycle_count}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 transition-all text-base md:text-sm"
                            placeholder="e.g. 4"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Number of payment milestones/installments.</p>
                </div>
            </div>

            {/* Progress Slider (Enhanced) */}
            <div className="md:col-span-2 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-end mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Initial Progress
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.progress}
                            onChange={(e) => {
                                let val = parseInt(e.target.value);
                                if (isNaN(val)) val = 0;
                                if (val > 100) val = 100;
                                if (val < 0) val = 0;
                                setFormData(prev => ({...prev, progress: val}));
                            }}
                            className="w-24 text-right pr-8 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        />
                        <span className="absolute right-3 top-2 text-slate-400 text-sm font-bold select-none">%</span>
                    </div>
                </div>
                
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.progress}
                    onChange={(e) => setFormData(prev => ({...prev, progress: parseInt(e.target.value)}))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />

                <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono font-medium select-none">
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 0}))} className="hover:text-blue-600 transition-colors p-1">0%</button>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 25}))} className="hover:text-blue-600 transition-colors p-1">25%</button>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 50}))} className="hover:text-blue-600 transition-colors p-1">50%</button>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 75}))} className="hover:text-blue-600 transition-colors p-1">75%</button>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 100}))} className="hover:text-blue-600 transition-colors p-1">100%</button>
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-4">
             <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3.5 md:py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-bold text-sm w-full md:w-auto active:scale-95"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 text-sm w-full md:w-auto active:scale-95"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                Create Project
            </button>
        </div>
      </form>

      {/* Dynamic Type Manager Modal */}
      <ProjectTypeManager 
         isOpen={isTypeManagerOpen} 
         onClose={() => setIsTypeManagerOpen(false)}
         onChange={fetchProjectTypes} 
      />

    </div>
  );
};
