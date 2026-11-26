import { localMode, serverSupabase } from "@/lib/server-auth";

type Day = { date: string; contributionCount: number };
type Calendar = { totalContributions: number; weeks: { contributionDays: Day[] }[] };
const snapshots = new Map<string, { calendar: Calendar; syncedAt: number }>();

export async function GET(request: Request) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER_USER_ID;
  if (!token || (!owner && !localMode())) return Response.json({ available: false });
  if (!localMode()) {
    const client = await serverSupabase();
    const user = (await client?.auth.getUser())?.data.user;
    if (!user || user.id !== owner) return Response.json({ available: false });
  }
  const username = new URL(request.url).searchParams.get("user") || "Aaron4804";
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) return Response.json({ available: false }, { status: 400 });
  const cached = snapshots.get(username.toLowerCase());
  if (cached && Date.now() - cached.syncedAt < 15 * 60_000) return Response.json({ available: true, ...cached }, { headers: { "Cache-Control": "private, no-store" } });
  try {
    const result = await fetch("https://api.github.com/graphql", {
      method: "POST", cache: "no-store",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({ query: "query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}", variables: { login: username } }),
    });
    if (!result.ok) throw new Error("GitHub API unavailable");
    const body = await result.json();
    const calendar: Calendar | undefined = body.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) throw new Error("No calendar");
    const entry = { calendar, syncedAt: Date.now() };
    if (snapshots.size >= 20) snapshots.clear();
    snapshots.set(username.toLowerCase(),entry);
    return Response.json({ available: true, ...entry }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json(cached ? { available: true, stale: true, ...cached } : { available: false, unavailable: true }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
