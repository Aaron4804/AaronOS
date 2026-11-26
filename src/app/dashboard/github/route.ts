import { localMode, serverSupabase } from "@/lib/server-auth";

type Profile = { login: string; public_repos: number };
type Repository = { name: string; language: string | null; stargazers_count: number; pushed_at: string | null };
type PublicEvent = { id: string; type: string; repo: { name: string }; created_at: string; public: boolean };
type Activity = { profile: Profile; repositories: Repository[]; events: PublicEvent[] | null; syncedAt: string };
const cache = new Map<string, Activity>();
const cooldown = new Map<string, { until: number; message: string; status: number }>();
const inFlight = new Map<string, Promise<{ data?: Activity; status: number; message?: string; until?: number }>>();

async function githubFetch(url: string, headers: HeadersInit) {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(url, { headers, signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (response.status < 500 || response.headers.has("retry-after") || attempt) return response;
    } catch (error) {
      const code = (error as { cause?: { code?: string } }).cause?.code;
      if (attempt || code === "EACCES" || code === "EPERM") throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return response!;
}

export async function GET(request: Request) {
  if (!localMode()) {
    const client = await serverSupabase();
    if (!(await client?.auth.getUser())?.data.user) return Response.json({ error: "Sign in first." }, { status: 401 });
  }
  const username = new URL(request.url).searchParams.get("user") ?? "Aaron4804";
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    return Response.json({ error: "Enter a valid GitHub username." }, { status: 400 });
  }
  const key = username.toLowerCase();
  const prior = cache.get(key);
  if (prior && Date.now() - Date.parse(prior.syncedAt) < 15 * 60_000) return Response.json(prior);
  const paused = cooldown.get(key);
  if (paused && paused.until > Date.now()) return prior
    ? Response.json({ ...prior, stale: true })
    : Response.json({ error: paused.message }, { status: paused.status, headers: { "Retry-After": String(Math.ceil((paused.until - Date.now()) / 1000)) } });
  const existing = inFlight.get(key);
  const pending = existing ?? load(username);
  if (!existing) inFlight.set(key, pending);
  const result = await pending;
  if (!existing) inFlight.delete(key);
  if (result.data) {
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, result.data);
    cooldown.delete(key);
    return Response.json(result.data);
  }
  if (cooldown.size >= 100) cooldown.delete(cooldown.keys().next().value!);
  cooldown.set(key, { until: result.until ?? Date.now() + 30_000, message: result.message!, status: result.status });
  return prior && result.status !== 404 ? Response.json({ ...prior, stale: true })
    : Response.json({ error: result.message }, { status: result.status, headers: result.until ? { "Retry-After": String(Math.max(1, Math.ceil((result.until - Date.now()) / 1000))) } : undefined });
}

async function load(username: string) {
  const token = process.env.GITHUB_TOKEN;
  const headers = { Accept: "application/vnd.github+json", ...(token ? { Authorization: "Bearer " + token } : {}) };
  try {
    const base = "https://api.github.com/users/" + encodeURIComponent(username);
    const [profileResponse, reposResponse, eventResponse] = await Promise.all([
      githubFetch(base, headers), githubFetch(base + "/repos?type=owner&sort=pushed&per_page=10", headers),
      githubFetch(base + "/events/public?per_page=30", headers).catch(() => null),
    ]);
    if (profileResponse.status === 404) return { status: 404, message: "GitHub user was not found." };
    const limited = [profileResponse, reposResponse].find((response) => response.status === 429 ||
      (response.status === 403 && (response.headers.has("retry-after") || response.headers.get("x-ratelimit-remaining") === "0")));
    if (limited) {
      const reset = limited.headers.get("x-ratelimit-remaining") === "0" ? Number(limited.headers.get("x-ratelimit-reset")) * 1000 : 0;
      const after = Number(limited.headers.get("retry-after")) * 1000;
      return { status: 429, until: Math.max(reset, Date.now() + (after || 60_000)), message: "GitHub rate limited this request. Try again later." };
    }
    if ([profileResponse, reposResponse].some((response) => [401, 403].includes(response.status))) return { status: 503, message: "GitHub denied access. Check server credentials and API permissions." };
    if (!profileResponse.ok || !reposResponse.ok) throw new Error("GitHub request failed.");
    const profile: Profile = await profileResponse.json();
    const repos: Repository[] = await reposResponse.json();
    const events: PublicEvent[] | null = eventResponse?.ok ? await eventResponse.json() : null;
    const data = {
      profile: { login: profile.login, public_repos: profile.public_repos },
      repositories: repos.map(({ name, language, stargazers_count, pushed_at }) => ({ name, language, stargazers_count, pushed_at })),
      events: events?.filter((event) => event.public && ["PushEvent", "PullRequestEvent", "IssuesEvent"].includes(event.type))
        .slice(0, 10).map(({ id, type, repo, created_at }) => ({ id, type, repo: { name: repo.name }, created_at, public: true })) ?? null,
      syncedAt: new Date().toISOString(),
    };
    return { status: 200, data };
  } catch (error) {
    const code = (error as { cause?: { code?: string } }).cause?.code;
    return { status: 503, message: code === "EACCES" || code === "EPERM"
      ? "This server cannot reach GitHub because outbound network access is blocked."
      : "GitHub is temporarily unavailable. Try again later." };
  }
}
