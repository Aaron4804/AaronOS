import React from 'react';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import { sampleStats, sampleQuests, sampleHeatmap, aiRecommendations } from '@/lib/mockData';

// Helper to pick last 7 days for the week view from sampleHeatmap
function last7DaysWeek(heatmap: { date: string; xp: number }[]) {
  const last7 = heatmap.slice(-7);
  return last7;
}

export default function DashboardPage() {
  const heatmapWeek = last7DaysWeek(sampleHeatmap);

  return (
    <section>
      <DashboardGrid stats={sampleStats} quests={sampleQuests} heatmapWeek={heatmapWeek} aiRecommendations={aiRecommendations} />
    </section>
  );
}
