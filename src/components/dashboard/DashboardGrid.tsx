'use client';

import type { Quest } from "@/types/quest";

import StatCard from "./StatCard";
import XPProgress from "./XPProgress";
import QuestList from "./QuestList";
import Heatmap from "./Heatmap";
import QuickActions from "./QuickActions";
import AICard from "./AICard";

import {
  Trophy,
  Flame,
  Zap,
  Star,
} from "lucide-react";

type DashboardStats = {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  todayXP: number;
  streak: number;
};

type HeatmapDay = {
  day: string;
  xp: number;
};

type DashboardGridProps = {
  stats: DashboardStats;
  quests: Quest[];
  heatmap: HeatmapDay[];
  aiTips: string[];
};

export default function DashboardGrid({
  stats,
  quests,
  heatmap,
  aiTips,
}: DashboardGridProps) {
  return (
    <div className="space-y-8">

      {/* Stat Cards */}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Level"
          value={stats.level}
          subtitle="Keep going 🚀"
          icon={Star}
          accentClass="text-yellow-400"
        />

        <StatCard
          title="XP"
          value={`${stats.currentXP} / ${stats.nextLevelXP}`}
          subtitle="Towards next level"
          icon={Zap}
          accentClass="text-green-400"
        />

        <StatCard
          title="Today's XP"
          value={`+${stats.todayXP}`}
          subtitle="Nice progress today"
          icon={Trophy}
          accentClass="text-purple-400"
        />

        <StatCard
          title="Current Streak"
          value={`${stats.streak} Days`}
          subtitle="Don't break it 🔥"
          icon={Flame}
          accentClass="text-orange-400"
        />

      </div>

      <XPProgress
        currentXP={stats.currentXP}
        xpForNextLevel={stats.nextLevelXP}
      />

      <div className="grid gap-6 xl:grid-cols-5">

        {/* LEFT */}

        <div className="space-y-6 xl:col-span-3">

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">

            <h2 className="mb-6 text-2xl font-bold">
              Today's Quests
            </h2>

            <QuestList quests={quests} />

          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">

            <h2 className="mb-6 text-2xl font-bold">
              Quick Actions
            </h2>

            <QuickActions />

          </div>

        </div>

        {/* RIGHT */}

        <div className="space-y-6 xl:col-span-2">

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">

            <h2 className="mb-6 text-2xl font-bold">
              Life Heatmap
            </h2>

            <Heatmap week={heatmap} />

          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">

            <AICard recommendations={aiTips} />

          </div>

        </div>

      </div>

    </div>
  );
}