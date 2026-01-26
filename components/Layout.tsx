import React from 'react';
import { LayoutDashboard, Settings, Bell, User, NotebookPen, PlusCircle, ChevronRight, Search, Command } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar - Enterprise Dark */}
      <aside className="w-72 bg-[#0f172a] text-slate-300 flex-shrink-0 flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
           <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Orbit PMO</h1>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Enterprise Edition</span>
            </div>
        </div>
        
        <div className="px-4 py-6">
            <div className="mb-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Main Menu</div>
            <nav className="space-y-1">
              <NavLink to="/" icon={<LayoutDashboard size={18} />} label="Executive Board" active={isActive('/')} />
              <NavLink to="/create" icon={<PlusCircle size={18} />} label="New Project Master" active={isActive('/create')} />
              <NavLink to="/daily" icon={<NotebookPen size={18} />} label="Daily Log Entry" active={isActive('/daily')} />
            </nav>

            <div className="mt-8 mb-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">System</div>
            <nav className="space-y-1">
              <NavLink to="#" icon={<Settings size={18} />} label="Configuration" active={false} />
              <NavLink to="#" icon={<User size={18} />} label="User Management" active={false} />
            </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-indigo-900/50 border border-indigo-700/50 rounded-full flex items-center justify-center text-indigo-300">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Elena Fisher</p>
              <p className="text-xs text-slate-500 truncate">Head of PMO</p>
            </div>
            <Settings size={16} className="text-slate-500 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 flex flex-col min-h-screen transition-all duration-300">
        {/* Sticky Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hover:text-slate-800 transition-colors cursor-pointer">Portfolio</span>
            <ChevronRight size={14} />
            <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">Digital Transformation</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100/50 px-3 py-1.5 rounded-md border border-slate-200 text-slate-400 text-sm w-64 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search size={14} className="mr-2" />
                <input type="text" placeholder="Search projects..." className="bg-transparent border-none focus:ring-0 text-slate-700 w-full placeholder:text-slate-400 text-xs" />
                <div className="flex items-center gap-1 ml-2">
                    <Command size={10} />
                    <span className="text-[10px]">K</span>
                </div>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            <button className="p-2 text-slate-500 hover:text-blue-600 transition-colors relative group">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full">
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
      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
      ${active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
      }
    `}
  >
    {icon}
    {label}
  </Link>
);