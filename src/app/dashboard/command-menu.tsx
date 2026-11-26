"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const commands = [
  ["Add quest", "/dashboard/quests?add=1"], ["Log food", "/dashboard/nutrition?kind=meals&add=1"],
  ["Log weight", "/dashboard/nutrition?kind=measurements&add=1"], ["Log workout", "/dashboard/fitness?kind=workouts&add=1"],
  ["Work timer", "/dashboard/work?kind=work"], ["Focus timer", "/dashboard/work?kind=focus"],
  ["Add expense", "/dashboard/personal?kind=finance&add=1"], ["Add habit", "/dashboard/wellness?kind=habits&add=1"],
  ["Add note", "/dashboard/personal?kind=journal&add=1"], ["Add calendar event", "/dashboard/personal?kind=events&add=1"],
  ["Settings", "/dashboard/settings"], ["Analytics", "/dashboard/analytics"], ["Personal coach", "/dashboard/coach"],
];

export default function CommandMenu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      if (dialog.current?.open) dialog.current.close();
      else dialog.current?.showModal();
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  return <>
    <button className="rounded-lg bg-zinc-800 px-3 py-2 text-sm" onClick={() => dialog.current?.showModal()}>Quick actions <kbd className="ml-1 text-zinc-400">Ctrl K</kbd></button>
    <dialog ref={dialog} aria-labelledby="command-title" onClose={() => setQuery("")} className="m-auto max-h-[80vh] w-[min(90vw,30rem)] rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white backdrop:bg-black/70">
      <div className="flex items-center justify-between"><h2 className="font-semibold" id="command-title">Quick actions</h2><button onClick={() => dialog.current?.close()} className="rounded bg-zinc-800 px-2 py-1">Close</button></div>
      <input aria-label="Search actions" placeholder="Search actions" value={query} onChange={(event) => setQuery(event.target.value)} className="my-3 w-full rounded border border-zinc-700 bg-zinc-900 p-2" />
      <ul className="space-y-1">{commands.filter(([label]) => label.toLowerCase().includes(query.toLowerCase())).map(([label, href]) =>
        <li key={label}><Link href={href} onClick={() => { dialog.current?.close(); if (href.endsWith("#quests")) requestAnimationFrame(() => document.getElementById("quest-title")?.focus()); }} className="block rounded px-2 py-1 hover:bg-zinc-800 focus:bg-zinc-800">{label}</Link></li>)}</ul>
    </dialog>
  </>;
}
