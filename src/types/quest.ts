export type Quest = {
  id: number;
  title: string;
  category: string;
  xp: number;
  completed: boolean;
  createdAt?: string;
};