import { redirect } from "next/navigation";
import { localMode, serverSupabase } from "@/lib/server-auth";
import QuestCenter from "../quest-center";

export const dynamic = "force-dynamic";
export default async function QuestsPage() {
  const local = localMode();
  if (!local && !(await (await serverSupabase())?.auth.getUser())?.data.user) redirect("/auth/login");
  return <main className="os-content space-y-6"><h1 className="os-title">Quests</h1><QuestCenter local={local} /></main>;
}
