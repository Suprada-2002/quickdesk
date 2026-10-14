import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { NewTicket } from './pages/NewTicket';
import { AgentDashboard } from './pages/AgentDashboard';
import { TicketDetail } from './pages/TicketDetail';
import { MetricsPage } from './pages/MetricsPage';

function AppContent() {
  const { user, loading, isAgent, isEmployee } = useAuth();
  const [activeTab, setActiveTab] = useState('my-tickets');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Sync active tab with user role upon login
  useEffect(() => {
    if (user) {
      if (user.role === 'agent') {
        setActiveTab('agent-dashboard');
      } else {
        setActiveTab('my-tickets');
      }
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1">
        {/* Strictly render views based on verified user role */}
        {isEmployee && (
          <>
            {activeTab === 'my-tickets' && (
              <EmployeeDashboard
                onNewTicketClick={() => setActiveTab('new-ticket')}
              />
            )}

            {activeTab === 'new-ticket' && (
              <NewTicket
                onTicketCreated={() => setActiveTab('my-tickets')}
                onCancel={() => setActiveTab('my-tickets')}
              />
            )}
          </>
        )}

        {isAgent && (
          <>
            {activeTab === 'agent-dashboard' && (
              <AgentDashboard
                onSelectTicket={(id) => {
                  setSelectedTicketId(id);
                  setActiveTab('ticket-detail');
                }}
              />
            )}

            {activeTab === 'ticket-detail' && (
              <TicketDetail
                ticketId={selectedTicketId}
                onBack={() => setActiveTab('agent-dashboard')}
              />
            )}

            {activeTab === 'metrics' && <MetricsPage />}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200/60 bg-white py-4 text-center text-xs text-slate-400">
        QuickDesk • AI-Assisted Internal Helpdesk Platform • {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
