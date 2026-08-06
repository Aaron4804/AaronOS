'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home as HomeIcon,
  Zap as QuestsIcon,
  Calendar as CalendarIcon,
  BarChart as AnalyticsIcon,
  Cpu as AiCoachIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
} from 'lucide-react';

type SidebarProps = {
  collapsed?: boolean;
  onClose?: () => void; // used for mobile to close the sidebar after navigation
};

const navItems = [
  { key: 'dashboard', label: 'Dashboard', href: '/', icon: HomeIcon },
  { key: 'quests', label: 'Quests', href: '/quests', icon: QuestsIcon },
  { key: 'calendar', label: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { key: 'analytics', label: 'Analytics', href: '/analytics', icon: AnalyticsIcon },
  { key: 'aicoach', label: 'AI Coach', href: '/ai-coach', icon: AiCoachIcon },
  { key: 'settings', label: 'Settings', href: '/settings', icon: SettingsIcon },
];

export default function Sidebar({ collapsed = false, onClose }: SidebarProps) {
  const pathname = usePathname() || '/';

  return (
    <nav
      className={`h-full min-h-0 flex flex-col bg-zinc-900 text-white p-4 transition-all duration-150 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      aria-label="Primary"
    >
      <div className="flex items-center gap-3 px-2 py-3">
        <MenuIcon className="h-5 w-5 text-gray-300" />
        {!collapsed && <span className="text-lg font-semibold">AaronOS</span>}
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.key} onClick={() => onClose?.()}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition ${
                    active ? 'bg-zinc-800 text-white' : 'text-gray-300'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-green-400' : 'text-gray-400'}`} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 px-2">
        <Link
          href="/settings"
          className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-zinc-800 text-gray-300 transition"
        >
          <SettingsIcon className="h-5 w-5 text-gray-400" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </Link>
      </div>
    </nav>
  );
}
