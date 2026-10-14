import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges';
import { CitationsBadge } from '../components/CitationsBadge';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  Paperclip,
  ChevronRight,
  Bot,
  MessageSquare,
  Search,
  Inbox,
  Sparkles,
} from 'lucide-react';

export function EmployeeDashboard({ onNewTicketClick }) {
  const { socket } = useSocket();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchTickets = async () => {
    try {
      const data = await api.tickets.list();
      setTickets(data);
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Socket.IO listener for live status updates
    if (socket) {
      const handleTicketResolved = (data) => {
        console.log('[Socket.IO] Received ticket_resolved:', data);
        setTickets((prev) =>
          prev.map((t) =>
            t.id === data.id
              ? {
                  ...t,
                  status: data.status,
                  final_reply: data.final_reply,
                  resolved_at: data.resolved_at,
                }
              : t
          )
        );

        if (selectedTicket && selectedTicket.id === data.id) {
          setSelectedTicket((prev) => ({
            ...prev,
            status: data.status,
            final_reply: data.final_reply,
            resolved_at: data.resolved_at,
          }));
        }
      };

      const handleTicketUpdated = (data) => {
        setTickets((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, ...data } : t))
        );
      };

      socket.on('ticket_resolved', handleTicketResolved);
      socket.on('ticket_updated', handleTicketUpdated);

      return () => {
        socket.off('ticket_resolved', handleTicketResolved);
        socket.off('ticket_updated', handleTicketUpdated);
      };
    }
  }, [socket, selectedTicket]);

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus === 'all') return true;
    return t.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const openCount = tickets.filter((t) => t.status.toLowerCase() === 'open').length;
  const resolvedCount = tickets.filter((t) => t.status.toLowerCase() === 'resolved').length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track status and view support agent responses in real time.
          </p>
        </div>
        <button
          onClick={onNewTicketClick}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Metrics Mini-Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === 'all'
              ? 'bg-indigo-50/70 border-indigo-200 shadow-2xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-slate-500 block font-medium">All My Tickets</span>
          <span className="text-xl font-extrabold text-slate-900">{tickets.length}</span>
        </div>
        <div
          onClick={() => setFilterStatus('open')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === 'open'
              ? 'bg-amber-50/70 border-amber-200 shadow-2xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-amber-600 block font-medium">Open / In Progress</span>
          <span className="text-xl font-extrabold text-amber-700">{openCount}</span>
        </div>
        <div
          onClick={() => setFilterStatus('resolved')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterStatus === 'resolved'
              ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-emerald-600 block font-medium">Resolved</span>
          <span className="text-xl font-extrabold text-emerald-700">{resolvedCount}</span>
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading your tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No tickets found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {filterStatus === 'all'
              ? "You haven't submitted any support tickets yet."
              : `You have no ${filterStatus} tickets.`}
          </p>
          <button
            onClick={onNewTicketClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create Your First Ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white hover:bg-slate-50/60 border border-slate-200/80 rounded-xl p-5 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">#{ticket.id}</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {ticket.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 max-w-2xl">
                    {ticket.description}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                    <span>Submitted on {new Date(ticket.created_at).toLocaleDateString()}</span>
                    {ticket.attachment_filename && (
                      <span className="flex items-center gap-1 text-slate-500">
                        • <Paperclip className="w-3 h-3" /> {ticket.attachment_filename}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <CategoryBadge category={ticket.category} />
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* If resolved, show small preview of agent reply */}
              {ticket.status.toLowerCase() === 'resolved' && ticket.final_reply && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="line-clamp-2">
                    <span className="font-bold">Agent Reply: </span>
                    {ticket.final_reply}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">#{selectedTicket.id}</span>
                <StatusBadge status={selectedTicket.status} />
                <CategoryBadge category={selectedTicket.category} />
                <PriorityBadge priority={selectedTicket.priority} />
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedTicket.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Raised on {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedTicket.description}
              </div>

              {selectedTicket.attachment_filename && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100/60 px-3 py-2 rounded-lg">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attachment: <strong className="text-slate-700">{selectedTicket.attachment_filename}</strong></span>
                </div>
              )}

              {/* Resolved Final Reply */}
              {selectedTicket.status.toLowerCase() === 'resolved' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Support Agent Final Resolution</span>
                    {selectedTicket.resolved_at && (
                      <span className="text-[11px] font-normal text-emerald-600">
                        • {new Date(selectedTicket.resolved_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-950 leading-relaxed whitespace-pre-line bg-white/80 p-3 rounded-lg border border-emerald-100">
                    {selectedTicket.final_reply || 'Ticket resolved by support team.'}
                  </p>
                </div>
              )}

              {/* Knowledge Base Grounding Citations */}
              {selectedTicket.citations && selectedTicket.citations.length > 0 && (
                <div className="pt-2">
                  <CitationsBadge citations={selectedTicket.citations} />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
