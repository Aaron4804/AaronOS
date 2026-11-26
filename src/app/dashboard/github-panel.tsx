"use client";

import { useCallback, useEffect, useState } from "react";

type Activity = {
  profile: { login: string; public_repos: number };
  repositories: { name: string; language: string | null; stargazers_count: number; pushed_at: string | null }[];
  events: { id: string; type: string; repo: { name: string }; created_at: string }[] | null;
  syncedAt: string;
  stale?: boolean;
};

export default function GitHubPanel({ username, leetcode }: { username: string; leetcode: string }) {
  const [data, setData] = useState<Activity>();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/dashboard/github?user=" + encodeURIComponent(username), { signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
    } catch (cause) {
      if (!signal?.aborted) setMessage(cause instanceof Error ? cause.message : "GitHub is unavailable.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => { if (!controller.signal.aborted) void load(controller.signal); });
    const id = setInterval(() => void load(controller.signal), 15 * 60_000);
    return () => { controller.abort(); clearInterval(id); };
  }, [load]);

  return <section className="space-y-3 rounded-xl border border-zinc-800 p-4">
    <div className="flex justify-between gap-2"><h2 className="font-semibold">GitHub</h2><button disabled={loading} className="rounded bg-zinc-800 px-3 py-1" onClick={() => void load()}>{loading ? "Loading…" : "Refresh"}</button></div>
    {message && <p role="status">{message}</p>}
    {data && data.profile.login.toLowerCase() === username.toLowerCase() && <>
      <p>{data.profile.login} · {data.profile.public_repos} public repositories</p>
      <p className="text-sm text-zinc-400">Last successful sync: {new Date(data.syncedAt).toLocaleString()}{data.stale ? " · GitHub unavailable; showing cached data" : ""}</p>
      <ul className="space-y-1">{data.repositories.map((repo) => <li key={repo.name}><a className="text-green-400 underline" href={"https://github.com/" + encodeURIComponent(data.profile.login) + "/" + encodeURIComponent(repo.name)}>{repo.name}</a> · {repo.language || "Language unspecified"} · {repo.stargazers_count} stars{repo.pushed_at ? " · Pushed " + repo.pushed_at.slice(0, 10) : ""}</li>)}</ul>
      <details><summary>Recent public activity</summary>
        {data.events === null ? <p>GitHub event data is unavailable.</p> : data.events.length ? <ul>
          {data.events.map((event) => <li key={event.id}>{event.created_at.slice(0, 10)} · {event.type === "PushEvent" ? "Push" : event.type === "PullRequestEvent" ? "Pull request" : "Issue"} · {event.repo.name}</li>)}
        </ul> : <p>No matching public events in the fetched window.</p>}
        <p className="text-sm text-zinc-400">Public events are a recent activity feed. Contribution and commit totals are unavailable here.</p>
      </details>
    </>}
    <p className="text-sm text-zinc-400">Log LeetCode problems in Coding practice. {/^[-\w]+$/.test(leetcode) && <a className="text-green-400 underline" href={"https://leetcode.com/u/" + encodeURIComponent(leetcode) + "/"}>Open LeetCode profile</a>}</p>
  </section>;
}
