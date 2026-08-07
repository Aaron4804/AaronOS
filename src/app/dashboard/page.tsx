import DashboardGrid from "@/components/dashboard/DashboardGrid";

import {
  dashboardStats,
  quests,
  weeklyHeatmap,
  aiRecommendations,
} from "@/lib/mockData";

export default function HomePage() {
  return (
    <main className="space-y-8">
      <DashboardGrid
        stats={dashboardStats}
        quests={quests}
        heatmap={weeklyHeatmap}
        aiTips={aiRecommendations}
      />
    </main>
  );
}