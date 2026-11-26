import { notFound, redirect } from "next/navigation";
import { localMode, serverSupabase } from "@/lib/server-auth";
import { trackerGroups } from "@/lib/tracker-definitions";
import Tracker from "../tracker";

export const dynamic = "force-dynamic";

export default async function ModulePage({ params, searchParams }: { params: Promise<{ module: string }>; searchParams: Promise<{ kind?: string; record?: string; add?: string }> }) {
  const { module } = await params;
  const query = await searchParams;
  if (!Object.hasOwn(trackerGroups, module) && !["analytics", "coach"].includes(module)) notFound();
  const local = localMode();
  if (!local) {
    const client = await serverSupabase();
    if (!(await client?.auth.getUser())?.data.user) redirect("/auth/login");
  }
  return <main className="os-content">
    <Tracker key={JSON.stringify(query)} local={local} group={module} initialKind={query.kind} selectedId={query.record} autoAdd={query.add === "1"} />
  </main>;
}
