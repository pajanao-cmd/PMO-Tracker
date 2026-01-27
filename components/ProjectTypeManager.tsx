
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Loader2, Save } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
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
    
    setActionLoading(true);
    const { error } = await supabase.from('project_types').insert([{ name: newType.trim() }]);
    
    if (!error) {
      setNewType('');
      fetchTypes();
      onChange();
    } else {
        alert("Error adding type. It might already exist.");
    }
    setActionLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This does not update existing projects using this type.')) return;
    
    const { error } = await supabase.from('project_types').delete().eq('id', id);
    if (!error) {
      fetchTypes();
      onChange();
    }
  };

  const startEdit = (type: ProjectType) => {
    setEditingId(type.id);
    setEditValue(type.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    
    const { error } = await supabase
      .from('project_types')
      .update({ name: editValue.trim() })
      .eq('id', editingId);

    if (!error) {
      setEditingId(null);
      fetchTypes();
      onChange();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900">Manage Project Types</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
             <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : (
            types.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 group">
                {editingId === type.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input 
                      type="text" 
                      value={editValue} 
                      onChange={e => setEditValue(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button onClick={saveEdit} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 p-1 hover:bg-slate-100 rounded"><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium text-slate-700">{type.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(type)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(type.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded"><Trash2 size={14} /></button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
            <input 
                type="text" 
                placeholder="Add new type..." 
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                value={newType}
                onChange={e => setNewType(e.target.value)}
            />
            <button 
                type="submit" 
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm flex items-center gap-1"
            >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add
            </button>
        </form>
      </div>
    </div>
  );
};
