export type Quest = {
  id: string;
  title: string;
  category: string;
  xp: number;
  // optional fields that may be useful later
  completed?: boolean;
  createdAt?: string;
};
