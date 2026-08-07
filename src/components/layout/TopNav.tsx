"use client";

import React from "react";
import { Menu } from "lucide-react";
import UserMenu from "@/components/UserMenu";


type TopNavProps = {
  onToggleSidebar?: () => void;
  title?: string;
};

export default function TopNav({
  onToggleSidebar,
  title = "AaronOS",
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-black/80 backdrop-blur">
      <div className="flex h-20 items-center justify-between px-6">

        {/* Left */}

        <div className="flex items-center gap-4">

          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-800 lg:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold text-white">
              {title}
            </h1>
          </div>

        </div>

        {/* Right */}

        <div className="flex items-center gap-4">


          <UserMenu />

        </div>

      </div>
    </header>
  );
}