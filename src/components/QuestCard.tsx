'use client';

import React, { useState } from 'react';
import type { Quest } from '../types/quest';

type Props = {
  quest: Quest;
};

export default function QuestCard({ quest }: Props) {
  const [completed, setCompleted] = useState<boolean>(!!quest.completed);

  const handleComplete = () => setCompleted((c) => !c);

  return (
    <div className="flex items-center justify-between rounded-2xl bg-zinc-900 p-6">
      <div>
        <h3
          className={`text-xl font-semibold ${
            completed ? 'line-through text-gray-400' : ''
          }`}
        >
          {quest.title}
        </h3>
        <p className={`mt-1 ${completed ? 'text-green-300' : 'text-gray-400'}`}>
          {quest.category} • +{quest.xp} XP
        </p>
      </div>

      <button
        type="button"
        onClick={handleComplete}
        aria-pressed={completed}
        className={`rounded-xl px-6 py-3 font-semibold transition ${
          completed ? 'bg-gray-600 hover:bg-gray-500' : 'bg-green-600 hover:bg-green-500'
        }`}
      >
        {completed ? 'Completed' : 'Complete'}
      </button>
    </div>
  );
}
