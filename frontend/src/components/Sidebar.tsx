'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import {
  Building2,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Thermometer,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  isDark: boolean;
  onToggleDark: () => void;
  companyCount?: number;
}

export default function Sidebar({ isDark, onToggleDark, companyCount }: SidebarProps) {
  const NAV_ITEMS: NavItem[] = [
    {
      id: 'nav-directory',
      label: 'Company Directory',
      href: '/',
      icon: <Building2 size={18} />,
      badge: companyCount,
    },
    {
      id: 'nav-research',
      label: 'Live Research',
      href: '/live-research-flow',
      icon: <Search size={18} />,
    },
    {
      id: 'nav-report',
      label: 'Company Report',
      href: '/company-report',
      icon: <FileText size={18} />,
    },
  ];
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col h-full border-r border-border bg-card transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo + workspace */}
      <div className={`flex items-center border-b border-border h-14 px-3 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <AppLogo size={28} />
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-mono text-xs font-semibold text-foreground tracking-widest uppercase block truncate">
                ProspectScan
              </span>
              <span className="text-2xs text-muted-foreground font-mono truncate block">
                GND Solutions
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav section label */}
      {!collapsed && (
        <div className="px-3 pt-4 pb-1">
          <span className="section-label text-2xs">Navigation</span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all duration-150 group relative
                ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20' :'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className={`flex-shrink-0 ${isActive ? 'text-primary' : ''}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.badge !== undefined && (
                <span className="flex-shrink-0 text-2xs font-mono font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-sm tabular-nums">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge !== undefined && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-2xs font-mono font-semibold bg-primary text-primary-foreground rounded-full tabular-nums">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t border-border" />

        {!collapsed && (
          <div className="px-1 pb-1">
            <span className="section-label text-2xs">Reference</span>
          </div>
        )}

        <Link
          key="nav-services"
          href="/services"
          title={collapsed ? 'GND Service Lines' : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all duration-150 ${
            pathname === '/services'
              ? 'bg-primary/10 text-primary border border-primary/20' :'text-muted-foreground hover:bg-secondary hover:text-foreground'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <Thermometer size={18} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">GND Service Lines</span>}
        </Link>

        <Link
          key="nav-settings"
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all duration-150 ${
            pathname === '/settings'
              ? 'bg-primary/10 text-primary border border-primary/20' :'text-muted-foreground hover:bg-secondary hover:text-foreground'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">Settings</span>}
        </Link>

        <Link
          key="nav-help"
          href="#"
          title={collapsed ? 'Help' : undefined}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all duration-150 text-muted-foreground hover:bg-secondary hover:text-foreground ${collapsed ? 'justify-center' : ''}`}
        >
          <HelpCircle size={18} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">Help & Docs</span>}
        </Link>
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border p-2 space-y-1">
        <button
          onClick={onToggleDark}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all duration-150 text-muted-foreground hover:bg-secondary hover:text-foreground ${collapsed ? 'justify-center' : ''}`}
        >
          {isDark ? <Sun size={18} className="flex-shrink-0" /> : <Moon size={18} className="flex-shrink-0" />}
          {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User */}
        <div className={`flex items-center gap-2.5 px-2.5 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-sm bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xs font-mono font-semibold text-primary">AR</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">Arjun Rajan</p>
              <p className="text-2xs text-muted-foreground font-mono truncate">Sales · GND</p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all duration-150 text-muted-foreground hover:bg-secondary hover:text-foreground ${collapsed ? 'justify-center' : 'justify-end'}`}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <span className="text-xs">Collapse</span>
              <ChevronLeft size={16} />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}