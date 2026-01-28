
import React, { useState } from 'react';
import { LayoutDashboard, Settings, Bell, User, NotebookPen, PlusCircle, ChevronRight, Search, Command, BarChart3, Layers, Menu, X, ShieldCheck, Banknote } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Close mobile menu whenever route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased relative overflow-hidden">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col 
        shadow-2xl border-r border-slate-800 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950 flex-shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
                  <Layers className="text-white w-5 h-5" />
              </div>
              <div>
                  <h1 className="text-base font-bold text-white tracking-tight leading-none">Orbit PMO</h1>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Enterprise Edition</span>
              </div>
           </div>
           {/* Mobile Close Button */}
           <button 
             onClick={() => setIsMobileMenuOpen(false)} 
             className="md:hidden text-slate-400 hover:text-white transition-colors"
           >
             <X size={20} />
           </button>
        </div>
        
        <div className="px-3 py-6 flex-1 overflow-y-auto">
            <div className="mb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Overview</div>
            <nav className="space-y-1 mb-8">
              <NavLink to="/dashboard" icon={<LayoutDashboard size={18} />} label="Executive Dashboard" active={isActive('/dashboard')} />
              <NavLink to="/pipeline" icon={<Banknote size={18} />} label="Project Portfolio Dashboard" active={isActive('/pipeline')} />
              <NavLink to="/projects/new" icon={<PlusCircle size={18} />} label="New Project" active={isActive('/projects/new')} />
            </nav>

            <div className="mb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operations</div>
            <nav className="space-y-1 mb-8">
              <NavLink to="/ma-tracking" icon={<ShieldCheck size={18} />} label="MA Tracking" active={isActive('/ma-tracking')} />
              <NavLink to="/daily-log" icon={<NotebookPen size={18} />} label="Daily Log Entry" active={isActive('/daily-log')} />
              <NavLink to="/reports" icon={<BarChart3 size={18} />} label="Reports & Analytics" active={isActive('/reports')} />
            </nav>

            <div className="mb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">System</div>
            <nav className="space-y-1">
              <NavLink to="#" icon={<Settings size={18} />} label="Settings" active={false} />
            </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
              <User size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Elena Fisher</p>
              <p className="text-xs text-slate-500 truncate">Head of PMO</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300 w-full relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 shadow-sm/50">
          
          <div className="flex items-center gap-4">
             {/* Mobile Menu Trigger */}
             <button 
               onClick={() => setIsMobileMenuOpen(true)}
               className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
               aria-label="Open Menu"
             >
               <Menu size={20} />
             </button>

             <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="hover:text-slate-900 transition-colors cursor-pointer font-medium hidden sm:inline">Portfolio</span>
                <ChevronRight size={14} className="text-slate-400 hidden sm:block" />
                <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 truncate max-w-[150px] sm:max-w-none">FY2025 Strategic</span>
             </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
             {/* Search */}
            <div className="hidden md:flex items-center bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-slate-400 text-sm w-72 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                <Search size={14} className="mr-2" />
                <input type="text" placeholder="Search projects, risks, or owners..." className="bg-transparent border-none focus:ring-0 text-slate-700 w-full placeholder:text-slate-400 text-xs font-medium" />
                <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded border border-slate-200 bg-white">
                    <Command size={10} />
                    <span className="text-[10px] font-bold">K</span>
                </div>
            </div>

            <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full">
              <Search size={20} />
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors relative group">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link 
    to={to} 
    className={`
      flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
      ${active 
        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
      }
    `}
  >
    {icon}
    {label}
  </Link>
);
