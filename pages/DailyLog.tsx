import React, { useState } from 'react';
import { Save, Check, Loader2, PenLine } from 'lucide-react';

export const DailyLog: React.FC = () => {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const handleSave = async () => {
    if (!text.trim()) return;

    setStatus('saving');

    try {
      // Simulation of POST /api/daily-update
      // In production, uncomment the fetch line below:
      /*
      await fetch('/api/daily-update', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, timestamp: new Date().toISOString() }) 
      });
      */
      
      // Simulating network delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 800));

      setStatus('success');
      setText('');

      // Reset status back to idle after showing success message
      setTimeout(() => setStatus('idle'), 3000);
      
    } catch (error) {
      console.error("Failed to save log", error);
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6 animate-in fade-in duration-500">
      
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <PenLine className="text-blue-600" />
          Daily Log
        </h1>
        <p className="text-slate-500 mt-2">บันทึกสิ่งที่ทำวันนี้ลงไปตรงๆ ไม่ต้องคิดเยอะ</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="วันนี้ทำอะไรไปบ้าง? (พิมพ์ภาษาไทยได้เลย)..."
          className="w-full h-64 p-4 text-lg text-slate-800 placeholder:text-slate-400 border-0 focus:ring-0 focus:outline-none resize-none leading-relaxed"
          autoFocus
        />
        
        {/* Character count / status indicator for subtle feedback */}
        <div className="absolute bottom-4 right-4 text-xs text-slate-300">
          {text.length > 0 ? `${text.length} chars` : ''}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={status === 'saving' || !text.trim()}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm
          ${status === 'success' 
            ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed'
          }
        `}
      >
        {status === 'saving' && <Loader2 className="animate-spin" size={24} />}
        {status === 'success' && <Check size={24} />}
        {status === 'idle' && <Save size={24} />}
        
        {status === 'saving' && 'กำลังบันทึก...'}
        {status === 'success' && 'บันทึกเรียบร้อย'}
        {status === 'idle' && 'บันทึกงานวันนี้'}
      </button>

      {status === 'success' && (
        <p className="text-center text-emerald-600 text-sm animate-in slide-in-from-bottom-2 font-medium">
           ขอบคุณสำหรับการทำงานหนักในวันนี้! ระบบบันทึกข้อมูลแล้ว
        </p>
      )}
    </div>
  );
};