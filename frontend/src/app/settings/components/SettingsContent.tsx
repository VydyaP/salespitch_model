'use client';
import React, { useEffect, useState } from 'react';
import { Sun, Moon, Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { API_BASE, fetchCompanies } from '@/lib/api';

type ConnStatus = 'checking' | 'connected' | 'unreachable';

const ENGINES = [
  { id: 'groq', label: 'Groq', ready: true, note: 'Search + reasoning, free tier' },
  { id: 'gemini', label: 'Gemini', ready: false, note: 'Search grounding blocked on free tier — needs billing' },
  { id: 'claude', label: 'Claude', ready: false, note: 'Not wired into the search stage yet' },
];

export default function SettingsContent() {
  const [isDark, setIsDark] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnStatus>('checking');
  const [companyCount, setCompanyCount] = useState<number | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    fetchCompanies()
      .then((companies) => {
        setCompanyCount(companies.length);
        setConnStatus('connected');
      })
      .catch(() => setConnStatus('unreachable'));
  }, []);

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ps-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ps-theme', 'light');
    }
  }

  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <span className="section-label text-2xs">GND Solutions · Sales Intelligence</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Appearance and a look at what&apos;s actually running under the hood.
          </p>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-4 max-w-2xl">
        {/* Appearance */}
        <div className="kraft-card p-5">
          <span className="section-label text-2xs block mb-3">Appearance</span>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isDark ? 'Dark mode' : 'Light mode'} — also toggleable from the sidebar.
              </p>
            </div>
            <button
              onClick={toggleDark}
              className="btn-secondary text-sm"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
              Switch to {isDark ? 'light' : 'dark'}
            </button>
          </div>
        </div>

        {/* Backend connection */}
        <div className="kraft-card p-5">
          <span className="section-label text-2xs block mb-3">Backend Connection</span>
          <div className="flex items-center gap-3 mb-3">
            <Server size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground font-mono flex-1">{API_BASE}</span>
            {connStatus === 'checking' && (
              <span className="flex items-center gap-1.5 text-2xs font-mono text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                Checking…
              </span>
            )}
            {connStatus === 'connected' && (
              <span className="flex items-center gap-1.5 text-2xs font-mono font-semibold text-severity-low">
                <CheckCircle2 size={12} />
                Connected
              </span>
            )}
            {connStatus === 'unreachable' && (
              <span className="flex items-center gap-1.5 text-2xs font-mono font-semibold text-severity-high">
                <XCircle size={12} />
                Unreachable
              </span>
            )}
          </div>
          {connStatus === 'unreachable' && (
            <p className="text-xs text-muted-foreground">
              Couldn&apos;t reach server.py — make sure the Flask backend is running.
            </p>
          )}
          {connStatus === 'connected' && companyCount !== null && (
            <p className="text-xs text-muted-foreground">
              {companyCount} companies currently on file.
            </p>
          )}
        </div>

        {/* Research engines */}
        <div className="kraft-card p-5">
          <span className="section-label text-2xs block mb-3">Research Engines</span>
          <div className="space-y-2.5">
            {ENGINES.map((e) => (
              <div key={e.id} className="flex items-start gap-3">
                {e.ready ? (
                  <CheckCircle2 size={15} className="text-severity-low flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={15} className="text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${e.ready ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {e.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
