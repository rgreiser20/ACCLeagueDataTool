import React from 'react';
import { Trophy, Database, ShieldAlert, BarChart3, ShieldCheck, User } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, session, onLogout }) {
  const navItems = [
    { id: 'leaderboard', label: 'Championship', icon: Trophy },
    { id: 'warehouse', label: 'Data Warehouse', icon: Database },
    { id: 'penalties', label: 'Penalty Log', icon: ShieldAlert },
    { id: 'dashboards', label: 'Dashboards', icon: BarChart3 },
    { id: 'admin', label: 'Steward Portal', icon: ShieldCheck }
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('leaderboard')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                APEX RACING
              </span>
              <span className="block text-[10px] text-violet-400 font-bold tracking-widest uppercase">
                ACC Telemetry
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-400 border border-violet-500/30 glow-accent'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info / Admin status */}
          <div className="flex items-center space-x-3">
            {session ? (
              <div className="flex items-center space-x-3">
                <div className="hidden lg:block text-right">
                  <span className="block text-xs font-semibold text-slate-300">{session.user.email}</span>
                  <span className="block text-[9px] text-emerald-400 font-bold tracking-wider uppercase">Steward Admin</span>
                </div>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 text-rose-300 transition-colors"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('admin')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Button panel */}
      <div className="md:hidden flex justify-around border-t border-slate-900/80 py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                isActive ? 'text-violet-400' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-semibold">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
