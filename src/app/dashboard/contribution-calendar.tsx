"use client";

import { useEffect, useState } from "react";

type Contribution = { date: string; contributionCount: number };
type Report = { available: boolean; stale?: boolean; unavailable?: boolean; syncedAt: number; calendar: { totalContributions: number; weeks: { contributionDays: Contribution[] }[] } };

export default function ContributionCalendar({ username }: { username: string }) {
  const [report,setReport]=useState<Report>();
  const [selected,setSelected]=useState<Contribution>();
  useEffect(()=>{
    const abort=new AbortController();
    fetch("/dashboard/github/contributions?user="+encodeURIComponent(username),{signal:abort.signal}).then(result=>result.json()).then(setReport,()=>{});
    return ()=>abort.abort();
  },[username]);
  if (!report) return null;
  if (!report.available) return <p className="text-sm text-zinc-400">{report.unavailable?"GitHub contribution data is currently unavailable.":"GitHub contribution calendar requires a configured token and account."}</p>;
  const days=report.calendar.weeks.flatMap(week=>week.contributionDays);
  return <section className="os-panel space-y-3">
    <h2 className="font-semibold">GitHub contributions</h2>
    <p>{report.calendar.totalContributions} in the last year{report.stale ? " · Saved snapshot" : ""}</p>
    <div className="grid grid-cols-7 gap-1 sm:grid-cols-14">{days.slice(-49).map(day=><button key={day.date} aria-label={day.date+": "+day.contributionCount+" contributions"} onClick={()=>setSelected(day)} className={"h-8 rounded text-xs "+(day.contributionCount===0?"bg-zinc-800":day.contributionCount<4?"bg-emerald-800":"bg-emerald-400 text-emerald-950")}>{day.date.slice(-2)}</button>)}</div>
    <p className="text-sm text-zinc-400">{selected ? selected.date+" · "+selected.contributionCount+" contributions" : "Showing the most recent 49 days"}</p>
  </section>;
}
