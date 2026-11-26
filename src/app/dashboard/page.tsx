import { redirect } from "next/navigation";
import { localMode, serverSupabase } from "@/lib/server-auth";
import QuestCenter from "./quest-center";
import Tracker from "./tracker";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const local = localMode();
  if (!local) {
    const client = await serverSupabase();
    const result = await client?.auth.getUser();
    if (!result?.data.user) redirect("/auth/login");
  }
  return (
    <main className="os-content space-y-6">
      <h1 className="os-title">Command Center</h1>
      <QuestCenter local={local} compact />
      <Tracker local={local} group="overview" />
    </main>
  );
}
