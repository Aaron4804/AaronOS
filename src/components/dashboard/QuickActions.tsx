'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Play } from 'lucide-react';

type QuickActionsProps = {
  onAddQuest?: () => void;
  onAddHabit?: () => void;
  onStartFocus?: () => void;
};

export default function QuickActions({ onAddQuest, onAddHabit, onStartFocus }: QuickActionsProps) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 border border-zinc-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">Quick Actions</div>
          <div className="mt-1 text-lg font-semibold">Take quick actions</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddQuest}>
            <Plus className="mr-2 h-4 w-4" /> Add Quest
          </Button>

          <Button variant="outline" size="sm" onClick={onAddHabit}>
            <Plus className="mr-2 h-4 w-4" /> Add Habit
          </Button>

          <Button variant="default" size="sm" onClick={onStartFocus}>
            <Play className="mr-2 h-4 w-4" /> Start Focus
          </Button>
        </div>
      </div>
    </div>
  );
}
