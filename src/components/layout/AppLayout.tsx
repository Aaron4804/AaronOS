'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile
  const [collapsed, setCollapsed] = useState(false); // desktop collapse

  const toggleSidebar = () => setSidebarOpen((s) => !s);
  const closeSidebar = () => setSidebarOpen(false);
  const toggleCollapse = () => setCollapsed((c) => !c);

  // compute main margin for desktop according to collapsed state
  const desktopMarginClass = collapsed ? 'md:ml-20' : 'md:ml-64';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top navigation */}
      <TopNav onToggleSidebar={toggleSidebar} />

      <div className={`relative flex ${desktopMarginClass}`}>
        {/* Desktop sidebar (fixed) */}
        <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col">
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        </div>

        {/* Mobile sidebar (overlay) */}
        <div
          className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}
          aria-hidden={!sidebarOpen}
        >
          {/* backdrop */}
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity ${
              sidebarOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeSidebar}
          />

          <div
            className={`absolute inset-y-0 left-0 z-50 w-64 transform bg-zinc-900 transition-transform ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar onClose={closeSidebar} />
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
