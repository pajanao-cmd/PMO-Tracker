import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, User, Tag, ArrowRight, LayoutDashboard, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  
  // Form State
  const [formData, setFormData] = useState({
    project_name: '',
    type: 'Digital',
    owner: '',
    start_date: '',
    end_date: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Plus size={24} />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Project</h1>
            <p className="text-slate-500 text-sm">Initialize a new initiative in the PMO system.</p>
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
                    autoFocus
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
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 bg-white transition-all appearance-none"
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
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                Create Project
            </button>
        </div>
      </form>
    </div>
  );
};