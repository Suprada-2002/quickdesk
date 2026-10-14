import React, { useState } from 'react';
import { BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export function CitationsBadge({ citations }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!citations || citations.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic flex items-center gap-1.5 py-1">
        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
        No specific knowledge base article cited for this ticket.
      </div>
    );
  }

  return (
    <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 text-xs">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-indigo-900 font-semibold">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Grounded in {citations.length} Knowledge Base {citations.length === 1 ? 'Article' : 'Articles'}</span>
        </div>
        <button
          type="button"
          className="text-indigo-600 hover:text-indigo-800 transition-colors p-1"
          aria-label="Toggle citations preview"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-2.5 pt-2 border-t border-indigo-100 space-y-2">
          {citations.map((cite, index) => (
            <div key={index} className="bg-white/90 border border-indigo-100/80 rounded p-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-indigo-950 font-medium mb-1">
                <span className="flex items-center gap-1">
                  <span>📄 {cite.title || cite.article_title}</span>
                </span>
                {cite.source && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {cite.source}
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-3 bg-slate-50 p-1.5 rounded font-mono">
                "{cite.snippet}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
