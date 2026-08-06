'use client';

import React from 'react';
import type { Quest } from '@/types/quest';
import QuestCard from '@/components/QuestCard';

type QuestListProps = {
  quests: Quest[];
};

export default function QuestList({ quests }: QuestListProps) {
  return (
    <div className="space-y-3">
      {quests.map((q) => (
        <QuestCard key={q.id} quest={q} />
      ))}
    </div>
  );
}
