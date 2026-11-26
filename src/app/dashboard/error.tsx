"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="mx-auto w-full max-w-5xl space-y-3 p-6">
    <h1 className="text-xl font-semibold">AaronOS could not load this page</h1>
    <p className="text-zinc-400">Try again. If the issue continues, check the app configuration and connection.</p>
    <button onClick={reset} className="rounded-lg bg-zinc-800 px-3 py-2">Retry</button>
  </main>;
}
