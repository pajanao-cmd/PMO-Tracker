import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Loader2, Plus, Calendar, User, Tag, ArrowRight, LayoutDashboard } from 'lucide-react';
import { extractNewProjectFromText } from '../services/geminiService';
import { ProjectDraft } from '../types';

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    
    try {
        const result = await extractNewProjectFromText(inputText);
        setDraft(result);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleCreate = () => {
    // In a real app, this would POST to Supabase
    console.log("Creating project:", draft);
    // Simulate delay
    setTimeout(() => {
        navigate('/');
    }, 1000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Plus size={24} />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">New Project Master</h1>
            <p className="text-slate-500">Describe the project in plain text (Thai/English). AI will structure it.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">Project Description</label>
        <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-32 p-4 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm resize-none text-slate-800"
            placeholder="e.g. MyNews - Training ผู้ใช้งานฝ่ายข่าว คาดว่าจะเสร็จหลังเลือกตั้ง"
            autoFocus
        />
        <div className="mt-4 flex justify-end">
            <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !inputText.trim()}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}
                Analyze & Extract
            </button>
        </div>
      </div>

      {draft && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <LayoutDashboard className="text-blue-600" size={18} />
                    Draft Preview
                </h3>
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Review before creating</span>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Project Name</label>
                    <div className="text-xl font-bold text-slate-900 mt-1">{draft.project_name}</div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Tag size={12} /> Type
                    </label>
                    <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {draft.project_type}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Calendar size={12} /> Target Date
                    </label>
                    <div className={`mt-1 text-sm font-medium ${draft.target_date ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                        {draft.target_date || 'Not specified (TBD)'}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <User size={12} /> Owner
                    </label>
                    <div className={`mt-1 text-sm font-medium ${draft.owner ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                        {draft.owner || 'Unassigned'}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Initial Status</label>
                    <div className="mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {draft.initial_status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                    onClick={() => setDraft(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
                >
                    Discard
                </button>
                <button 
                    onClick={handleCreate}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                >
                    Confirm & Create Project <ArrowRight size={16} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
