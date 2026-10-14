import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  LifeBuoy,
  BarChart3,
  PlusCircle,
  ListTodo,
  LogOut,
  Radio,
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, isAgent, isEmployee } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => setActiveTab(isAgent ? 'agent-dashboard' : 'my-tickets')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <LifeBuoy className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  QuickDesk
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200/60">
                    AI Assist
                  </span>
                </span>
              </div>
            </div>

            {/* Navigation Links - Strictly filtered by user role */}
            <nav className="hidden md:flex items-center gap-1">
              {isEmployee && (
                <>
                  <button
                    onClick={() => setActiveTab('my-tickets')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === 'my-tickets'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    My Tickets
                  </button>
                  <button
                    onClick={() => setActiveTab('new-ticket')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === 'new-ticket'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Submit Ticket
                  </button>
                </>
              )}

              {isAgent && (
                <>
                  <button
                    onClick={() => setActiveTab('agent-dashboard')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === 'agent-dashboard' || activeTab === 'ticket-detail'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <ListTodo className="w-4 h-4" />
                    All Tickets
                  </button>
                  <button
                    onClick={() => setActiveTab('metrics')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === 'metrics'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Metrics Analytics
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Right Side: Socket Status & User Profile */}
          <div className="flex items-center gap-3">
            {/* Live Socket.IO Status Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isConnected ? 'Connected to Socket.IO real-time updates' : 'Connecting to real-time socket...'}
            >
              <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse text-emerald-600' : 'text-amber-600'}`} />
              <span>{isConnected ? 'Real-time Live' : 'Connecting...'}</span>
            </div>

            {/* Role Badge */}
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                isAgent
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {user?.role}
            </span>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.name || 'User'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {user?.email}
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
