import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart3,
  Clock,
  TrendingUp,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PieChart,
} from 'lucide-react';

export function MetricsPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await api.metrics.get();
      setMetrics(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading operations analytics...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center">
        <p className="text-base font-bold text-rose-600">{error || 'Metrics unavailable'}</p>
        <button onClick={fetchMetrics} className="mt-4 text-xs font-semibold text-indigo-600">
          Try Again
        </button>
      </div>
    );
  }

  const {
    total_tickets,
    status_counts,
    category_counts,
    priority_counts,
    median_resolution_time_minutes,
    category_override_percentage,
    total_category_overrides,
  } = metrics;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <span>Agent Operations Analytics</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time telemetry on helpdesk resolution speeds and AI triage accuracy.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tickets</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{total_tickets}</div>
          <p className="text-[11px] text-slate-400 mt-1">Across all departments</p>
        </div>

        {/* Status Ratio */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Open vs Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {status_counts.resolved || 0} / {total_tickets}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {total_tickets > 0
              ? `${Math.round(((status_counts.resolved || 0) / total_tickets) * 100)}% resolution rate`
              : '0%'}
          </p>
        </div>

        {/* Median Resolution Time */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Median Resolution</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {median_resolution_time_minutes > 60
              ? `${(median_resolution_time_minutes / 60).toFixed(1)} hrs`
              : `${Math.round(median_resolution_time_minutes)} mins`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Based on closed tickets</p>
        </div>

        {/* AI Category Override % */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">AI Override Rate</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {category_override_percentage}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {total_category_overrides} category {total_category_overrides === 1 ? 'override' : 'overrides'}
          </p>
        </div>
      </div>

      {/* Category Breakdown & Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <span>Tickets by Category</span>
          </h2>
          <div className="space-y-3">
            {Object.entries(category_counts).map(([cat, count]) => {
              const percentage = total_tickets > 0 ? Math.round((count / total_tickets) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{cat}</span>
                    <span className="text-slate-500">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Tickets by Priority</span>
          </h2>
          <div className="space-y-3">
            {Object.entries(priority_counts).map(([prio, count]) => {
              const percentage = total_tickets > 0 ? Math.round((count / total_tickets) * 100) : 0;
              const barColor = {
                High: 'bg-rose-500',
                Medium: 'bg-amber-500',
                Low: 'bg-slate-400',
              }[prio] || 'bg-indigo-500';

              return (
                <div key={prio} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{prio} Priority</span>
                    <span className="text-slate-500">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
