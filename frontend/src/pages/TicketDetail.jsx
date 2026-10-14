import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges';
import { CitationsBadge } from '../components/CitationsBadge';
import {
  ArrowLeft,
  Bot,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  History,
  AlertTriangle,
  User,
  ShieldCheck,
  Edit3,
  Lock,
} from 'lucide-react';

export function TicketDetail({ ticketId, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [regeneratingDraft, setRegeneratingDraft] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Override controls
  const [showOverrideModal, setShowOverrideModal] = useState(null); // 'category' | 'priority' | null
  const [overrideValue, setOverrideValue] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchTicketData = async () => {
    try {
      setLoading(true);
      const [ticketData, overrideData] = await Promise.all([
        api.tickets.get(ticketId),
        api.tickets.getOverrides(ticketId),
      ]);
      setTicket(ticketData);
      setOverrides(overrideData);
      // Prepopulate editor with AI draft if ticket has not been resolved yet
      if (ticketData.final_reply) {
        setReplyText(ticketData.final_reply);
      } else if (ticketData.ai_drafted_reply) {
        setReplyText(ticketData.ai_drafted_reply);
      }
    } catch (err) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicketData();
    }
  }, [ticketId]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    setError('');
    setSuccessMsg('');

    try {
      const updated = await api.tickets.sendReply(ticket.id, replyText.trim());
      setTicket(updated);
      setSuccessMsg('Final reply sent! Ticket has been marked as Resolved.');
    } catch (err) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleRegenerateDraft = async () => {
    setRegeneratingDraft(true);
    setError('');
    try {
      const updated = await api.tickets.regenerateDraft(ticket.id);
      setTicket(updated);
      setReplyText(updated.ai_drafted_reply || '');
      setSuccessMsg('AI draft reply regenerated from Knowledge Base.');
    } catch (err) {
      setError(err.message || 'Failed to regenerate draft');
    } finally {
      setRegeneratingDraft(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!overrideValue || !showOverrideModal) return;
    setSubmittingOverride(true);
    setError('');

    try {
      const updated = await api.tickets.override(ticket.id, showOverrideModal, overrideValue);
      setTicket(updated);
      // Refresh audit logs
      const freshLogs = await api.tickets.getOverrides(ticket.id);
      setOverrides(freshLogs);
      setShowOverrideModal(null);
      setSuccessMsg(`Successfully overridden ${showOverrideModal} to ${overrideValue}`);
    } catch (err) {
      setError(err.message || 'Override failed');
    } finally {
      setSubmittingOverride(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading ticket details...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center">
        <p className="text-base font-bold text-slate-800">Ticket not found</p>
        <button onClick={onBack} className="mt-4 text-indigo-600 text-xs font-semibold">
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const isResolved = ticket.status.toLowerCase() === 'resolved';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tickets</span>
        </button>

        <div className="flex items-center gap-2">
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header & Original Employee Submission */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-400">#{ticket.id}</span>
                  <span className="text-[11px] text-slate-400">
                    Raised {new Date(ticket.created_at).toLocaleString()}
                  </span>
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {ticket.title}
                </h1>
              </div>

              {/* Employee Raising Card */}
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Submitted By
                </span>
                <span className="text-xs font-bold text-slate-900 block">
                  {ticket.creator?.name || 'Employee'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {ticket.creator?.email}
                </span>
              </div>
            </div>

            {/* Description Body */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {ticket.description}
            </div>

            {ticket.attachment_filename && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-indigo-50/40 border border-indigo-100 px-3 py-2 rounded-lg">
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                <span>Attachment Reference: <strong className="text-slate-800">{ticket.attachment_filename}</strong></span>
              </div>
            )}
          </div>

          {/* AI Triage & Override Controls */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Classification & Agent Overrides</span>
              </div>
              {ticket.ai_confidence_score && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  {Math.round(ticket.ai_confidence_score * 100)}% AI Confidence
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category Card */}
              <div className="border border-slate-200/80 rounded-xl p-3.5 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-semibold">Category</span>
                  {!isResolved ? (
                    <button
                      onClick={() => {
                        setShowOverrideModal('category');
                        setOverrideValue(ticket.category);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Override</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 bg-slate-100/90 border border-slate-200/60 px-2 py-0.5 rounded-md">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <CategoryBadge category={ticket.category} />
                  {ticket.category !== ticket.ai_suggested_category && (
                    <span className="text-[10px] text-amber-600 font-medium">
                      (AI suggested: {ticket.ai_suggested_category})
                    </span>
                  )}
                </div>
              </div>

              {/* Priority Card */}
              <div className="border border-slate-200/80 rounded-xl p-3.5 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-semibold">Priority</span>
                  {!isResolved ? (
                    <button
                      onClick={() => {
                        setShowOverrideModal('priority');
                        setOverrideValue(ticket.priority);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Override</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 bg-slate-100/90 border border-slate-200/60 px-2 py-0.5 rounded-md">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={ticket.priority} />
                  {ticket.priority !== ticket.ai_suggested_priority && (
                    <span className="text-[10px] text-amber-600 font-medium">
                      (AI suggested: {ticket.ai_suggested_priority})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RAG Knowledge Base Draft Reply & Editor */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span>RAG Knowledge Base Draft Reply</span>
              </div>
              {!isResolved && (
                <button
                  onClick={handleRegenerateDraft}
                  disabled={regeneratingDraft}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${regeneratingDraft ? 'animate-spin' : ''}`} />
                  <span>Regenerate Draft</span>
                </button>
              )}
            </div>

            {/* Citations Preview */}
            <CitationsBadge citations={ticket.citations} />

            {/* If resolved: Display comparison between AI Draft vs Sent Reply */}
            {isResolved && ticket.ai_drafted_reply && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                <span className="font-bold text-slate-700 block mb-1">
                  Original AI-Suggested Draft (Preserved for Audit):
                </span>
                <p className="text-slate-500 whitespace-pre-line leading-relaxed font-mono text-[11px]">
                  {ticket.ai_drafted_reply}
                </p>
              </div>
            )}

            {/* Final Reply Editor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {isResolved ? 'Final Sent Reply' : 'Agent Response Editor (Edit AI draft and send):'}
              </label>
              <textarea
                rows={6}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={isResolved}
                placeholder="Compose or refine the response to the employee..."
                className={`w-full p-4 border rounded-xl text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                  isResolved
                    ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
            </div>

            {!isResolved ? (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {sendingReply ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Reply & Mark Resolved</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  This ticket is resolved. Resolved at{' '}
                  {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : 'N/A'}.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Override Audit Trail (Requirement 11) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-4 pb-3 border-b border-slate-100">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Override Audit Trail</span>
            </div>

            {overrides.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No overrides logged yet. The ticket retains its original AI suggestions.
              </p>
            ) : (
              <div className="space-y-3">
                {overrides.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-700 capitalize">
                        {log.field_name} Changed
                      </span>
                      <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className="line-through text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {log.from_value}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {log.to_value}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>By {log.agent?.name || 'Agent'} ({log.agent?.email})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 capitalize">
              Override AI {showOverrideModal}
            </h3>
            <p className="text-xs text-slate-500">
              Select the new value. This action will be recorded in the audit history.
            </p>

            {showOverrideModal === 'category' ? (
              <select
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-medium"
              >
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Admin">Admin</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <select
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-medium"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(null)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyOverride}
                disabled={submittingOverride}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {submittingOverride ? 'Saving...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
