import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LifeBuoy, ShieldCheck, UserCheck, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function Login() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await register({ email, name, password, role });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, 'Password123!');
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-400 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
            <LifeBuoy className="w-8 h-8 animate-spin-slow" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-white">
          QuickDesk
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          AI-Assisted Internal Helpdesk Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl shadow-black/40 rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3.5 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@quickdesk.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                  )}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="employee">Employee (Submit tickets & view own)</option>
                  <option value="agent">Support Agent (Triage, RAG reply & resolve)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              {isRegistering
                ? 'Already have an account? Sign In'
                : "Don't have an account? Register new user"}
            </button>
          </div>

          {/* Quick Demo Sign In Section */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Instant Demo Logins</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('agent@quickdesk.com')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Agent (Sarah)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('employee@quickdesk.com')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Employee (John)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
