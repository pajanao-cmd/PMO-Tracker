
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Calendar, User, Tag, ArrowRight, LayoutDashboard, Loader2, AlertCircle, Trash2, CheckCircle2, XCircle, Eye, Percent, Settings, DollarSign, Repeat, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ProjectTypeManager } from '../components/ProjectTypeManager';
import { ProjectType } from '../types';

export const EditProject: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
    active: true,
    progress: 0,
    total_budget: '',
    billing_cycle_count: 1,
    has_ma: false,
    ma_start_date: '',
    ma_end_date: ''
  });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
        if (!id) return;
        setLoading(true);
        await Promise.all([fetchProject(), fetchProjectTypes()]);
        setLoading(false);
    };
    init();
  }, [id]);

  const fetchProjectTypes = async () => {
    const { data } = await supabase.from('project_types').select('*').order('name');
    if (data && data.length > 0) {
        setProjectTypes(data);
    }
  };

  const fetchProject = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setFormData({
                    project_name: data.project_name,
                    type: data.type,
                    owner: data.owner || '',
                    start_date: data.start_date,
                    end_date: data.end_date,
                    active: data.active,
                    progress: data.progress || 0,
                    total_budget: data.total_budget || '',
                    billing_cycle_count: data.billing_cycle_count || 1,
                    has_ma: data.has_ma || false,
                    ma_start_date: data.ma_start_date || '',
                    ma_end_date: data.ma_end_date || ''
                });
            }
        } catch (error: any) {
            console.error('Error fetching project:', error);
            setErrorMsg('Failed to load project details.');
        }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => {
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        const newData = { ...prev, [name]: val };
        
        // Smart Date Validation
        if (name === 'start_date') {
            if (newData.end_date && typeof val === 'string' && val > newData.end_date) {
                newData.end_date = val;
            }
        }
        
        if (name === 'end_date') {
            if (newData.start_date && typeof val === 'string' && val < newData.start_date) {
                newData.start_date = val;
            }
        }

        return newData;
    });
  };

  const handleToggleActive = (isActive: boolean) => {
      setFormData(prev => ({ ...prev, active: isActive }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    
    try {
        const { error } = await supabase
            .from('projects')
            .update({
                project_name: formData.project_name,
                owner: formData.owner,
                type: formData.type,
                start_date: formData.start_date,
                end_date: formData.end_date,
                active: formData.active,
                progress: formData.progress,
                total_budget: formData.total_budget ? parseFloat(String(formData.total_budget)) : 0,
                billing_cycle_count: formData.billing_cycle_count,
                has_ma: formData.has_ma,
                ma_start_date: formData.has_ma ? formData.ma_start_date : null,
                ma_end_date: formData.has_ma ? formData.ma_end_date : null
            })
            .eq('id', id);

        if (error) throw error;

        // Redirect to dashboard on success
        navigate('/dashboard');

    } catch (error: any) {
        console.error('Error updating project:', error);
        setErrorMsg(error.message || 'Failed to update project');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
      if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
          return;
      }

      setIsSubmitting(true);
      try {
          const { error } = await supabase
              .from('projects')
              .delete()
              .eq('id', id);
            
          if (error) throw error;
          navigate('/dashboard');
      } catch (error: any) {
          console.error('Error deleting project:', error);
          setErrorMsg(error.message || 'Failed to delete project');
          setIsSubmitting(false);
      }
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
              <p className="text-slate-500 font-medium">Retrieving project data...</p>
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 transition-all">
                <LayoutDashboard size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Edit Project</h1>
                <p className="text-slate-500 text-xs md:text-sm">Update configuration for {formData.project_name}.</p>
            </div>
        </div>
        <div className="flex flex-wrap gap-3">
            <button 
                type="button"
                onClick={() => navigate(`/projects/${id}`)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors font-bold text-sm shadow-sm whitespace-nowrap"
            >
                <Eye size={16} />
                View Details
            </button>
            <button 
                type="button"
                onClick={handleDelete}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors font-bold text-sm shadow-sm whitespace-nowrap"
            >
                <Trash2 size={16} />
                Delete
            </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-4 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6 md:space-y-8">
        
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
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                    placeholder="e.g. ERP Migration Phase 1"
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
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
                    >
                        <Settings size={10} /> Manage Types
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
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 bg-white appearance-none transition-all"
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
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 placeholder:text-slate-400 font-medium transition-all"
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
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 transition-all cursor-pointer appearance-none"
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
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 transition-all cursor-pointer appearance-none"
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
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-green-500 shadow-sm text-slate-900 font-mono transition-all"
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
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 transition-all"
                            placeholder="e.g. 4"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Number of payment milestones/installments.</p>
                </div>
            </div>
            
            {/* Maintenance Agreement Section */}
            <div className="md:col-span-2 bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2 mb-4 border-b border-indigo-200 pb-2">
                     <ShieldCheck size={16} className="text-indigo-600" />
                     <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Maintenance Agreement (MA)</span>
                </div>

                <div className="flex items-center mb-4">
                     <label className="flex items-center cursor-pointer">
                          <input 
                               type="checkbox"
                               name="has_ma"
                               checked={formData.has_ma}
                               onChange={handleChange}
                               className="rounded border-indigo-300 text-indigo-600 shadow-sm focus:ring-indigo-500 h-4 w-4"
                          />
                          <span className="ml-2 text-sm font-bold text-slate-700">Enable MA Tracking</span>
                     </label>
                </div>

                {formData.has_ma && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">MA Start Date</label>
                            <input
                                type="date"
                                name="ma_start_date"
                                required={formData.has_ma}
                                value={formData.ma_start_date}
                                onChange={handleChange}
                                className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm text-sm p-2.5"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">MA End Date</label>
                            <input
                                type="date"
                                name="ma_end_date"
                                required={formData.has_ma}
                                value={formData.ma_end_date}
                                onChange={handleChange}
                                className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm text-sm p-2.5"
                            />
                        </div>
                    </div>
                )}
            </div>

             {/* Progress (Enhanced) */}
            <div className="md:col-span-2 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-end mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Completion Progress
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
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 0}))} className="hover:text-blue-600 transition-colors">0%</button>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 25}))} className="hover:text-blue-600 transition-colors">25%</button>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 50}))} className="hover:text-blue-600 transition-colors">50%</button>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 75}))} className="hover:text-blue-600 transition-colors">75%</button>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, progress: 100}))} className="hover:text-blue-600 transition-colors">100%</button>
                </div>
            </div>

        </div>

        {/* Active Status Toggle */}
        <div className="p-4 md:p-5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lifecycle Status</span>
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    type="button"
                    onClick={() => handleToggleActive(true)}
                    className={`flex-1 py-3 px-4 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${formData.active ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                >
                    <CheckCircle2 size={18} />
                    Active Project
                </button>
                <button
                    type="button"
                    onClick={() => handleToggleActive(false)}
                    className={`flex-1 py-3 px-4 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${!formData.active ? 'bg-slate-700 border-slate-700 text-white shadow-slate-300' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                >
                    <XCircle size={18} />
                    Archived / Inactive
                </button>
            </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col-reverse md:flex-row justify-end gap-3">
             <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-bold text-sm w-full md:w-auto"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 text-sm w-full md:w-auto"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Save Changes
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
