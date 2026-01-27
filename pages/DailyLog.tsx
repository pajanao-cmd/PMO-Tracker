import React, { useState, useEffect, useRef } from 'react';
import { Save, Check, Loader2, PenLine, AlertCircle, LayoutDashboard, Calendar, ChevronDown, Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Project } from '../types';

export const DailyLog: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [progressNote, setProgressNote] = useState('');
  const [statusToday, setStatusToday] = useState('On Track');
  const [blocker, setBlocker] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Refs for Text Manipulation
  const achievementsRef = useRef<HTMLTextAreaElement>(null);

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

  // 2. Text Formatting Helper
  const insertFormat = (type: 'bold' | 'italic' | 'underline' | 'bullet' | 'number') => {
    const textarea = achievementsRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let newText = '';
    let newCursorPos = start;

    switch (type) {
      case 'bold':
        newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
        newCursorPos = end + 4; // Moves cursor after the closing **
        if (selectedText.length === 0) newCursorPos = start + 2; // Position between **|**
        break;
      case 'italic':
        newText = text.substring(0, start) + `*${selectedText}*` + text.substring(end);
        newCursorPos = end + 2;
        if (selectedText.length === 0) newCursorPos = start + 1;
        break;
      case 'underline':
        newText = text.substring(0, start) + `__${selectedText}__` + text.substring(end);
        newCursorPos = end + 4;
        if (selectedText.length === 0) newCursorPos = start + 2;
        break;
      case 'bullet':
        // If at start of line, just insert. If not, insert newline then bullet
        const prefix = (start > 0 && text[start - 1] !== '\n') ? '\n• ' : '• ';
        newText = text.substring(0, start) + prefix + text.substring(end);
        newCursorPos = start + prefix.length;
        break;
      case 'number':
        const numPrefix = (start > 0 && text[start - 1] !== '\n') ? '\n1. ' : '1. ';
        newText = text.substring(0, start) + numPrefix + text.substring(end);
        newCursorPos = start + numPrefix.length;
        break;
    }

    setProgressNote(newText);
    
    // Defer focus and cursor update to allow React render
    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
    }, 0);
  };

  // 3. Handle Save to DB
  const handleSave = async () => {
    if (!selectedProjectId || !progressNote.trim()) {
        setErrorMsg('Please select a project and enter a progress note.');
        return;
    }

    if (!logDate) {
        setErrorMsg('Please select a valid date.');
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
                    update_date: logDate,
                    status_today: statusToday,
                    progress_note: progressNote,
                    blocker_today: blocker.trim() || null
                }
            ]);

        if (error) throw error;

        setSaveStatus('success');
        setProgressNote('');
        setBlocker('');
        // Don't reset date or project for ease of multiple entries
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
    <div className="max-w-2xl mx-auto mt-6 space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <PenLine size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Daily Progress Log</h1>
        <p className="text-slate-500 mt-2 text-sm">Record your key achievements and potential blockers for the day.</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Dropdown */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Project <span className="text-red-500">*</span></label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <LayoutDashboard size={18} />
                    </div>
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        disabled={loadingProjects}
                        className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-300 shadow-sm text-slate-900 bg-white appearance-none focus:ring-blue-500 focus:border-blue-500 font-medium text-sm h-[46px]"
                    >
                        <option value="">{loadingProjects ? 'Loading...' : '-- Choose Project --'}</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.project_name}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                        <ChevronDown size={16} />
                    </div>
                </div>
            </div>

            {/* Date Picker */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Log Date <span className="text-red-500">*</span></label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar size={18} />
                    </div>
                    <input
                        type="date"
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 shadow-sm text-slate-900 focus:ring-blue-500 focus:border-blue-500 font-medium text-sm h-[46px]"
                    />
                </div>
            </div>
        </div>

        {/* Status */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status Today</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['On Track', 'At Risk', 'Delayed', 'Completed'].map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setStatusToday(s)}
                        className={`py-2.5 px-3 rounded-lg text-sm font-bold border transition-all shadow-sm ${
                            statusToday === s 
                                ? s === 'On Track' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                                : s === 'At Risk' ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500'
                                : s === 'Delayed' ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500'
                                : 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>

        {/* Progress Note with Toolbar */}
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Achievements <span className="text-red-500">*</span></label>
            <div className="border border-slate-300 rounded-lg shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all bg-white">
                {/* Toolbar */}
                <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1 select-none">
                    <button 
                        type="button" onClick={() => insertFormat('bold')} 
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Bold"
                    >
                        <Bold size={16} />
                    </button>
                    <button 
                        type="button" onClick={() => insertFormat('italic')} 
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Italic"
                    >
                        <Italic size={16} />
                    </button>
                    <button 
                        type="button" onClick={() => insertFormat('underline')} 
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Underline"
                    >
                        <Underline size={16} />
                    </button>
                    <div className="w-px h-5 bg-slate-200 mx-2"></div>
                    <button 
                        type="button" onClick={() => insertFormat('bullet')} 
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Bullet List"
                    >
                        <List size={16} />
                    </button>
                    <button 
                        type="button" onClick={() => insertFormat('number')} 
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Numbered List"
                    >
                        <ListOrdered size={16} />
                    </button>
                </div>
                {/* Textarea */}
                <textarea
                    ref={achievementsRef}
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="Briefly describe what was completed... (Supports Markdown)"
                    className="w-full h-36 p-4 text-slate-800 border-none focus:ring-0 resize-none text-sm leading-relaxed"
                />
            </div>
        </div>

        {/* Blockers */}
        <div>
            <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertCircle size={12} /> Blockers / Risks</label>
            <textarea
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                placeholder="What is impeding progress? (Leave blank if none)"
                className="w-full h-20 p-4 text-slate-800 border border-slate-200 bg-slate-50 rounded-lg focus:ring-red-500 focus:border-red-500 focus:bg-white resize-none placeholder:text-slate-400 text-sm leading-relaxed transition-all"
            />
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 p-4 rounded-lg border border-red-200 font-medium animate-in slide-in-from-top-1">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSave}
        disabled={isSaving || loadingProjects}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-md relative z-20
          ${saveStatus === 'success' 
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' 
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed shadow-blue-200'
          }
        `}
      >
        {isSaving && <Loader2 className="animate-spin" size={20} />}
        {saveStatus === 'success' && <Check size={20} />}
        {saveStatus === 'idle' && !isSaving && <Save size={20} />}
        
        {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved Successfully' : 'Submit Log Entry'}
      </button>

    </div>
  );
};