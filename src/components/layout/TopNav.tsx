'use client';

import React from 'react';
import { Menu } from 'lucide-react';

type TopNavProps = {
  onToggleSidebar?: () => void;
  title?: string;
};

export default function TopNav({ onToggleSidebar, title = 'AaronOS' }: TopNavProps) {
  return (
    <header className="w-full border-b border-zinc-800 bg-black/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle sidebar"
              onClick={onToggleSidebar}
              className="-ml-2 inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden sm:block">
              <h1 className="text-xl font-semibold text-white">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 text-gray-300">
              {/* Placeholder for future controls: user avatar, notifications */}
              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm text-gray-300">A</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
