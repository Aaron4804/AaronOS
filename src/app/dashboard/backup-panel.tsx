"use client";

import { useState } from "react";
import { exportBackup, restoreBackup, validateBackup, type Backup } from "@/lib/backup";

export default function BackupPanel({ local }: { local: boolean }) {
  const [pending, setPending] = useState<Backup>();
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try { await task(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Backup operation failed."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-zinc-800 p-4">
    <h2 className="font-semibold">Full backup and restoration</h2>
    <p className="text-sm text-zinc-400">Includes quests, tracker records, timers, settings and XP history. Keep the file private.</p>
    <button className="rounded bg-zinc-800 px-3 py-2" disabled={busy} onClick={() => void run(async () => {
      const data = await exportBackup(local);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = Object.assign(document.createElement("a"), { href: url, download: "aaronos-full-backup-v1.json" });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    })}>Download full backup</button>
    <label className="block">Choose backup to restore <input disabled={busy} type="file" accept=".json,application/json" onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      setPending(undefined);
      setConfirmation("");
      if (file) void run(async () => {
        if (file.size > 10_000_000) throw new Error("Backup exceeds 10 MB.");
        setPending(validateBackup(JSON.parse(await file.text())));
      });
    }} /></label>
    {pending && <div className="space-y-2 border-l-2 border-amber-500 pl-3">
      <p>This will replace your current AaronOS data with {pending.quests.length} quests, {pending.entries.length} tracker records and {pending.questAwards.length + pending.trackerAwards.length} award records. Download your current backup first.</p>
      <label className="block">Type REPLACE to confirm <input className="rounded border border-zinc-700 bg-zinc-900 p-2" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <button className="rounded bg-red-900 px-3 py-2 disabled:opacity-50" disabled={busy || confirmation !== "REPLACE"} onClick={() => void run(async () => {
        await restoreBackup(local, pending);
        window.location.reload();
      })}>Replace data from backup</button>
    </div>}
    {message && <p role="alert" className="text-red-300">{message}</p>}
  </section>;
}
