import React from 'react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export function StatusBadge({ status }) {
  const isResolved = status?.toLowerCase() === 'resolved';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
        isResolved
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs'
          : 'bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs'
      }`}
    >
      {isResolved ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
      )}
      <span className="capitalize">{status}</span>
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = priority?.toLowerCase();

  const styles = {
    high: 'bg-rose-50 text-rose-700 border-rose-200/80 font-bold',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/80',
    low: 'bg-slate-100 text-slate-700 border-slate-200/80',
  }[p] || 'bg-slate-100 text-slate-700 border-slate-200/80';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles}`}>
      {priority}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const c = category?.toLowerCase();

  const styles = {
    it: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
    hr: 'bg-purple-50 text-purple-700 border-purple-200/70',
    finance: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    admin: 'bg-sky-50 text-sky-700 border-sky-200/70',
    other: 'bg-slate-100 text-slate-700 border-slate-200/70',
  }[c] || 'bg-slate-100 text-slate-700 border-slate-200/70';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles}`}>
      {category}
    </span>
  );
}
