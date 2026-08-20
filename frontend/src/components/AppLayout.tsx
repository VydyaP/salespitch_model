'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { fetchCompanies } from '@/lib/api';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isDark, setIsDark] = useState(false);
  const [companyCount, setCompanyCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem('ps-theme');
    if (stored === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    fetchCompanies()
      .then((companies) => setCompanyCount(companies.length))
      .catch(() => setCompanyCount(undefined));
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ps-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ps-theme', 'light');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="hidden lg:flex flex-col h-full flex-shrink-0">
        <Sidebar isDark={isDark} onToggleDark={toggleDark} companyCount={companyCount} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </main>
    </div>
  );
}
