"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BookOpen, Calendar, ChevronLeft, CircleUser, Command, Dumbbell, LayoutDashboard, Menu, Settings, Zap } from "lucide-react";
import CommandMenu from "./command-menu";
import { entries } from "@/lib/tracker-repository";
import { supabase } from "@/lib/supabase";

const groups = [
  { label: "Workspace", icon: LayoutDashboard, items: [["Dashboard", ""], ["Quests", "/quests"], ["Work", "/work?kind=work"], ["Projects", "/work?kind=projects"]] },
  { label: "Health", icon: Dumbbell, items: [["Fitness", "/fitness"], ["Nutrition", "/nutrition"], ["Body Progress", "/nutrition?kind=measurements"], ["Habits", "/wellness?kind=habits"], ["Wellness", "/wellness?kind=wellness"]] },
  { label: "Growth", icon: BookOpen, items: [["Coding", "/coding"], ["Learning", "/coding?kind=learning"], ["Goals", "/personal?kind=goals"], ["Journal", "/personal?kind=journal"]] },
  { label: "Planning", icon: Calendar, items: [["Finance", "/personal?kind=finance"], ["Calendar", "/personal?kind=events"], ["Analytics", "/analytics"], ["AI Coach", "/coach"], ["Settings", "/settings"]] },
];

export default function Shell({ children, local }: { children: React.ReactNode; local: boolean }) {
  const path = usePathname();
  const kind = useSearchParams().get("kind");
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, string | number>>({});
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    entries(local).then((rows) => { if (live) setPreferences(rows.find((row) => row.kind === "settings")?.fields ?? {}); }, () => {});
    return () => { live = false; };
  }, [local, path, kind]);
  const active = (href: string) => {
    const [route, query] = href.split("?kind=");
    return path === "/dashboard" + route && (query ? query === kind : !kind);
  };
  const hidden = String(preferences.hiddenModules || "").toLowerCase().split(",").map((item) => item.trim());
  const page = groups.flatMap((group) => group.items).find(([, href]) => active(href))?.[0] ?? groups.flatMap((group) => group.items).find(([, href]) => "/dashboard" + href.split("?")[0] === path)?.[0] ?? "Workspace";
  let date = "";
  try { date = new Intl.DateTimeFormat("en-IN", { timeZone: String(preferences.timezone || "Asia/Kolkata"), weekday: "short", month: "short", day: "numeric" }).format(new Date()); } catch {}
  return <div className="os-shell" data-collapsed={collapsed}>
    {mobile && <button className="os-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className="os-sidebar" data-open={mobile}>
      <div className="os-brand"><Link href="/dashboard" onClick={() => setMobile(false)}><Command size={20} /><span>AaronOS</span></Link><button className="os-collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}><ChevronLeft size={16} /></button></div>
      <nav aria-label="Workspace navigation">{groups.map(({ label, icon: Icon, items }) => <details key={label} open>
        <summary><Icon size={14} /><span>{label}</span></summary>
        {items.filter(([title, href]) => active(href) || ["Dashboard", "Settings", "Quests"].includes(title) || !hidden.includes(href.split("?")[0].slice(1))).map(([title, href]) => <Link key={title} href={"/dashboard" + href} aria-current={active(href) ? "page" : undefined} onClick={() => setMobile(false)}>{title}</Link>)}
      </details>)}</nav>
      <div className="os-sidebar-foot"><Activity size={14} />{local ? "Local development" : "Private workspace"}</div>
    </aside>
    <div className="os-main">
      <header className="os-topbar">
        <button className="os-mobile" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={20} /></button>
        <div className="os-crumb"><span>Workspace</span><strong>{page}</strong></div>
        <time suppressHydrationWarning>{date}</time><CommandMenu />
        <Link href="/dashboard#reminders" title="Reminders" aria-label="Reminders"><Zap size={17} /></Link>
        <details className="os-profile"><summary aria-label="Profile"><CircleUser size={20} /></summary><div><Link href="/dashboard/settings"><Settings size={14} /> Preferences</Link>
          {!local && <button onClick={async () => { const result = await supabase?.auth.signOut(); if (result?.error) setNotice(result.error.message); else { router.replace("/auth/login"); router.refresh(); } }}>Sign out</button>}
          {notice && <p role="alert">{notice}</p>}</div></details>
      </header>
      {children}
    </div>
  </div>;
}
