
import React, { useState, useEffect } from 'react';
import { Save, Check, Loader2, PenLine, AlertCircle, LayoutDashboard, Calendar, ChevronDown, Plus, Trash2, CheckSquare, Square, Clock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Project } from '../types';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  percentage: number;
  dueDate: string;
}

export const DailyLog: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusToday, setStatusToday] = useState('On Track');
  const [blocker, setBlocker] = useState('');
  
  // Checklist State
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', text: '', completed: false, percentage: 0, dueDate: '' }
  ]);
  
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

  // 2. Checklist Handlers
  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newId = Date.now().toString();
    setChecklist([...checklist, { id: newId, text: '', completed: false, percentage: 0, dueDate: '' }]);
  };

  const handleUpdateTask = (id: string, field: keyof ChecklistItem, value: any) => {
    setChecklist(checklist.map(item => {
        if (item.id === id) {
            const updated = { ...item, [field]: value };
            
            // Auto-sync percentage and completed status
            if (field === 'percentage' && typeof value === 'number') {
                 if (value === 100 && !item.completed) updated.completed = true;
                 if (value < 100 && item.completed) updated.completed = false;
            }
            return updated;
        }
        return item;
    }));
  };

  const handleToggleTask = (id: string) => {
    setChecklist(checklist.map(item => {
        if (item.id === id) {
            const newCompleted = !item.completed;
            return { 
                ...item, 
                completed: newCompleted,
                percentage: newCompleted ? 100 : 0 // Reset to 0 if unchecked, or keep previous logic if desired
            };
        }
        return item;
    }));
  };

  const handleRemoveTask = (id: string) => {
    if (checklist.length === 1) {
        setChecklist([{ id: Date.now().toString(), text: '', completed: false, percentage: 0, dueDate: '' }]);
        return;
    }
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  // 3. Handle Save to DB
  const handleSave = async () => {
    // Validate
    const validTasks = checklist.filter(c => c.text.trim() !== '');
    
    if (!selectedProjectId) {
        setErrorMsg('Please select a project.');
        return;
    }
    if (validTasks.length === 0) {
        setErrorMsg('Please add at least one task or achievement.');
        return;
    }
    if (!logDate) {
        setErrorMsg('Please select a valid date.');
        return;
    }

    setIsSaving(true);
    setErrorMsg('');

    // Serialize checklist to string with rich info
    // Format: - [x] Task Text (50%) [Due: YYYY-MM-DD]
    const progressNote = validTasks
        .map(item => {
            let meta = [];
            if (item.percentage > 0 && item.percentage < 100) meta.push(`(${item.percentage}%)`);
            if (item.dueDate) meta.push(`[Due: ${item.dueDate}]`);
            
            const metaStr = meta.length > 0 ? ` ${meta.join(' ')}` : '';
            return `- [${item.completed ? 'x' : ' '}] ${item.text}${metaStr}`;
        })
        .join('\n');

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
        // Reset checklist to one empty item
        setChecklist([{ id: Date.now().toString(), text: '', completed: false, percentage: 0, dueDate: '' }]);
        setBlocker('');
        // Do not reset project selection for easier consecutive logging
        
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
    <div className="max-w-3xl mx-auto mt-6 space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <PenLine size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Daily Progress Log</h1>
        <p className="text-slate-500 mt-2 text-sm">Track your daily tasks, progress percentages, and due dates.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
        
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

        {/* Checklist Builder */}
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Task Checklist <span className="text-red-500">*</span></label>
                <button 
                    onClick={handleAddTask}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                >
                    <Plus size={14} /> Add Task
                </button>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="w-8"></div>
                    <div className="flex-1">Task Description</div>
                    <div className="w-20 text-center hidden sm:block">Progress</div>
                    <div className="w-32 text-left hidden sm:block pl-2">Due Date</div>
                    <div className="w-8"></div>
                </div>
                {checklist.map((item, index) => {
                    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date(new Date().setHours(0,0,0,0)) && !item.completed;
                    
                    return (
                        <div 
                            key={item.id} 
                            className={`group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-white border-b border-slate-100 last:border-0 transition-colors ${item.completed ? 'bg-emerald-50/30' : ''}`}
                        >
                            <div className="flex items-center gap-3 flex-1 w-full">
                                <button 
                                    onClick={() => handleToggleTask(item.id)}
                                    className={`flex-shrink-0 transition-colors ${item.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                                >
                                    {item.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                                
                                <input
                                    type="text"
                                    value={item.text}
                                    onChange={(e) => handleUpdateTask(item.id, 'text', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, item.id)}
                                    placeholder={index === 0 ? "What task are you working on?" : "Task description..."}
                                    className={`flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-slate-400 ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}
                                    autoFocus={index === checklist.length - 1 && index > 0}
                                />
                            </div>

                            <div className="flex items-center gap-2 pl-8 sm:pl-0 w-full sm:w-auto justify-between sm:justify-end">
                                {/* Percentage Input */}
                                <div className="relative w-20 flex items-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={item.percentage}
                                        onChange={(e) => {
                                            let val = parseInt(e.target.value);
                                            if (isNaN(val)) val = 0;
                                            if (val > 100) val = 100;
                                            handleUpdateTask(item.id, 'percentage', val);
                                        }}
                                        className={`w-full text-right pr-6 py-1.5 rounded border text-xs font-bold transition-colors ${
                                            item.percentage === 100 
                                            ? 'text-emerald-600 border-emerald-200 bg-emerald-50' 
                                            : 'text-slate-600 border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                        }`}
                                        placeholder="0"
                                    />
                                    <span className="absolute right-2 text-slate-400 text-[10px] pointer-events-none">%</span>
                                </div>

                                {/* Due Date Input */}
                                <div className="relative w-36 sm:w-32">
                                    <input
                                        type="date"
                                        value={item.dueDate}
                                        onChange={(e) => handleUpdateTask(item.id, 'dueDate', e.target.value)}
                                        className={`w-full py-1 px-2 rounded border text-xs font-medium transition-colors ${
                                            isOverdue 
                                            ? 'text-red-600 border-red-300 bg-red-50' 
                                            : item.dueDate 
                                                ? 'text-slate-700 border-slate-200' 
                                                : 'text-slate-400 border-slate-200'
                                        }`}
                                    />
                                    {isOverdue && (
                                        <div className="absolute -top-2 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => handleRemoveTask(item.id)}
                                    className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                    title="Remove item"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
                
                {/* Empty State / Add Prompt */}
                {checklist.length === 0 && (
                     <button onClick={handleAddTask} className="w-full py-4 text-sm text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2 font-medium border-dashed border-2 border-transparent hover:border-blue-200">
                        <Plus size={16} /> Add your first task
                     </button>
                )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-right">
                Tip: Setting progress to 100% automatically completes the task.
            </p>
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
