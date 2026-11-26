"use client";

import { useEffect, useRef } from "react";

export default function EntryDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className="os-dialog" aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <h2 className="mb-3 text-xl font-semibold">{title}</h2>{children}
  </dialog>;
}
