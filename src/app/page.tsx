import QuestCard from '../components/QuestCard';
import type { Quest } from '../types/quest';

export default function Home() {
  // Sample quests stored locally for now. These will be replaced by Supabase data later.
  const quests: Quest[] = [
    { id: 'q1', title: '20 Min Cardio', category: 'Health', xp: 40, completed: false },
    { id: 'q2', title: 'GitHub Commit', category: 'Career', xp: 60, completed: false },
    { id: 'q3', title: 'Solve 2 LeetCode Problems', category: 'Learning', xp: 80, completed: false },
  ];

  return (
    <main className="min-h-screen bg-black text-white px-8 py-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold">AaronOS</h1>
          <p className="text-gray-400 mt-2">Your AI Powered Life Operating System</p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-zinc-900 p-6">
            <p className="text-gray-400">Level</p>
            <h2 className="mt-3 text-5xl font-bold">1</h2>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-6">
            <p className="text-gray-400">XP</p>
            <h2 className="mt-3 text-5xl font-bold">0 / 500</h2>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-6">
            <p className="text-gray-400">Today's XP</p>
            <h2 className="mt-3 text-5xl font-bold">0</h2>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-6">
            <p className="text-gray-400">Current Streak</p>
            <h2 className="mt-3 text-5xl font-bold">0 Days</h2>
          </div>
        </div>

        {/* Quests */}
        <section className="mt-14">
          <h2 className="mb-6 text-3xl font-bold">Today's Quests</h2>

          <div className="space-y-5">
            {quests.length ? (
              quests.map((q) => <QuestCard key={q.id} quest={q} />)
            ) : (
              <p className="text-gray-400">No quests for today.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
