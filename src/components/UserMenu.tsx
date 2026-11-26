"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function UserMenu() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  async function logout() {
    setLoading(true);

    await supabase?.auth.signOut();

    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
  onClick={() => setOpen(!open)}
  className="rounded-full transition hover:scale-105"
>
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 font-bold text-white hover:bg-zinc-700">
    A
  </div>
</button>

      {open && (
        <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">

          <div className="border-b border-zinc-800 p-4">
            <p className="font-semibold text-white">
              Aaron
            </p>

            <p className="text-sm text-zinc-400">
              Your Account
            </p>
          </div>

          <button className="flex w-full items-center gap-3 px-4 py-3 hover:bg-zinc-800">
            <User size={18} />
            Profile
          </button>

          <button className="flex w-full items-center gap-3 px-4 py-3 hover:bg-zinc-800">
            <Settings size={18} />
            Settings
          </button>

          <div className="border-t border-zinc-800" />

          <button
            onClick={logout}
            disabled={loading}
            className="flex w-full items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={18} />

            {loading ? "Logging out..." : "Logout"}
          </button>

        </div>
      )}
    </div>
  );
}
