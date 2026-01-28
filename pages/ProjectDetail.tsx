
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Flag, DollarSign, Activity, AlertCircle, Bot, X, FileText, Check, Loader2, Zap, User, Link as LinkIcon, Sparkles, Clock, Target, Edit, Diamond, ClipboardList, PlusCircle, ArrowRight, Bold, Italic, Underline, List, ListOrdered, Plus, Trash2, Save, Repeat, ShieldCheck, Wrench, BarChart2, Coins } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { StatusBadge } from '../components/StatusBadge';
import { DailyLog, RiskAnalysis, ProjectStatus, ProjectDetail as IProjectDetail, WeeklyUpdate, Milestone, MilestoneStatus, ProjectDailyUpdate, MaLog, BillingInstallment, BillingStatus } from '../types';
import { generateExecutiveRiskAnalysis, generateDailyLog, analyzeRiskPattern, generateWeeklyReport } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // Data State
  const [project, setProject] = useState<any>(null);
  const [dailyUpdates, setDailyUpdates] = useState<ProjectDailyUpdate[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyUpdate[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [maLogs, setMaLogs] = useState<MaLog[]>([]);
  const [billings, setBillings] = useState<BillingInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'ma' | 'finance'>('daily');
  const [chartView, setChartView] = useState<'week' | 'month'>('week');

  // AI & Modal State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  // MA Modal State (Setup)
  const [showMaPrompt, setShowMaPrompt] = useState(false);
  const [isMaModalOpen, setIsMaModalOpen] = useState(false);
  const [maFormData, setMaFormData] = useState({ startDate: '', endDate: '' });
  const [isSavingMa, setIsSavingMa] = useState(false);

  // MA Log Modal (Support Task)
  const [isMaLogModalOpen, setIsMaLogModalOpen] = useState(false);
  const [maLogData, setMaLogData] = useState({
      service_date: new Date().toISOString().split('T')[0],
      description: '',
      hours_used: '',
      category: 'Request'
  });
  const [isSavingMaLog, setIsSavingMaLog] = useState(false);

  // Billing Modal
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingFormData, setBillingFormData] = useState({
      id: '',
      name: '',
      amount: '',
      due_date: '',
      status: BillingStatus.PENDING
  });
  const [isSavingBilling, setIsSavingBilling] = useState(false);

  // Daily Log Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logStatus, setLogStatus] = useState('On Track');
  const [logProgress, setLogProgress] = useState('');
  const [logBlockers, setLogBlockers] = useState('');
  const [logHelpNeeded, setLogHelpNeeded] = useState(false);
  const [generatedLog, setGeneratedLog] = useState<DailyLog | null>(null);
  const [generatingLog, setGeneratingLog] = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  // Refs for Text Manipulation
  const logAchievementsRef = useRef<HTMLTextAreaElement>(null);

  // Weekly Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<{
      summary_text: string;
      risks_blockers: string;
      next_steps: string;
      rag_status: string;
      week_ending: string;
      progress: number;
  } | null>(null);

  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [analyzingRisk, setAnalyzingRisk] = useState(false);

  // Chart Data State
  const [chartData, setChartData] = useState<any[]>([]);

  // Helper to generate S-Curve data
  const generateProgressData = (proj: any, view: 'week' | 'month') => {
    try {
        if (!proj || !proj.start_date || !proj.end_date) return [];

        const start = new Date(proj.start_date);
        const end = new Date(proj.end_date);
        const today = new Date();
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
        if (start.getTime() > end.getTime()) return []; // Invalid range

        const data = [];
        const currentProgress = proj.progress || 0;
        
        let current = new Date(start);
        // Normalize to start of day
        current.setHours(0,0,0,0);
        const endDate = new Date(end);
        endDate.setHours(0,0,0,0);
        
        // Loop safety
        let iterations = 0;
        const maxIterations = 500;

        // Generate points
        while (current <= endDate && iterations < maxIterations) {
            data.push(new Date(current));
            
            if (view === 'week') {
                current.setDate(current.getDate() + 7);
            } else {
                 // Advance by 1 month, handle edge cases roughly
                 current.setMonth(current.getMonth() + 1);
            }
            iterations++;
        }
        
        // Ensure the exact end date is the last point if not already included and reasonably close
        const lastPoint = data[data.length - 1];
        if (lastPoint && lastPoint.getTime() < endDate.getTime()) {
            data.push(endDate);
        }

        const totalDuration = endDate.getTime() - start.getTime();

        return data.map(date => {
            const timeRatio = totalDuration > 0 ? Math.max(0, Math.min(1, (date.getTime() - start.getTime()) / totalDuration)) : 0;
            
            // S-Curve Planned
            // f(x) = x < 0.5 ? 2*x*x : -1+(4-2*x)*x (Ease-in-out approximation)
            const plannedRatio = timeRatio < 0.5 ? 2 * timeRatio * timeRatio : -1 + (4 - 2 * timeRatio) * timeRatio;
            const planned = Math.round(plannedRatio * 100);

            // Actual Logic
            let actual = null;
            // Show actual only if the point is in the past or today
            if (date <= today || (date.getTime() - today.getTime()) < 24*60*60*1000) { 
                 
                 const projectTimeElapsed = today.getTime() - start.getTime();
                 const pointTimeElapsed = date.getTime() - start.getTime();
                 
                 let pointRatio = 0;
                 if (projectTimeElapsed > 0) {
                     pointRatio = Math.min(1, pointTimeElapsed / projectTimeElapsed);
                 }
                 
                 // Apply variance to make it look realistic (not a straight line) for past points
                 // This mocks history since we don't load full history for chart yet
                 const variance = (Math.random() * 4 - 2); 
                 let val = (currentProgress * pointRatio) + variance;
                 
                 // Fix boundaries
                 if (date.getTime() <= start.getTime()) val = 0;
                 if (val < 0) val = 0;
                 if (val > 100) val = 100;

                 // If this point is 'today' (or the point closest to today), force it to match current actual progress
                 if (Math.abs(date.getTime() - today.getTime()) < 24*60*60*1000 * (view === 'week' ? 7 : 30) && date <= today) {
                     val = currentProgress; 
                 }
                 
                 actual = Math.round(val);
            }
            
            return {
                name: view === 'week' 
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                planned,
                actual,
                fullDate: date.toLocaleDateString()
            };
        });
    } catch (e) {
        console.error("Error generating chart data", e);
        return [];
    }
  };

  // Text Formatting Helper
  const insertLogFormat = (type: 'bold' | 'italic' | 'underline' | 'bullet' | 'number') => {
    const textarea = logAchievementsRef.current;
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
        newCursorPos = end + 4;
        if (selectedText.length === 0) newCursorPos = start + 2;
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

    setLogProgress(newText);
    
    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
    }, 0);
  };

  // Fetch Data from Supabase
  const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
          // 1. Fetch Project Details
          const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('*')
              .eq('id', id)
              .single();
          
          if (projectError) throw projectError;
          setProject(projectData);

          // Check if we should prompt for MA
          if (projectData.progress === 100 && !projectData.has_ma && !localStorage.getItem(`dismiss_ma_${id}`)) {
              setShowMaPrompt(true);
          }
          
          // Pre-fill MA modal data if needed
          if (projectData.end_date) {
               const endDate = new Date(projectData.end_date);
               const maStart = new Date(endDate);
               maStart.setDate(maStart.getDate() + 1);
               const maEnd = new Date(maStart);
               maEnd.setFullYear(maEnd.getFullYear() + 1);
               
               setMaFormData({
                   startDate: maStart.toISOString().split('T')[0],
                   endDate: maEnd.toISOString().split('T')[0]
               });
          }

          // 2. Fetch Milestones
          const { data: milestonesData, error: milestonesError } = await supabase
              .from('milestones')
              .select('*')
              .eq('project_id', id)
              .order('due_date', { ascending: true });
          
          if (milestonesError) console.warn('Error fetching milestones', milestonesError);
          setMilestones(milestonesData || []);

          // 3. Fetch Daily Updates (Limit 30)
          const { data: dailyData, error: dailyError } = await supabase
              .from('project_daily_updates')
              .select('*')
              .eq('project_id', id)
              .order('update_date', { ascending: false })
              .limit(30);

          if (dailyError) throw dailyError;
          setDailyUpdates(dailyData || []);

          // 4. Fetch Weekly Reports
          const { data: weeklyData, error: weeklyError } = await supabase
              .from('project_updates')
              .select('*')
              .eq('project_id', id)
              .order('week_ending', { ascending: false });

          if (weeklyError) console.warn('Error fetching weekly reports', weeklyError);
          setWeeklyReports(weeklyData || []);
          
          // 5. Fetch MA Logs if enabled
          if (projectData.has_ma) {
             const { data: maData } = await supabase
                .from('ma_logs')
                .select('*')
                .eq('project_id', id)
                .order('service_date', { ascending: false });
             setMaLogs(maData || []);
          }

          // 6. Fetch Billings
          const { data: billingData } = await supabase
              .from('project_billings')
              .select('*')
              .eq('project_id', id)
              .order('due_date', { ascending: true });
          setBillings(billingData || []);

          // 7. Generate Chart Data
          setChartData(generateProgressData(projectData, chartView));

      } catch (err: any) {
          console.error('Error loading project:', err);
          setError('Failed to load project data.');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, [id]);
  
  // Re-generate chart when view changes
  useEffect(() => {
      if (project) {
          setChartData(generateProgressData(project, chartView));
      }
  }, [chartView, project]);

  // Handle MA Save (Enable MA)
  const handleSaveMa = async () => {
    if (!id) return;
    setIsSavingMa(true);
    try {
        const { error } = await supabase.from('projects').update({
            has_ma: true,
            ma_start_date: maFormData.startDate,
            ma_end_date: maFormData.endDate
        }).eq('id', id);

        if (error) throw error;
        
        await fetchData();
        setIsMaModalOpen(false);
        setShowMaPrompt(false);
    } catch (err: any) {
        alert("Failed to save MA: " + err.message);
    } finally {
        setIsSavingMa(false);
    }
  };
  
  // Handle MA Log Entry
  const handleSaveMaLog = async () => {
      if (!id) return;
      if (!maLogData.description || !maLogData.service_date) return;
      
      setIsSavingMaLog(true);
      try {
          const { error } = await supabase.from('ma_logs').insert([{
              project_id: id,
              service_date: maLogData.service_date,
              description: maLogData.description,
              hours_used: parseFloat(maLogData.hours_used) || 0,
              category: maLogData.category
          }]);
          
          if (error) throw error;
          
          // Refresh logs
          const { data: maData } = await supabase
            .from('ma_logs')
            .select('*')
            .eq('project_id', id)
            .order('service_date', { ascending: false });
          setMaLogs(maData || []);
          
          setIsMaLogModalOpen(false);
          setMaLogData({ service_date: new Date().toISOString().split('T')[0], description: '', hours_used: '', category: 'Request' });

      } catch (err: any) {
          alert('Failed to save log: ' + err.message);
      } finally {
          setIsSavingMaLog(false);
      }
  };

  // Handle Billing Save
  const handleSaveBilling = async () => {
      if (!id) return;
      if (!billingFormData.name || !billingFormData.due_date) {
          alert("Name and Due Date are required.");
          return;
      }

      setIsSavingBilling(true);
      try {
          const payload = {
              project_id: id,
              name: billingFormData.name,
              amount: parseFloat(billingFormData.amount) || 0,
              due_date: billingFormData.due_date,
              status: billingFormData.status
          };

          if (billingFormData.id) {
              const { error } = await supabase
                  .from('project_billings')
                  .update(payload)
                  .eq('id', billingFormData.id);
              if (error) throw error;
          } else {
              const { error } = await supabase
                  .from('project_billings')
                  .insert([payload]);
              if (error) throw error;
          }

          // Refresh billings
          const { data: billingData } = await supabase
              .from('project_billings')
              .select('*')
              .eq('project_id', id)
              .order('due_date', { ascending: true });
          setBillings(billingData || []);
          setIsBillingModalOpen(false);
          setBillingFormData({ id: '', name: '', amount: '', due_date: '', status: BillingStatus.PENDING });

      } catch (err: any) {
          alert("Failed to save installment: " + err.message);
      } finally {
          setIsSavingBilling(false);
      }
  };

  const handleEditBilling = (item: BillingInstallment) => {
      setBillingFormData({
          id: item.id,
          name: item.name,
          amount: item.amount.toString(),
          due_date: item.due_date,
          status: item.status
      });
      setIsBillingModalOpen(true);
  };

  const handleDeleteBilling = async (billingId: string) => {
      if (!confirm("Are you sure you want to delete this installment?")) return;
      try {
          await supabase.from('project_billings').delete().eq('id', billingId);
          setBillings(prev => prev.filter(b => b.id !== billingId));
      } catch (err: any) {
          alert("Failed to delete: " + err.message);
      }
  };

  const handleToggleBillingStatus = async (item: BillingInstallment) => {
      const nextStatus = item.status === BillingStatus.PENDING ? BillingStatus.INVOICED 
                       : item.status === BillingStatus.INVOICED ? BillingStatus.PAID 
                       : BillingStatus.PENDING;
      
      try {
          const { error } = await supabase
              .from('project_billings')
              .update({ status: nextStatus })
              .eq('id', item.id);
          
          if (error) throw error;
          
          setBillings(prev => prev.map(b => b.id === item.id ? { ...b, status: nextStatus } : b));
      } catch (err: any) {
          alert("Status update failed: " + err.message);
      }
  };

  const handleDeleteMaLog = async (logId: string) => {
      if (!confirm("Delete this support log?")) return;
      try {
          await supabase.from('ma_logs').delete().eq('id', logId);
          setMaLogs(prev => prev.filter(l => l.id !== logId));
      } catch (err) { console.error(err); }
  };

  const handleDismissMa = () => {
      setShowMaPrompt(false);
      if (id) localStorage.setItem(`dismiss_ma_${id}`, 'true');
  };

  // AI Helpers
  const handleAiAnalysis = async () => {
    if (!project) return;
    setLoadingAi(true);
    const mockContext: IProjectDetail = {
        ...project,
        updates: weeklyReports, // Use real weekly reports if available
        milestones: milestones
    };
    const analysis = await generateExecutiveRiskAnalysis(mockContext);
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  const handleAnalyzeRiskPattern = async () => {
      if (!project) return;
      setAnalyzingRisk(true);
      // Map ProjectDailyUpdate to DailyLog for AI service
      const mappedLogs: DailyLog[] = dailyUpdates.slice(0, 3).map(u => ({
          update_date: u.update_date,
          status_today: u.status_today,
          progress_note: u.progress_note,
          blocker_today: u.blocker_today,
          help_needed: u.status_today === 'At Risk' || u.status_today === 'Delayed', // infer
          risk_signal: u.status_today === 'Delayed' ? 'critical' : 'none'
      }));
      
      const result = await analyzeRiskPattern(project.project_name, mappedLogs);
      setRiskAnalysis(result);
      setAnalyzingRisk(false);
  };

  // --- Daily Log Logic ---
  const handleGenerateLog = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!project) return;
      setGeneratingLog(true);
      const result = await generateDailyLog(project.project_name, logStatus, logProgress, logBlockers, logHelpNeeded);
      setGeneratedLog(result);
      setGeneratingLog(false);
  };
  
  const saveGeneratedLog = async () => {
      if (!generatedLog || !id) return;
      try {
          // If editing, use update, else insert
          // But generatedLog flow is typically for new logs. 
          // We will treat this as an insert unless we specifically link it to editing.
          // For simplicity, AI Generation is always a "Drafting" tool.
          // We apply the generated content to the form fields and close the preview, 
          // allowing the user to then hit "Save" which handles Update vs Insert.
          
          setLogDate(generatedLog.update_date);
          setLogStatus(generatedLog.status_today);
          setLogProgress(generatedLog.progress_note);
          setLogBlockers(generatedLog.blocker_today === 'None' ? '' : (generatedLog.blocker_today || ''));
          setGeneratedLog(null); // Close preview
          
      } catch (err: any) {
          alert('Failed to apply log: ' + err.message);
      }
  };

  const handleManualSaveLog = async () => {
      if (!id) return;
      setSavingLog(true);

      const payload = {
          project_id: id,
          update_date: logDate,
          status_today: logStatus,
          progress_note: logProgress,
          blocker_today: logBlockers || null
      };

      try {
          if (editingLogId) {
             const { error } = await supabase.from('project_daily_updates').update(payload).eq('id', editingLogId);
             if (error) throw error;
          } else {
             const { error } = await supabase.from('project_daily_updates').insert([payload]);
             if (error) throw error;
          }
          await fetchData();
          closeLogModal();
      } catch (err: any) {
          alert('Error saving log: ' + err.message);
      } finally {
          setSavingLog(false);
      }
  };

  const handleEditLog = (log: ProjectDailyUpdate) => {
      setEditingLogId(log.id);
      setLogDate(log.update_date);
      setLogStatus(log.status_today);
      setLogProgress(log.progress_note);
      setLogBlockers(log.blocker_today || '');
      setLogHelpNeeded(log.status_today === 'At Risk' || log.status_today === 'Delayed');
      setGeneratedLog(null);
      setIsLogModalOpen(true);
  };

  const handleDeleteLog = async (logId: string) => {
      if (!confirm("Are you sure you want to delete this log entry?")) return;
      try {
          const { error } = await supabase.from('project_daily_updates').delete().eq('id', logId);
          if (error) throw error;
          fetchData();
      } catch (err: any) {
          alert("Failed to delete log: " + err.message);
      }
  };

  const closeLogModal = () => {
      setIsLogModalOpen(false);
      setGeneratedLog(null);
      setEditingLogId(null);
      setLogDate(new Date().toISOString().split('T')[0]);
      setLogStatus('On Track');
      setLogProgress('');
      setLogBlockers('');
      setLogHelpNeeded(false);
  };

  // --- Weekly Report Logic ---
  const openReportModal = async (useAI = true) => {
      setIsReportModalOpen(true);
      const currentProgress = project?.progress || 0;
      
      if (useAI) {
        setGeneratingReport(true);
        try {
            // Map updates to DailyLog interface expected by AI
            const mappedLogs: DailyLog[] = dailyUpdates.slice(0, 7).map(u => ({
                update_date: u.update_date,
                status_today: u.status_today,
                progress_note: u.progress_note,
                blocker_today: u.blocker_today,
                help_needed: false,
                risk_signal: 'none'
            }));

            // Generate initial draft using AI
            const draft = await generateWeeklyReport(project.project_name, mappedLogs); 
            
            if (draft) {
                setReportData({
                    ...draft,
                    week_ending: new Date().toISOString().split('T')[0], // Default to today
                    progress: currentProgress
                });
            } else {
                // Fallback if AI fails or no data
                setReportData({
                    summary_text: '',
                    risks_blockers: '',
                    next_steps: '',
                    rag_status: 'On Track',
                    week_ending: new Date().toISOString().split('T')[0],
                    progress: currentProgress
                });
            }
        } catch (e) {
            console.error("AI Report Generation Error", e);
            setReportData({
                summary_text: '',
                risks_blockers: '',
                next_steps: '',
                rag_status: 'On Track',
                week_ending: new Date().toISOString().split('T')[0],
                progress: currentProgress
            });
        } finally {
            setGeneratingReport(false);
        }
      } else {
          // Manual Mode
          setReportData({
              summary_text: '',
              risks_blockers: '',
              next_steps: '',
              rag_status: 'On Track',
              week_ending: new Date().toISOString().split('T')[0],
              progress: currentProgress
          });
          setGeneratingReport(false);
      }
  };

  const handleSaveReport = async () => {
      if (!reportData || !id) return;
      try {
          // 1. Save Report Record
          const { error: reportError } = await supabase.from('project_updates').insert([{
              project_id: id,
              week_ending: reportData.week_ending,
              summary_text: reportData.summary_text,
              risks_blockers: reportData.risks_blockers,
              next_steps: reportData.next_steps,
              rag_status: reportData.rag_status
          }]);

          if (reportError) throw reportError;

          // 2. Update Project Progress
          const { error: projError } = await supabase.from('projects').update({
              progress: reportData.progress
          }).eq('id', id);

          if (projError) throw projError;

          fetchData();
          setIsReportModalOpen(false);
          setReportData(null);
          setActiveTab('weekly'); // Switch view
      } catch (err: any) {
          alert('Failed to save report: ' + err.message);
      }
  };

  // --- Render ---

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (error || !project) return <div className="text-center p-10 text-red-500 bg-red-50 rounded-lg m-10 border border-red-200">{error || 'Project not found'}</div>;

  const currentStatus = dailyUpdates[0]?.status_today as ProjectStatus || ProjectStatus.ON_TRACK;
  const totalMaHoursUsed = maLogs.reduce((acc, log) => acc + (log.hours_used || 0), 0);
  const maHoursLimit = project.ma_support_hours_total || 0;
  const maUsagePercent = maHoursLimit > 0 ? (totalMaHoursUsed / maHoursLimit) * 100 : 0;

  // Billing Calcs
  const totalBilled = billings.reduce((sum, b) => b.status !== BillingStatus.PENDING ? sum + b.amount : sum, 0);
  const totalPaid = billings.reduce((sum, b) => b.status === BillingStatus.PAID ? sum + b.amount : sum, 0);
  const billedPercent = project.total_budget > 0 ? (totalBilled / project.total_budget) * 100 : 0;

  // Timeline Helper
  const renderTimeline = () => {
      try {
        const startDate = new Date(project.start_date);
        const endDate = new Date(project.end_date);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;

        const today = new Date();
        const timelineStart = new Date(startDate);
        timelineStart.setDate(timelineStart.getDate() - 7);
        const timelineEnd = new Date(endDate);
        timelineEnd.setDate(timelineEnd.getDate() + 14);
        
        const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
        if (totalDuration <= 0) return null;

        const getPos = (d: string | Date) => {
            const date = new Date(d);
            if (isNaN(date.getTime())) return 0;
            const diff = date.getTime() - timelineStart.getTime();
            return Math.max(0, Math.min(100, (diff / totalDuration) * 100));
        };
        const projectStartPos = getPos(project.start_date);
        const projectEndPos = getPos(project.end_date);
        const projectWidth = projectEndPos - projectStartPos;
        const todayPos = getPos(today);
        let barColor = 'bg-blue-600';
        if (currentStatus === 'At Risk') barColor = 'bg-amber-500';
        if (currentStatus === 'Delayed') barColor = 'bg-red-500';
        if (currentStatus === 'Completed') barColor = 'bg-emerald-500';

        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Calendar size={16} className="text-slate-500" />
                        Project Timeline
                    </h3>
                </div>
                <div className="p-6 overflow-x-auto">
                    <div className="min-w-[600px] relative">
                        <div className="flex justify-between text-xs text-slate-400 font-mono mb-2 border-b border-slate-100 pb-2">
                            <span>{timelineStart.toLocaleDateString()}</span>
                            <span>{timelineEnd.toLocaleDateString()}</span>
                        </div>
                        <div className="absolute top-8 bottom-0 w-px bg-red-500 z-20 shadow-[0_0_8px_rgba(239,68,68,0.4)]" style={{ left: `${todayPos}%` }}>
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
                            <div className="absolute -top-6 -left-4 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">TODAY</div>
                        </div>
                        <div className="relative h-12 flex items-center mb-2 group">
                            <div className="w-1/4 min-w-[150px] pr-4 text-sm font-bold text-slate-700 truncate border-r border-slate-100 mr-4 flex items-center gap-2">Project Schedule</div>
                            <div className="flex-1 relative h-full flex items-center">
                                <div 
                                    className={`h-4 rounded-full ${barColor} shadow-sm relative group-hover:h-5 transition-all duration-300`}
                                    style={{ left: `${projectStartPos}%`, width: `${projectWidth}%` }}
                                ></div>
                            </div>
                        </div>
                        {milestones.length > 0 ? (
                            milestones.map((ms) => {
                                const msPos = getPos(ms.due_date);
                                const isPast = new Date(ms.due_date) < today;
                                return (
                                    <div key={ms.id} className="relative h-10 flex items-center group">
                                        <div className="w-1/4 min-w-[150px] pr-4 text-xs font-medium text-slate-600 truncate border-r border-slate-100 mr-4 pl-4 flex items-center gap-2">
                                            {ms.status === MilestoneStatus.COMPLETED ? <Check size={12} className="text-emerald-500" /> : <div className="w-3" />}
                                            {ms.name}
                                        </div>
                                        <div className="flex-1 relative h-full flex items-center">
                                            <div className="absolute transform -translate-x-1/2 flex flex-col items-center cursor-pointer group-hover:z-10" style={{ left: `${msPos}%` }}>
                                                <Diamond size={14} className={`fill-current ${ms.status === MilestoneStatus.COMPLETED ? 'text-emerald-500' : isPast ? 'text-red-400' : 'text-purple-500'} mb-1`} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : <div className="text-center text-xs text-slate-400 italic">No milestones defined.</div>}
                    </div>
                </div>
            </div>
        );
      } catch (e) {
          console.error("Timeline error", e);
          return null;
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative pb-20">
      
      {/* MA Prompt Banner (If 100% and not enabled) */}
      {showMaPrompt && (
          <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                      <ShieldCheck size={24} />
                  </div>
                  <div>
                      <h3 className="font-bold text-lg">Project Completed! Enable Maintenance Agreement?</h3>
                      <p className="text-indigo-100 text-sm">Track post-project MA periods, renewals, and SLAs.</p>
                  </div>
              </div>
              <div className="flex gap-3">
                  <button onClick={handleDismissMa} className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm font-bold transition-colors">Dismiss</button>
                  <button 
                    onClick={() => {
                        setIsMaModalOpen(true);
                        setShowMaPrompt(false);
                    }} 
                    className="px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    Setup MA
                  </button>
              </div>
          </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-slate-500 mb-2">
          <Link to="/" className="hover:text-slate-900 transition-colors font-medium">Dashboard</Link>
          <ChevronLeft size={14} className="mx-2 rotate-180 text-slate-300" />
          <span className="font-semibold text-slate-900 truncate">Project Details</span>
      </nav>

      {/* Header & Charter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-4 max-w-4xl">
                    <div className="flex items-center gap-3">
                         <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{project.project_name}</h1>
                         <StatusBadge status={currentStatus} />
                         {project.has_ma && (
                             <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold flex items-center gap-1">
                                 <ShieldCheck size={12} /> MA Active
                             </span>
                         )}
                    </div>
                    <p className="text-slate-600 text-lg leading-relaxed font-light">
                        {project.description || 'No description available for this project.'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 uppercase tracking-wide">{project.type}</span>
                        {project.tags && project.tags.map((tag: string) => (
                            <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 uppercase tracking-wide">{tag}</span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                     <Link 
                        to={`/projects/${id}/edit`}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-bold"
                    >
                        <Edit size={16} />
                        Edit Details
                    </Link>
                    <button 
                        onClick={() => {
                            setEditingLogId(null);
                            setLogDate(new Date().toISOString().split('T')[0]);
                            setLogStatus('On Track');
                            setLogProgress('');
                            setLogBlockers('');
                            setIsLogModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-sm"
                    >
                        <FileText size={16} />
                        Add Daily Entry
                    </button>
                    <button 
                        onClick={() => openReportModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all text-sm font-bold shadow-sm"
                    >
                        <ClipboardList size={16} />
                        Generate Weekly Report
                    </button>
                </div>
            </div>
         </div>
         
         {/* Stats Grid */}
         <div className="bg-slate-50/50 p-6 grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-slate-200 border-b border-slate-200">
            <div className="px-4 first:pl-0 flex flex-col justify-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Calendar size={12} /> Timeline
                </div>
                <div className="text-sm font-bold text-slate-900">
                    {project.start_date} <span className="text-slate-400 mx-1">→</span> {project.end_date}
                </div>
            </div>
            
            <div className="px-4 flex flex-col justify-center">
                {project.has_ma ? (
                    <>
                        <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                            <ShieldCheck size={12} /> MA Period
                        </div>
                         <div className="text-sm font-bold text-slate-900">
                            {project.ma_start_date} <span className="text-slate-400 mx-1">→</span> {project.ma_end_date}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                            <User size={12} /> Project Owner
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                            {project.owner}
                        </div>
                    </>
                )}
            </div>

            {/* Financials & Billing (Updated) */}
            <div className="px-4 flex flex-col justify-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <DollarSign size={12} /> Financials & Billing
                </div>
                <div className="flex flex-col gap-1">
                     <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                         {project.total_budget ? (
                            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.total_budget)
                         ) : (
                            <span className="text-slate-400 italic">Not set</span>
                         )}
                     </div>
                     <div className="w-full bg-slate-200 rounded-full h-1.5 max-w-[140px]">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${billedPercent}%` }}></div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">{Math.round(billedPercent)}% Billed</span>
                </div>
            </div>
            <div className="px-4 flex flex-col justify-center">
                 <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Activity size={12} /> Quick Actions
                </div>
                 <div className="flex gap-2">
                     <button onClick={handleAiAnalysis} disabled={loadingAi} className="p-1.5 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded border border-violet-100 transition-colors" title="AI Risk Assessment">
                        {loadingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                     </button>
                     <button className="p-1.5 text-slate-500 bg-white hover:text-blue-600 hover:bg-slate-50 rounded border border-slate-200 transition-colors">
                        <LinkIcon size={16} />
                     </button>
                     {/* Show MA Setup button if not configured */}
                     {!project.has_ma && (
                         <button 
                            onClick={() => setIsMaModalOpen(true)}
                            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100 transition-colors"
                            title="Setup MA"
                         >
                            <ShieldCheck size={16} />
                         </button>
                     )}
                 </div>
            </div>
         </div>
      </div>

      {/* EXECUTIVE ANALYTICS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Chart Card */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[450px]">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-700 tracking-tight">Planned vs Actual</h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setChartView('week')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chartView === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Weekly
                        </button>
                        <button 
                            onClick={() => setChartView('month')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chartView === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Monthly
                        </button>
                    </div>
              </div>

              {/* Chart */}
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                            dy={10}
                            minTickGap={30}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                            domain={[0, 100]}
                            ticks={[0, 20, 40, 60, 80, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip 
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px', fontSize: '12px' }}
                            itemStyle={{ fontSize: '12px', padding: 0 }}
                            formatter={(value: number) => [`${value}%`, '']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Legend 
                             verticalAlign="bottom" 
                             align="center" 
                             wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }} 
                          />
                          
                          <Line 
                              type="monotone" 
                              dataKey="actual" 
                              name="Actual"
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              dot={false}
                              activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                           <Line 
                              type="monotone" 
                              dataKey="planned" 
                              name="Planned"
                              stroke="#f97316" 
                              strokeWidth={3} 
                              dot={false}
                              activeDot={false}
                          />
                      </LineChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Side Cards */}
          <div className="space-y-6 flex flex-col">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                  <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 z-10">Completion Progress</h4>
                  <div className="text-5xl font-bold text-slate-900 z-10 tracking-tight">{project.progress || 0}%</div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                      <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${project.progress || 0}%` }}></div>
                  </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                  <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 z-10">Budget Consumed</h4>
                  <div className="text-5xl font-bold text-slate-900 z-10 tracking-tight">
                    {project.budget_consumed_percent}%
                  </div>
                  {/* Decorative faint background dollar */}
                  <DollarSign className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 rotate-12" size={120} />
              </div>
          </div>
      </div>

      {/* TIMELINE SECTION */}
      {renderTimeline()}

      {/* AI Insight Box */}
      {aiAnalysis && (
        <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-xl p-6 flex items-start gap-4 animate-in slide-in-from-top-2 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
                <Sparkles size={100} className="text-violet-900" />
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm text-violet-600 border border-violet-100 flex-shrink-0">
                <Bot size={24} />
            </div>
            <div className="relative z-10 w-full">
                <h4 className="font-bold text-violet-900 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                    Gemini Executive Insight
                </h4>
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium font-sans bg-white/50 p-4 rounded-lg border border-violet-100/50">
                    {aiAnalysis}
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Updates & Risk & Finance */}
        <div className="lg:col-span-2 space-y-6">
             
             {/* Risk Pattern Detector Widget */}
             <div className="bg-slate-900 rounded-xl shadow-lg overflow-hidden text-white relative">
                 <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2 text-base">
                            <Activity size={18} className="text-blue-400" />
                            Live Risk Monitor
                        </h2>
                    </div>
                    <button 
                        onClick={handleAnalyzeRiskPattern}
                        disabled={analyzingRisk}
                        className="text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white transition-all flex items-center gap-2"
                    >
                        {analyzingRisk ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        SCAN NOW
                    </button>
                 </div>
                 <div className="p-5">
                    {riskAnalysis ? (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <div className={`p-4 rounded-lg border flex items-start gap-4 ${
                                riskAnalysis.escalation_required 
                                ? 'bg-red-500/10 border-red-500/30' 
                                : 'bg-emerald-500/10 border-emerald-500/30'
                            }`}>
                                {riskAnalysis.escalation_required ? (
                                    <div className="p-2 bg-red-500/20 rounded-full"><AlertCircle className="text-red-500" size={24} /></div>
                                ) : (
                                    <div className="p-2 bg-emerald-500/20 rounded-full"><Check className="text-emerald-500" size={24} /></div>
                                )}
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className={`font-bold text-lg ${riskAnalysis.escalation_required ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {riskAnalysis.risk_trend.toUpperCase()} TREND
                                        </h3>
                                        {riskAnalysis.escalation_required && (
                                            <span className="bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm tracking-wide">Escalation Required</span>
                                        )}
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed">{riskAnalysis.reason}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2 text-center py-6 text-slate-500 text-sm">
                                <Activity className="mx-auto mb-2 opacity-30" size={32} />
                                System monitoring active. Run scan to detect patterns.
                            </div>
                        </div>
                    )}
                 </div>
             </div>

             {/* Updates/Finance Timeline with Tabs */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
                        <button 
                            onClick={() => setActiveTab('daily')}
                            className={`font-bold text-sm flex items-center gap-2 pb-1 border-b-2 transition-all whitespace-nowrap ${activeTab === 'daily' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                        >
                            <Clock size={16} />
                            Daily Logs
                        </button>
                        <button 
                            onClick={() => setActiveTab('weekly')}
                            className={`font-bold text-sm flex items-center gap-2 pb-1 border-b-2 transition-all whitespace-nowrap ${activeTab === 'weekly' ? 'text-violet-600 border-violet-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                        >
                            <ClipboardList size={16} />
                            Weekly Reports
                        </button>
                        <button 
                            onClick={() => setActiveTab('finance')}
                            className={`font-bold text-sm flex items-center gap-2 pb-1 border-b-2 transition-all whitespace-nowrap ${activeTab === 'finance' ? 'text-emerald-600 border-emerald-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                        >
                            <Coins size={16} />
                            Financials
                        </button>
                        {project.has_ma && (
                            <button 
                                onClick={() => setActiveTab('ma')}
                                className={`font-bold text-sm flex items-center gap-2 pb-1 border-b-2 transition-all whitespace-nowrap ${activeTab === 'ma' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                            >
                                <Wrench size={16} />
                                MA Support
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                    {/* Daily Logs Content */}
                    {activeTab === 'daily' && (
                        <>
                            {dailyUpdates.map((update, idx) => (
                                <div key={idx} className="p-5 hover:bg-slate-50 transition-colors group relative">
                                    {/* Action Buttons */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-md shadow-sm border border-slate-100">
                                        <button 
                                            onClick={() => handleEditLog(update)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Edit Log"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteLog(update.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete Log"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                                {update.update_date}
                                            </span>
                                        </div>
                                        <StatusBadge status={update.status_today as ProjectStatus} size="sm" />
                                    </div>
                                    
                                    <div className="pl-2 border-l-2 border-slate-100 ml-1 space-y-2">
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{update.progress_note}</p>
                                        {update.blocker_today && update.blocker_today !== 'None' && (
                                            <div className="flex items-start gap-2 text-red-700 text-xs mt-2 bg-red-50 p-2 rounded border border-red-100 w-fit">
                                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                                <span className="font-semibold">Blocker: {update.blocker_today}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {dailyUpdates.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">No daily updates recorded.</div>}
                        </>
                    )}

                    {/* Weekly Reports Content */}
                    {activeTab === 'weekly' && (
                        <>
                            {weeklyReports.length > 0 ? (
                                weeklyReports.map((report) => (
                                    <div key={report.id} className="p-6 hover:bg-violet-50/30 transition-colors border-b border-slate-50 last:border-0">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">Week Ending: {report.week_ending}</h4>
                                                <span className="text-xs text-slate-500">Executive Summary</span>
                                            </div>
                                            <StatusBadge status={report.rag_status} size="sm" />
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Key Achievements</div>
                                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{report.summary_text}</p>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Risks & Blockers</div>
                                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{report.risks_blockers || 'None reported.'}</p>
                                            </div>
                                        </div>
                                        {report.next_steps && (
                                            <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                                                <ArrowRight size={14} className="mt-0.5" />
                                                <span className="font-medium">Next Steps: {report.next_steps}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center flex flex-col items-center gap-3">
                                    <div className="p-3 bg-violet-50 rounded-full text-violet-300"><ClipboardList size={24} /></div>
                                    <div className="text-slate-500 font-medium text-sm">No weekly reports generated yet.</div>
                                    
                                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                                        <button onClick={() => openReportModal(true)} className="px-4 py-2 bg-violet-50 text-violet-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-violet-100 transition-colors border border-violet-100">
                                            <Sparkles size={14} /> Generate with AI
                                        </button>
                                        <button onClick={() => openReportModal(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors">
                                            <Plus size={14} /> Create Manually
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Financials & Billing Tab */}
                    {activeTab === 'finance' && (
                        <div className="p-6 space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Collected</div>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalPaid)}
                                    </div>
                                    <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${project.total_budget > 0 ? (totalPaid / project.total_budget) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="p-4 bg-white border border-slate-200 rounded-lg border-dashed flex flex-col items-center justify-center">
                                     <button 
                                        onClick={() => {
                                            setBillingFormData({ id: '', name: '', amount: '', due_date: '', status: BillingStatus.PENDING });
                                            setIsBillingModalOpen(true);
                                        }}
                                        className="flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                    >
                                        <PlusCircle size={24} />
                                        <span className="text-sm font-bold">Add Installment</span>
                                     </button>
                                </div>
                            </div>

                            {/* Billing List */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Billing Schedule</h4>
                                {billings.length > 0 ? (
                                    <div className="space-y-3">
                                        {billings.map(item => (
                                            <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm transition-shadow group">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                                            item.status === BillingStatus.PAID ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                            item.status === BillingStatus.INVOICED ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                                                        <span>Due: {item.due_date}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                    <div className="text-right">
                                                        <div className="font-bold text-slate-900 text-sm">
                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount)}
                                                        </div>
                                                        {project.total_budget > 0 && (
                                                            <div className="text-[10px] text-slate-400">
                                                                {Math.round((item.amount / project.total_budget) * 100)}% of total
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleToggleBillingStatus(item)}
                                                            className={`p-1.5 rounded transition-colors ${
                                                                item.status === BillingStatus.PAID 
                                                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' 
                                                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                            }`}
                                                            title={item.status === BillingStatus.PAID ? "Mark Unpaid" : "Mark Paid"}
                                                        >
                                                            <CheckCircleIcon filled={item.status === BillingStatus.PAID} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleEditBilling(item)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteBilling(item.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                                        No billing installments configured.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MA Support Logs Content */}
                    {activeTab === 'ma' && (
                        <div className="p-4 space-y-4">
                            {/* MA Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Support Hours Used</div>
                                    <div className="text-2xl font-bold text-slate-900">{totalMaHoursUsed} <span className="text-sm text-slate-500 font-normal">/ {maHoursLimit > 0 ? maHoursLimit : '∞'} hrs</span></div>
                                    {maHoursLimit > 0 && (
                                        <div className="w-full bg-indigo-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, maUsagePercent)}%` }}></div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-center p-4 bg-white border border-slate-200 rounded-lg border-dashed">
                                     <button 
                                        onClick={() => setIsMaLogModalOpen(true)}
                                        className="flex flex-col items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <PlusCircle size={24} />
                                        <span className="text-sm font-bold">Log Support Task</span>
                                     </button>
                                </div>
                            </div>

                            {/* Logs List */}
                            <div className="border-t border-slate-100 pt-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Service History</h4>
                                {maLogs.length > 0 ? (
                                    <div className="space-y-3">
                                        {maLogs.map(log => (
                                            <div key={log.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-start hover:shadow-sm transition-shadow group">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                                            log.category === 'Incident' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                            log.category === 'Request' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                            'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                        }`}>
                                                            {log.category}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-mono">{log.service_date}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-700">{log.description}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-sm font-bold text-slate-900">{log.hours_used}h</span>
                                                    <button 
                                                        onClick={() => handleDeleteMaLog(log.id)}
                                                        className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-400 text-sm italic">No support logs recorded.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
             </div>
        </div>

        {/* Right Column: Milestones & KPIs */}
        <div className="space-y-6">
             {/* Milestones Widget */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/30">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Flag size={16} className="text-slate-400" /> 
                        Key Milestones
                    </h3>
                </div>
                <div className="p-6">
                     {/* Simplified list view since we now have the big chart */}
                     {milestones.length > 0 ? (
                        <div className="space-y-4">
                            {milestones.map((ms) => (
                                <div key={ms.id} className="flex items-start gap-3">
                                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center border ${
                                        ms.status === MilestoneStatus.COMPLETED ? 'bg-emerald-100 border-emerald-300 text-emerald-600' : 'bg-slate-50 border-slate-300 text-slate-300'
                                    }`}>
                                        {ms.status === MilestoneStatus.COMPLETED && <Check size={10} />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-700">{ms.name}</div>
                                        <div className="text-xs text-slate-400 font-mono">{ms.due_date}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     ) : (
                        <div className="text-center text-slate-400 text-sm flex flex-col items-center gap-2 py-4">
                            <Target size={32} className="opacity-20" />
                            <span>No milestones configured.</span>
                        </div>
                     )}
                </div>
             </div>
        </div>
      </div>

      {/* MA Configuration Modal (Enabling MA) */}
      {isMaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-slate-200">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                      <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                          <ShieldCheck className="text-indigo-600" size={24} />
                          Maintenance Agreement (MA)
                      </h3>
                      <button onClick={() => setIsMaModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
                          <X size={20} />
                      </button>
                 </div>
                 <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">Configure the MA tracking period for this completed project.</p>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">MA Start Date</label>
                        <input 
                            type="date"
                            value={maFormData.startDate}
                            onChange={(e) => setMaFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full rounded-lg border-slate-300 text-sm p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">MA End Date</label>
                        <input 
                            type="date"
                            value={maFormData.endDate}
                            onChange={(e) => setMaFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full rounded-lg border-slate-300 text-sm p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button onClick={() => setIsMaModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm">Cancel</button>
                        <button 
                            onClick={handleSaveMa}
                            disabled={isSavingMa || !maFormData.startDate || !maFormData.endDate}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isSavingMa ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                            Enable Tracking
                        </button>
                    </div>
                 </div>
             </div>
        </div>
      )}

      {/* MA Log Modal (Support Task) */}
      {isMaLogModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                      <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                          <Wrench className="text-indigo-600" size={24} />
                          Log Support Task
                      </h3>
                      <button onClick={() => setIsMaLogModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                            <input 
                                type="date"
                                value={maLogData.service_date}
                                onChange={(e) => setMaLogData({...maLogData, service_date: e.target.value})}
                                className="w-full rounded-lg border-slate-300 text-sm p-2.5"
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                             <select 
                                value={maLogData.category}
                                onChange={(e) => setMaLogData({...maLogData, category: e.target.value})}
                                className="w-full rounded-lg border-slate-300 text-sm p-2.5"
                             >
                                 <option value="Request">Request</option>
                                 <option value="Incident">Incident</option>
                                 <option value="Maintenance">Maintenance</option>
                                 <option value="Other">Other</option>
                             </select>
                        </div>
                      </div>
                      
                      <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                           <textarea 
                                value={maLogData.description}
                                onChange={(e) => setMaLogData({...maLogData, description: e.target.value})}
                                className="w-full rounded-lg border-slate-300 text-sm p-3 h-24 resize-none"
                                placeholder="Details of the support provided..."
                           />
                      </div>

                      <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hours Used</label>
                           <input 
                                type="number"
                                step="0.5"
                                min="0"
                                value={maLogData.hours_used}
                                onChange={(e) => setMaLogData({...maLogData, hours_used: e.target.value})}
                                className="w-full rounded-lg border-slate-300 text-sm p-2.5"
                                placeholder="0.0"
                           />
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button onClick={() => setIsMaLogModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm">Cancel</button>
                        <button 
                            onClick={handleSaveMaLog}
                            disabled={isSavingMaLog || !maLogData.description}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isSavingMaLog ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                            Save Log
                        </button>
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* Billing Modal */}
      {isBillingModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                      <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                          <Coins className="text-emerald-600" size={24} />
                          {billingFormData.id ? 'Edit Installment' : 'New Installment'}
                      </h3>
                      <button onClick={() => setIsBillingModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      
                      <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description / Phase</label>
                           <input 
                                type="text"
                                value={billingFormData.name}
                                onChange={(e) => setBillingFormData({...billingFormData, name: e.target.value})}
                                className="w-full rounded-lg border-slate-300 text-sm p-2.5"
                                placeholder="e.g. 1st Payment (Kickoff)"
                                autoFocus
                           />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Amount</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <DollarSign size={14} />
                                </div>
                                <input 
                                    type="number"
                                    value={billingFormData.amount}
                                    onChange={(e) => setBillingFormData({...billingFormData, amount: e.target.value})}
                                    className="w-full pl-8 rounded-lg border-slate-300 text-sm p-2.5"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Due Date</label>
                             <input 
                                type="date"
                                value={billingFormData.due_date}
                                onChange={(e) => setBillingFormData({...billingFormData, due_date: e.target.value})}
                                className="w-full rounded-lg border-slate-300 text-sm p-2.5"
                             />
                        </div>
                      </div>

                      <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                           <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                               {Object.values(BillingStatus).map(status => (
                                   <button
                                      key={status}
                                      onClick={() => setBillingFormData({...billingFormData, status: status as BillingStatus})}
                                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                          billingFormData.status === status 
                                          ? 'bg-white shadow-sm text-slate-900 border border-slate-200' 
                                          : 'text-slate-400 hover:text-slate-600'
                                      }`}
                                   >
                                       {status}
                                   </button>
                               ))}
                           </div>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button onClick={() => setIsBillingModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm">Cancel</button>
                        <button 
                            onClick={handleSaveBilling}
                            disabled={isSavingBilling || !billingFormData.name}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isSavingBilling ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Save
                        </button>
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* Daily Log Modal */}
      {isLogModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Bot className="text-blue-600" size={24} />
                          {editingLogId ? 'Edit Daily Log' : 'AI Daily Log Assistant'}
                      </h3>
                      <button onClick={closeLogModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                      {!generatedLog ? (
                          <form onSubmit={handleGenerateLog} className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                  {/* Date Picker */}
                                  <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                                     <input 
                                        type="date"
                                        value={logDate}
                                        onChange={(e) => setLogDate(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 text-sm p-2.5 focus:ring-blue-500 focus:border-blue-500"
                                     />
                                  </div>
                                  
                                  {/* Escalation Checkbox */}
                                  <div className="flex items-end">
                                      <label className={`w-full flex items-center px-4 py-2.5 rounded-lg border cursor-pointer transition-all h-[42px] ${logHelpNeeded ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                          <input 
                                              type="checkbox" 
                                              className="rounded border-slate-300 text-red-600 shadow-sm focus:ring-red-500 h-4 w-4"
                                              checked={logHelpNeeded}
                                              onChange={e => setLogHelpNeeded(e.target.checked)}
                                          />
                                          <span className={`ml-3 text-xs font-bold ${logHelpNeeded ? 'text-red-700' : 'text-slate-600'}`}>Escalation Required</span>
                                      </label>
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
                                              onClick={() => setLogStatus(s)}
                                              className={`py-2.5 px-3 rounded-lg text-sm font-bold border transition-all shadow-sm ${
                                                  logStatus === s 
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
                              
                              {/* Progress Notes with Toolbar */}
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Progress Notes <span className="text-red-500">*</span></label>
                                  <div className="border border-slate-300 rounded-lg shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all bg-white">
                                      {/* Toolbar */}
                                      <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1 select-none">
                                          <button 
                                              type="button" onClick={() => insertLogFormat('bold')} 
                                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Bold"
                                          >
                                              <Bold size={16} />
                                          </button>
                                          <button 
                                              type="button" onClick={() => insertLogFormat('italic')} 
                                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Italic"
                                          >
                                              <Italic size={16} />
                                          </button>
                                          <button 
                                              type="button" onClick={() => insertLogFormat('underline')} 
                                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Underline"
                                          >
                                              <Underline size={16} />
                                          </button>
                                          <div className="w-px h-5 bg-slate-200 mx-2"></div>
                                          <button 
                                              type="button" onClick={() => insertLogFormat('bullet')} 
                                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Bullet List"
                                          >
                                              <List size={16} />
                                          </button>
                                          <button 
                                              type="button" onClick={() => insertLogFormat('number')} 
                                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Numbered List"
                                          >
                                              <ListOrdered size={16} />
                                          </button>
                                      </div>
                                      <textarea 
                                          ref={logAchievementsRef}
                                          required 
                                          rows={4} 
                                          className="w-full p-4 text-slate-800 border-none focus:ring-0 resize-none text-sm leading-relaxed" 
                                          placeholder="What was achieved today? (Supports Markdown)" 
                                          value={logProgress} 
                                          onChange={e => setLogProgress(e.target.value)}
                                      />
                                  </div>
                              </div>

                              {/* Blockers */}
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertCircle size={12} /> Blockers / Risks</label>
                                  <textarea 
                                      rows={2} 
                                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 text-sm transition-shadow" 
                                      placeholder="Any blockers?" 
                                      value={logBlockers} 
                                      onChange={e => setLogBlockers(e.target.value)}
                                  />
                              </div>

                              <div className="pt-2 flex flex-col gap-3">
                                  {/* Manual Save / Update Button */}
                                  <button 
                                    type="button"
                                    onClick={handleManualSaveLog}
                                    disabled={savingLog || generatingLog}
                                    className={`w-full py-3 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${editingLogId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                  >
                                      {savingLog ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                                      {editingLogId ? 'Update Log Entry' : 'Save Log Entry'}
                                  </button>

                                  {/* AI Assistant Button (Only show if creating new or if user wants to re-generate) */}
                                  {!editingLogId && (
                                      <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-slate-200"></div>
                                        <span className="flex-shrink-0 mx-4 text-xs font-semibold text-slate-400">OR ASK AI</span>
                                        <div className="flex-grow border-t border-slate-200"></div>
                                      </div>
                                  )}
                                  
                                  {!editingLogId && (
                                    <button 
                                        type="submit" 
                                        disabled={generatingLog || savingLog} 
                                        className="w-full py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        {generatingLog ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} 
                                        Help Me Write This (AI)
                                    </button>
                                  )}
                              </div>
                          </form>
                      ) : (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                              <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 shadow-inner font-mono text-sm overflow-x-auto relative group">
                                  <div className="absolute top-3 right-3 text-slate-600 text-[10px] uppercase font-bold tracking-wider">JSON Preview</div>
                                  <pre className="text-emerald-400">{JSON.stringify(generatedLog, null, 2)}</pre>
                              </div>
                              <div className="flex gap-4 pt-2">
                                  <button onClick={() => setGeneratedLog(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-bold transition-colors">Back to Edit</button>
                                  <button onClick={saveGeneratedLog} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"><Check size={18} /> Use This Content</button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Weekly Report Modal */}
      {isReportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-violet-50">
                      <h3 className="text-lg font-bold text-violet-900 flex items-center gap-2">
                          <ClipboardList className="text-violet-600" size={24} />
                          Weekly Progress Report
                      </h3>
                      <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                      {generatingReport ? (
                          <div className="flex flex-col items-center justify-center py-10">
                              <Loader2 className="animate-spin text-violet-600 mb-4" size={40} />
                              <p className="text-slate-600 font-medium">Synthesizing daily logs...</p>
                              <p className="text-slate-400 text-sm">Analyzing last 7 days of activity</p>
                          </div>
                      ) : reportData ? (
                          <div className="space-y-5">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Week Ending</label>
                                    <input 
                                        type="date" 
                                        value={reportData.week_ending}
                                        onChange={(e) => setReportData({...reportData, week_ending: e.target.value})}
                                        className="w-full rounded-lg border-slate-300 text-sm p-2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Overall Status</label>
                                    <select 
                                        value={reportData.rag_status}
                                        onChange={(e) => setReportData({...reportData, rag_status: e.target.value})}
                                        className="w-full rounded-lg border-slate-300 text-sm p-2.5"
                                    >
                                        <option value="On Track">On Track</option>
                                        <option value="At Risk">At Risk</option>
                                        <option value="Delayed">Delayed</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                             </div>

                             {/* Progress Slider */}
                             <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between">
                                    <span>Project Completion</span>
                                    <span className="text-violet-600 font-bold text-sm">{reportData.progress}%</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    step="5"
                                    value={reportData.progress}
                                    onChange={(e) => setReportData({...reportData, progress: parseInt(e.target.value)})}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                                    <span>0%</span>
                                    <span>25%</span>
                                    <span>50%</span>
                                    <span>75%</span>
                                    <span>100%</span>
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Executive Summary (Achievements)</label>
                                <textarea 
                                    rows={4}
                                    value={reportData.summary_text}
                                    onChange={(e) => setReportData({...reportData, summary_text: e.target.value})}
                                    className="w-full rounded-lg border-slate-300 text-sm p-3 focus:ring-violet-500 focus:border-violet-500"
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Risks & Blockers</label>
                                <textarea 
                                    rows={2}
                                    value={reportData.risks_blockers}
                                    onChange={(e) => setReportData({...reportData, risks_blockers: e.target.value})}
                                    className="w-full rounded-lg border-slate-300 text-sm p-3 focus:ring-violet-500 focus:border-violet-500"
                                />
                             </div>

                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Next Steps</label>
                                <textarea 
                                    rows={2}
                                    value={reportData.next_steps}
                                    onChange={(e) => setReportData({...reportData, next_steps: e.target.value})}
                                    className="w-full rounded-lg border-slate-300 text-sm p-3 focus:ring-violet-500 focus:border-violet-500"
                                />
                             </div>

                             <div className="pt-4 flex gap-4">
                                <button onClick={() => setIsReportModalOpen(false)} className="flex-1 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Discard</button>
                                <button onClick={handleSaveReport} className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold shadow-md flex items-center justify-center gap-2">
                                    <Check size={18} /> Publish Report
                                </button>
                             </div>
                          </div>
                      ) : null}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const CheckCircleIcon = ({filled}: {filled: boolean}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);
