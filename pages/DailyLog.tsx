import React, { useState, useEffect } from 'react';
import { Save, Check, Loader2, PenLine, AlertCircle, LayoutDashboard, Calendar, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Project } from '../types';

export const DailyLog: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [statusToday, setStatusToday] = useState('On Track');
  const [blocker, setBlocker] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Active Projects on Mount
  useEffect(() => {
    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('active', true)
                .order('project_name');
            
            if (error) throw error;
            setProjects(data || []);
        } catch (err: any) {
            console.error('Error fetching projects:', err);
            setErrorMsg('Could not load projects. Please refresh.');
        } finally {
            setLoadingProjects(false);
        }
    };
    fetchProjects();
  }, []);

  // 2. Handle Save to DB
  const handleSave = async () => {
    if (!selectedProjectId || !progressNote.trim()) {
        setErrorMsg('Please select a project and enter a progress note.');
        return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
        const { error } = await supabase
            .from('project_daily_updates')
            .insert([
                {
                    project_id: selectedProjectId,
                    update_date: new Date().toISOString().split('T')[0],
                    status_today: statusToday,
                    progress_note: progressNote,
                    blocker_today: blocker.trim() || null
                }
            ]);

        if (error) throw error;

        setSaveStatus('success');
        setProgressNote('');
        setBlocker('');
        // Reset success message after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);

    } catch (err: any) {
        console.error('Error saving log:', err);
        setSaveStatus('error');
        setErrorMsg(err.message || 'Failed to save log.');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <PenLine className="text-blue-600" />
          Daily Log Entry
        </h1>
        <p className="text-slate-500 mt-2">Update progress for your active projects.</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
        
        {/* Project Dropdown */}
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Select Project <span className="text-red-500">*</span></label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <LayoutDashboard size={18} />
                </div>
                <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={loadingProjects}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 shadow-sm text-slate-900 bg-white appearance-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">{loadingProjects ? 'Loading Projects...' : '-- Choose Project --'}</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>

        {/* Status */}
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Status Today</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['On Track', 'At Risk', 'Delayed', 'Completed'].map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setStatusToday(s)}
                        className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                            statusToday === s 
                                ? s === 'On Track' ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                                : s === 'At Risk' ? 'bg-amber-100 border-amber-500 text-amber-700'
                                : s === 'Delayed' ? 'bg-red-100 border-red-500 text-red-700'
                                : 'bg-blue-100 border-blue-500 text-blue-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>

        {/* Progress Note */}
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">What did you achieve today? <span className="text-red-500">*</span></label>
            <textarea
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                placeholder="Briefly describe completed tasks..."
                className="w-full h-32 p-4 text-slate-800 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
        </div>

        {/* Blockers */}
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 text-red-600">Any Blockers? (Optional)</label>
            <textarea
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                placeholder="What is stopping you from progressing?"
                className="w-full h-20 p-4 text-slate-800 border border-red-200 bg-red-50/50 rounded-lg focus:ring-red-500 focus:border-red-500 resize-none placeholder:text-red-300"
            />
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 font-medium animate-in slide-in-from-top-1">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSave}
        disabled={isSaving || loadingProjects}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm relative z-20
          ${saveStatus === 'success' 
            ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed'
          }
        `}
      >
        {isSaving && <Loader2 className="animate-spin" size={24} />}
        {saveStatus === 'success' && <Check size={24} />}
        {saveStatus === 'idle' && !isSaving && <Save size={24} />}
        
        {isSaving ? 'Saving to Database...' : saveStatus === 'success' ? 'Saved Successfully' : 'Submit Daily Log'}
      </button>

    </div>
  );
};