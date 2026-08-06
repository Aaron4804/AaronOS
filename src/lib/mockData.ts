import { Quest } from "@/types/quest";

export const dashboardStats = {
  level: 4,
  currentXP: 820,
  nextLevelXP: 1000,
  todayXP: 120,
  streak: 18,
};

export const quests: Quest[] = [
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

export const weeklyHeatmap = [
  { day: "Mon", xp: 210 },
  { day: "Tue", xp: 180 },
  { day: "Wed", xp: 95 },
  { day: "Thu", xp: 20 },
  { day: "Fri", xp: 240 },
  { day: "Sat", xp: 300 },
  { day: "Sun", xp: 160 },
];

export const aiRecommendations = [
  "Complete one Career quest before 2 PM.",
  "You're maintaining a great streak 🔥",
  "Health XP is lower than last week.",
];