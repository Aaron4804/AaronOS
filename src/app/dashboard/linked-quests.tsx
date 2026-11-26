"use client";

import { useEffect, useState } from "react";
import { readQuests, type QuestRecord } from "@/lib/quest-repository";

export default function LinkedQuests({ local, value, onChange }: { local:boolean; value:string; onChange:(value:string)=>void }) {
  const [quests,setQuests]=useState<QuestRecord[]>([]);
  const [error,setError]=useState(false);
  useEffect(()=>{ readQuests(local).then(setQuests,()=>setError(true)); },[local]);
  const ids=value.split(",").filter(Boolean);
  return <fieldset className="os-panel space-y-2 sm:col-span-2"><legend className="font-semibold">Associated quests</legend>
    {error && <p role="status">Quests could not be loaded.</p>}
    {quests.filter(quest=>!quest.archived||ids.includes(quest.id)).map(quest=><label className="flex min-h-10 items-center gap-2" key={quest.id}><input type="checkbox" className="size-5 accent-emerald-400" checked={ids.includes(quest.id)} onChange={(event)=>onChange((event.target.checked?[...ids,quest.id]:ids.filter(id=>id!==quest.id)).join(","))}/>{quest.title}</label>)}
    {!error && !quests.length && <p className="text-sm text-zinc-400">Add a quest before linking one here.</p>}
  </fieldset>;
}
