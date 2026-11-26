import Link from "next/link";
import { nutritionTarget, plansForDay } from "@/lib/daily-planning";
import { shiftDate } from "@/lib/reviews";
import type { Entry } from "@/lib/tracker-repository";
import { kilograms } from "@/lib/tracker-math";

const number = (row: Entry, name: string) => Number(row.fields[name] || 0);
const round = (value: number) => Math.round(value * 10) / 10;

export default function DailyBrief({ rows, today, checkIn, busy }: { rows:Entry[]; today:string; checkIn:(row:Entry,amount:number)=>void; busy:boolean }) {
  if (!today) return null;
  const preferences=rows.find(row=>row.kind==="settings");
  const defaults=["training","nutrition","habits","deadlines","progress"];
  const order=String(preferences?.fields.briefOrder || defaults.join(",")).split(",").map(name=>name.trim().toLowerCase());
  const widget=(name:string)=>({ display:order.includes(name)?undefined:"none", order:order.indexOf(name) });
  const daily=rows.filter(row=>row.day===today);
  const plans=plansForDay(rows,today);
  const training=plans.length>0 || daily.some(row=>row.kind==="workouts"&&row.fields.status!=="Planned");
  const start=shiftDate(today,-6);
  const work=rows.filter(row=>row.kind==="work"&&row.day>=start&&row.day<=today).reduce((sum,row)=>sum+number(row,"minutes"),0);
  const target=Number(preferences?.fields.work || 0);
  const reminders=rows.filter(row=>["projects","goals"].includes(row.kind)&&row.fields.deadline&&String(row.fields.deadline)>=today&&String(row.fields.deadline)<=shiftDate(today,7)&&!["Completed","Archived"].includes(String(row.fields.status))).sort((a,b)=>String(a.fields.deadline).localeCompare(String(b.fields.deadline))).slice(0,3);
  const weekday=["sun","mon","tue","wed","thu","fri","sat"][new Date(today).getUTCDay()];
  const habits=rows.filter(row=>row.kind==="habits"&&row.fields.state!=="Archived"&&row.fields.frequency!=="Weekly"&&(row.fields.frequency!=="Selected weekdays"||String(row.fields.weekdays).toLowerCase().split(",").map(day=>day.trim()).includes(weekday))).slice(0,4);
  const weights=rows.filter(row=>row.kind==="measurements"&&row.day<=today&&number(row,"weight")>0).sort((a,b)=>b.day.localeCompare(a.day)).slice(0,7);
  const latest=weights[0];
  const oldest=weights.at(-1);
  const kg=(row:Entry)=>kilograms(number(row,"weight"),String(row.fields.unit));
  const solved=rows.filter(row=>row.kind==="coding"&&row.day>=start&&row.day<=today&&row.fields.solved==="Yes").length;
  return <section className="grid gap-3 lg:grid-cols-2">
    <article style={widget("training")} className="os-panel space-y-2"><div className="flex justify-between gap-2"><h2 className="font-semibold">Training & work</h2><Link className="text-sm text-emerald-300" href="/dashboard/fitness">Fitness</Link></div><p>{plans.length ? plans.map(row=>row.title).join(", ") : "No workout scheduled today"}</p><p className="text-sm text-zinc-400">{round(work/60)} h worked in the last seven days{target?" / "+round(target/60)+" h target":""}</p>{target>0&&<progress aria-label="Work target" max={target} value={Math.min(work,target)} className="w-full accent-emerald-400"/>}</article>
    <article style={widget("nutrition")} className="os-panel space-y-2"><div className="flex justify-between gap-2"><h2 className="font-semibold">Nutrition today</h2><Link className="text-sm text-emerald-300" href="/dashboard/nutrition">Diary</Link></div>{["calories","protein","carbs","fat"].map(key=>{const total=daily.filter(row=>row.kind==="meals").reduce((sum,row)=>sum+number(row,key),0);const goal=nutritionTarget(preferences,key,training);return <div key={key} className="text-sm"><div className="flex justify-between"><span className="capitalize">{key}</span><span>{round(total)}{goal?" / "+goal:""}</span></div>{goal>0&&<progress className="w-full accent-emerald-400" aria-label={key+" budget"} max={goal} value={Math.min(total,goal)}/>}</div>;})}</article>
    <article style={widget("habits")} className="os-panel space-y-2"><h2 className="font-semibold">Habit checklist</h2>{habits.length ? habits.map(row=>{const remaining=Math.max(0,(number(row,"target")||1)-daily.filter(log=>log.kind==="habitlogs"&&log.fields.habit===row.id).reduce((sum,log)=>sum+number(log,"amount"),0));return <label key={row.id} className="flex min-h-11 items-center gap-3"><input className="size-5 accent-emerald-400" type="checkbox" checked={!remaining} disabled={busy||!remaining} onChange={()=>checkIn(row,remaining)}/>{row.title}</label>;}) : <p className="text-sm text-zinc-400">No habits scheduled today.</p>}</article>
    <article style={widget("deadlines")} className="os-panel space-y-2"><h2 className="font-semibold">Upcoming deadlines</h2>{reminders.length?<ul>{reminders.map(row=><li key={row.id} className="flex justify-between gap-3"><Link className="text-emerald-300" href={row.kind==="projects"?"/dashboard/work?kind=projects&record="+row.id:"/dashboard/personal?kind=goals&record="+row.id}>{row.title}</Link><time>{row.fields.deadline}</time></li>)}</ul>:<p className="text-sm text-zinc-400">No project or goal deadlines in the next seven days.</p>}<Link className="text-sm text-emerald-300" href="/dashboard/personal?kind=events">Open calendar</Link></article>
    <article style={widget("progress")} className="os-panel grid gap-3 sm:grid-cols-2 lg:col-span-2">
      <div><Link href="/dashboard/nutrition?kind=measurements" className="font-semibold text-emerald-300">Body progress</Link><p className="text-sm text-zinc-400">{latest?round(kg(latest))+" kg latest"+(oldest&&oldest.day!==latest.day?" · "+(kg(latest)>=kg(oldest)?"+":"")+round(kg(latest)-kg(oldest))+" kg since "+oldest.day:""):"No weight measurements yet."}</p></div>
      <div><Link href="/dashboard/coding" className="font-semibold text-emerald-300">Developer activity</Link><p className="text-sm text-zinc-400">{solved} manually logged solutions in the last seven days.</p></div>
    </article>
  </section>;
}
