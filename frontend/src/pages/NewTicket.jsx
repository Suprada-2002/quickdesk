import React, { useState } from 'react';
import { api } from '../services/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges';
import { CitationsBadge } from '../components/CitationsBadge';
import {
  Send,
  Sparkles,
  Paperclip,
  CheckCircle2,
  ArrowLeft,
  Bot,
  AlertCircle,
  FileText,
} from 'lucide-react';

export function NewTicket({ onTicketCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentFilename, setAttachmentFilename] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setLoading(true);
    setError('');

    try {
      const ticket = await api.tickets.create({
        title: title.trim(),
        description: description.trim(),
        attachment_filename: attachmentFilename.trim() || null,
      });
      setCreatedTicket(ticket);
    } catch (err) {
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  // If ticket was successfully created, show AI suggestions preview
  if (createdTicket) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 text-emerald-600 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Ticket Submitted Successfully!</h2>
              <p className="text-xs text-slate-500">Ticket #{createdTicket.id} is now queued for agent triage.</p>
            </div>
          </div>

          {/* AI Automated Triage Card */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Automated Triage Breakdown</span>
              </div>
              {createdTicket.ai_confidence_score && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {Math.round(createdTicket.ai_confidence_score * 100)}% Confidence
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block mb-1">AI Suggested Category</span>
                <CategoryBadge category={createdTicket.ai_suggested_category} />
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block mb-1">AI Suggested Priority</span>
                <PriorityBadge priority={createdTicket.ai_suggested_priority} />
              </div>
            </div>

            {createdTicket.ai_drafted_reply && (
              <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-2xs mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  <span>Instant AI Grounded Suggestion</span>
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {createdTicket.ai_drafted_reply}
                </p>
              </div>
            )}

            {createdTicket.citations && createdTicket.citations.length > 0 && (
              <CitationsBadge citations={createdTicket.citations} />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => onTicketCreated(createdTicket)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
            >
              Back to My Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Submit Support Ticket</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Describe your issue. Our AI will automatically analyze the priority, category, and draft solutions.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80">
        {error && (
          <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3.5 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Ticket Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My VPN is not connecting on home Wi-Fi"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Detailed Description *
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide full details, error messages, and what you've tried..."
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              <span>Optional Attachment (File reference)</span>
            </label>
            <input
              type="text"
              value={attachmentFilename}
              onChange={(e) => setAttachmentFilename(e.target.value)}
              placeholder="e.g. error_screenshot.png or vpn_handshake.log"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Store filename reference (no actual file binary upload required).
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !description.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
