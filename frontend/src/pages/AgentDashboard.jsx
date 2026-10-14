import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges';
import {
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Bell,
  Clock,
  CheckCircle2,
  Inbox,
  User,
} from 'lucide-react';

export function AgentDashboard({ onSelectTicket }) {
  const { socket } = useSocket();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTicketNotification, setNewTicketNotification] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await api.tickets.list({
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        search: search.trim() || undefined,
      });
      setTickets(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, priorityFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Real-time Socket.IO ticket created & updated listeners!
  useEffect(() => {
    if (socket) {
      const handleTicketCreated = (newTicket) => {
        console.log('[Socket.IO] New ticket received live:', newTicket);
        // Prepend to top of list
        setTickets((prev) => [newTicket, ...prev]);

        // Show banner notification
        setNewTicketNotification({
          id: newTicket.id,
          title: newTicket.title,
          category: newTicket.category,
        });

        // Hide notification after 6 seconds
        setTimeout(() => {
          setNewTicketNotification(null);
        }, 6000);
      };

      const handleTicketUpdated = (updated) => {
        setTickets((prev) =>
          prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
        );
      };

      const handleTicketResolved = (resolved) => {
        setTickets((prev) =>
          prev.map((t) => (t.id === resolved.id ? { ...t, ...resolved } : t))
        );
      };

      socket.on('ticket_created', handleTicketCreated);
      socket.on('ticket_updated', handleTicketUpdated);
      socket.on('ticket_resolved', handleTicketResolved);

      return () => {
        socket.off('ticket_created', handleTicketCreated);
        socket.off('ticket_updated', handleTicketUpdated);
        socket.off('ticket_resolved', handleTicketResolved);
      };
    }
  }, [socket]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Real-time Ticket Notification Toast */}
      {newTicketNotification && (
        <div className="mb-6 bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bell className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                New Ticket Arrived in Real Time!
              </p>
              <p className="text-sm font-bold">
                #{newTicketNotification.id}: {newTicketNotification.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onSelectTicket(newTicketNotification.id);
              setNewTicketNotification(null);
            }}
            className="px-3 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg text-xs transition-colors shrink-0"
          >
            Open Ticket
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Agent Support Dashboard</span>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full">
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Filter tickets, override AI triage classifications, and edit RAG knowledge base drafts.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box on Title */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket title..."
              className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open Only</option>
              <option value="resolved">Resolved Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Categories</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Admin">Admin</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ticket Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No matching tickets</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search filters or status selection.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">AI Confidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => onSelectTicket(ticket.id)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-400 font-mono text-[11px]">#{ticket.id}</span>
                        <span className="group-hover:text-indigo-600 transition-colors truncate">
                          {ticket.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {ticket.description}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                          {ticket.creator?.name ? ticket.creator.name[0] : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-[11px]">
                            {ticket.creator?.name || 'Employee'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {ticket.creator?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <CategoryBadge category={ticket.category} />
                        {ticket.category !== ticket.ai_suggested_category && (
                          <span className="block text-[10px] text-amber-600 font-semibold" title="Overridden by agent">
                            ✏️ Override
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <PriorityBadge priority={ticket.priority} />
                        {ticket.priority !== ticket.ai_suggested_priority && (
                          <span className="block text-[10px] text-amber-600 font-semibold" title="Overridden by agent">
                            ✏️ Override
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {ticket.ai_confidence_score ? (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span className="font-semibold">
                            {Math.round(ticket.ai_confidence_score * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={ticket.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTicket(ticket.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-all"
                      >
                        <span>Respond</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
