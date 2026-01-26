import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Calendar, User, Tag, ArrowRight, LayoutDashboard, Loader2, AlertCircle, Trash2, CheckCircle2, XCircle, Eye, Percent } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const EditProject: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Form State
  const [formData, setFormData] = useState({
    project_name: '',
    type: 'Digital',
    owner: '',
    start_date: '',
    end_date: '',
    active: true,
    progress: 0
  });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
        if (!id) return;
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
                    progress: data.progress || 0
                });
            }
        } catch (error: any) {
            console.error('Error fetching project:', error);
            setErrorMsg('Failed to load project details.');
        } finally {
            setLoading(false);
        }
    };
    fetchProject();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
                progress: formData.progress
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
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                <LayoutDashboard size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Project</h1>
                <p className="text-slate-500 text-sm">Update configuration for {formData.project_name}.</p>
            </div>
        </div>
        <div className="flex gap-3">
            <button 
                type="button"
                onClick={() => navigate(`/projects/${id}`)}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors font-bold text-sm shadow-sm"
            >
                <Eye size={16} />
                View Details
            </button>
            <button 
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors font-bold text-sm shadow-sm"
            >
                <Trash2 size={16} />
                Delete
            </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
        
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Type</label>
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
                        <option value="Digital">Digital</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Process Improvement">Process Improvement</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            {/* Owner */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Owner / PM</label>
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
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 transition-all"
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
                        value={formData.end_date}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 transition-all"
                    />
                </div>
            </div>

             {/* Progress */}
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex justify-between">
                    <span>Completion Progress</span>
                    <span className="text-blue-600 font-bold">{formData.progress}%</span>
                </label>
                <div className="flex items-center gap-4">
                     <div className="relative group w-full">
                        <input
                            type="range"
                            name="progress"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.progress}
                            onChange={handleChange}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                </div>
            </div>

        </div>

        {/* Active Status Toggle */}
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lifecycle Status</span>
            <div className="flex gap-4">
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

        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
             <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-bold text-sm"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 text-sm"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Save Changes
            </button>
        </div>
      </form>
    </div>
  );
};