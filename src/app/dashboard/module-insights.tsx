import type { Entry } from "@/lib/tracker-repository";
import { shiftDate } from "@/lib/reviews";

export default function ModuleInsights({ kind, rows, today, open }: { kind:string; rows:Entry[]; today:string; open:(row:Entry)=>void }) {
  if (!today) return null;
  const records = rows.filter(row=>row.kind===kind);
  const week = shiftDate(today,-6);
  const value = (row:Entry,key:string) => Number(row.fields[key] || 0);
  if (kind==="journal") {
    const recent=[...records].sort((a,b)=>b.day.localeCompare(a.day)).slice(0,5);
    return <section className="os-hero space-y-3"><h2 className="text-xl font-semibold">Writing space</h2><p>{records.length} entries · {records.filter(row=>row.fields.favorite==="Yes").length} favorites</p><div className="flex flex-wrap gap-2">{recent.map(row=><button className="rounded bg-zinc-800 px-3 py-2" onClick={()=>open(row)} key={row.id}>{row.title}</button>)}</div></section>;
  }
  if (kind==="coding") return <section className="os-panel space-y-3"><h2 className="font-semibold">Practice history</h2><p className="text-sm text-zinc-400">Manually logged LeetCode solutions</p><dl className="grid grid-cols-3 gap-3">{["Easy","Medium","Hard"].map(level=><div key={level}><dt>{level}</dt><dd className="text-xl">{records.filter(row=>row.fields.solved==="Yes" && String(row.fields.platform).toLowerCase()==="leetcode" && row.fields.difficulty===level).length}</dd></div>)}</dl></section>;
  if (kind==="learning") return <section className="os-panel space-y-3"><h2 className="font-semibold">Learning progress</h2><p>{records.filter(row=>row.day>=week && row.day<=today).reduce((sum,row)=>sum+value(row,"minutes"),0)} minutes logged in the last seven days</p>{records.filter(row=>value(row,"total")>0).slice(0,6).map(row=><div key={row.id}><button className="text-emerald-300" onClick={()=>open(row)}>{row.title}</button><progress className="block w-full accent-emerald-400" aria-label={row.title+" lessons"} max={value(row,"total")} value={Math.min(value(row,"lessons"),value(row,"total"))}/></div>)}</section>;
  if (kind==="wellness") {
    const daily=records.filter(row=>row.day===today);
    const sum=(key:string)=>daily.reduce((total,row)=>total+value(row,key),0);
    const hours=daily.reduce((total,row)=>{const diff=(Date.parse(String(row.fields.wake))-Date.parse(String(row.fields.sleep)))/3600000;return total+(Number.isFinite(diff)&&diff>0?diff:0);},0);
    return <section className="os-panel space-y-3"><h2 className="font-semibold">Daily wellness</h2><dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Sleep",hours.toFixed(1)+" h"],["Water",sum("water")+" ml"],["Steps",sum("steps")],["Distance",sum("distance")+" km"]].map(([label,total])=><div key={label}><dt>{label}</dt><dd className="text-xl">{total}</dd></div>)}</dl></section>;
  }
  if (kind==="projects") return <section className="os-panel space-y-3"><h2 className="font-semibold">Project overview</h2><div className="grid gap-3 sm:grid-cols-2">{records.filter(row=>!["Completed","Archived"].includes(String(row.fields.status))).map(row=>{const milestones=rows.filter(item=>item.kind==="milestones"&&item.fields.project===row.id);return <button className="rounded border border-zinc-700 p-3 text-left" key={row.id} onClick={()=>open(row)}><strong>{row.title}</strong><p>{milestones.filter(item=>item.fields.status==="Completed").length}/{milestones.length} milestones{row.fields.deadline?" · Due "+row.fields.deadline:""}</p></button>;})}</div></section>;
  return null;
}
