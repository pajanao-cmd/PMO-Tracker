import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, User, Tag, ArrowRight, LayoutDashboard } from 'lucide-react';
import { MOCK_PROJECTS } from '../mockData';
import { ProjectStatus, ProjectDetail } from '../types';

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Digital',
    owner: '',
    startDate: '',
    endDate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Create new Project Object
    // In a real app, this would be a POST request to Supabase
    const newProject: ProjectDetail = {
        id: crypto.randomUUID(),
        name: formData.name,
        description: formData.description || 'No description provided.',
        owner_id: 'u-temp-' + Math.floor(Math.random() * 1000),
        // Mocking the joined User object
        owner: {
            id: 'u-temp-' + Math.floor(Math.random() * 1000),
            name: formData.owner || 'Unassigned',
            role: 'PM'
        },
        start_date: formData.startDate || new Date().toISOString().split('T')[0],
        end_date: formData.endDate || new Date(Date.now() + 7776000000).toISOString().split('T')[0], // +90 days approx
        status: ProjectStatus.ON_TRACK,
        budget_consumed_percent: 0,
        tags: [formData.type, 'New'],
        milestones: [],
        updates: []
    };

    // Push to mock store
    MOCK_PROJECTS.push(newProject);
    
    // Simulate API delay
    setTimeout(() => {
        setIsSubmitting(false);
        navigate('/');
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Plus size={24} />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">New Project Master</h1>
            <p className="text-slate-500">Create a new project tracking entity manually.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
        
        {/* Project Name */}
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Project Name <span className="text-red-500">*</span></label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <LayoutDashboard size={18} />
                </div>
                <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 placeholder:text-slate-400"
                    placeholder="e.g. MyNews - Training Phase 1"
                    autoFocus
                />
            </div>
        </div>

        {/* Description */}
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
            <div className="relative">
                <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full p-4 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm resize-none text-slate-900 placeholder:text-slate-400"
                    placeholder="Brief objective of the project..."
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Type */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Project Type</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Tag size={18} />
                    </div>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 bg-white"
                    >
                        <option value="Digital">Digital Transformation</option>
                        <option value="Training">Training & Adoption</option>
                        <option value="Internal">Internal Operations</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            {/* Owner */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Owner / PM</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User size={18} />
                    </div>
                    <input
                        type="text"
                        name="owner"
                        required
                        value={formData.owner}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900 placeholder:text-slate-400"
                        placeholder="e.g. Sarah Chen"
                    />
                </div>
            </div>

            {/* Start Date */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Start Date</label>
                <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="date"
                        name="startDate"
                        required
                        value={formData.startDate}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900"
                    />
                </div>
            </div>

            {/* End Date */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Target End Date</label>
                <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="date"
                        name="endDate"
                        required
                        value={formData.endDate}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-slate-900"
                    />
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
             <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold flex items-center gap-2 shadow-md disabled:opacity-70"
            >
                {isSubmitting ? 'Creating...' : 'Create Project'}
                {!isSubmitting && <ArrowRight size={18} />}
            </button>
        </div>
      </form>
    </div>
  );
};