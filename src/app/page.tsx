    import {
  Flame,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";

import DashboardGrid from "@/components/dashboard/DashboardGrid";

export default function DashboardPage() {
  const stats = {
    level: 4,
    currentXP: 820,
    nextLevelXP: 1000,
    todayXP: 120,
    streak: 18,
  };

  const quests = [
    {
      id: 1,
      title: "Morning Workout",
      category: "Health",
      xp: 40,
      completed: false,
    },
    {
      id: 2,
      title: "GitHub Commit",
      category: "Career",
      xp: 60,
      completed: true,
    },
    {
      id: 3,
      title: "Solve 2 LeetCode Problems",
      category: "Learning",
      xp: 80,
      completed: false,
    },
    {
      id: 4,
      title: "Read 20 Pages",
      category: "Learning",
      xp: 20,
      completed: false,
    },
  ];

  const heatmap = [
    210,
    180,
    95,
    20,
    240,
    300,
    160,
  ];

  const aiTips = [
    "You're most productive before noon.",
    "Health XP has dropped this week.",
    "One GitHub commit today keeps your streak alive.",
  ];

  return (
    <div className="space-y-8">

      {/* Greeting */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-5xl font-bold">
            Good Afternoon Aaron 👋
          </h1>

          <p className="mt-2 text-zinc-400">
            Ready to level up today?
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-zinc-900 px-5 py-3 md:mt-0">

          <Flame className="text-orange-500" />

          <div>

            <div className="text-xs text-zinc-400">
              Current Streak
            </div>

            <div className="text-xl font-bold">
              {stats.streak} Days
            </div>

          </div>

        </div>

      </div>

      <DashboardGrid
        stats={stats}
        quests={quests}
        heatmap={heatmap}
        aiTips={aiTips}
      />

    </div>
  );
}