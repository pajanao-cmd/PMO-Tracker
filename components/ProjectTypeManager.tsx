
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Loader2, AlertCircle, Save } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ProjectType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChange: () => void; // Trigger parent refresh
}

export const ProjectTypeManager: React.FC<Props> = ({ isOpen, onClose, onChange }) => {
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
      setErrorMsg(null);
    }
  }, [isOpen]);

  const fetchTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_types')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setTypes(data);
    }
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) return;
    setErrorMsg(null);
    
    setActionLoading(true);
    const { error } = await supabase.from('project_types').insert([{ name: newType.trim() }]);
    
    if (!error) {
      setNewType('');
      await fetchTypes();
      onChange();
    } else {
      setErrorMsg("Error adding type. Name must be unique.");
    }
    setActionLoading(false);
  };

  const handleDelete = async (id: string) => {
    const typeToDelete = types.find(t => t.id === id);
    if (!typeToDelete) return;
    setErrorMsg(null);

    // Check usage before delete
    try {
        const { count, error } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('type', typeToDelete.name);

        if (error) throw error;

        if (count && count > 0) {
            setErrorMsg(`Cannot delete "${typeToDelete.name}" because it is currently used by ${count} project(s).`);
            return;
        }
        
        const { error: delError } = await supabase.from('project_types').delete().eq('id', id);
        if (!delError) {
            await fetchTypes();
            onChange();
        } else {
            setErrorMsg("Failed to delete type.");
        }
    } catch (err) {
        setErrorMsg("System error while checking usage.");
    }
  };

  const startEdit = (type: ProjectType) => {
    setEditingId(type.id);
    setEditValue(type.name);
    setErrorMsg(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    setErrorMsg(null);
    
    const oldType = types.find(t => t.id === editingId);
    if (!oldType) return;

    setActionLoading(true);

    try {
        // 1. Update the definition
        const { error } = await supabase
          .from('project_types')
          .update({ name: editValue.trim() })
          .eq('id', editingId);

        if (error) throw error;

        // 2. Cascade update to all projects using this type name
        // (Since we are using text-based linking instead of FKs for flexibility)
        if (oldType.name !== editValue.trim()) {
             const { error: cascadeError } = await supabase
                .from('projects')
                .update({ type: editValue.trim() })
                .eq('type', oldType.name);
             
             if (cascadeError) console.warn("Cascade update warning:", cascadeError);
        }

        setEditingId(null);
        await fetchTypes();
        onChange();

    } catch (err) {
        setErrorMsg("Failed to update type. Name might be duplicate.");
    } finally {
        setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            Configuration
            <span className="text-slate-400 font-medium text-sm">/ Project Types</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
            <div className="bg-red-50 p-3 text-xs text-red-600 font-bold border-b border-red-100 flex items-center gap-2">
                <AlertCircle size={14} />
                {errorMsg}
            </div>
        )}

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {loading ? (
             <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : (
            types.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm italic">No custom types defined.</div>
            ) : (
                types.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 group hover:border-blue-200 transition-colors">
                    {editingId === type.id ? (
                    <div className="flex items-center gap-2 w-full">
                        <input 
                        type="text" 
                        value={editValue} 
                        onChange={e => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        disabled={actionLoading}
                        />
                        <button onClick={saveEdit} disabled={actionLoading} className="text-emerald-600 p-1.5 hover:bg-emerald-50 rounded transition-colors">
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button onClick={() => { setEditingId(null); setErrorMsg(null); }} disabled={actionLoading} className="text-slate-400 p-1.5 hover:bg-slate-100 rounded transition-colors"><X size={16} /></button>
                    </div>
                    ) : (
                    <>
                        <span className="text-sm font-bold text-slate-700">{type.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(type)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors" title="Rename">
                            <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(type.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded transition-colors" title="Delete">
                            <Trash2 size={14} />
                        </button>
                        </div>
                    </>
                    )}
                </div>
                ))
            )
          )}
        </div>

        <form onSubmit={handleAdd} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 flex-shrink-0">
            <input 
                type="text" 
                placeholder="Add new type..." 
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500 font-medium"
                value={newType}
                onChange={e => setNewType(e.target.value)}
            />
            <button 
                type="submit" 
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm flex items-center gap-1 shadow-sm disabled:opacity-70"
            >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add
            </button>
        </form>
      </div>
    </div>
  );
};
