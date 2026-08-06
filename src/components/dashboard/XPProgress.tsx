'use client';

import React from 'react';
import { motion } from 'framer-motion';

type XPProgressProps = {
  currentXP: number;
  xpForNextLevel: number;
};

export default function XPProgress({ currentXP, xpForNextLevel }: XPProgressProps) {
  const progress = Math.min(1, currentXP / xpForNextLevel);
  const percent = Math.round(progress * 100);

  return (
    <div className="rounded-2xl bg-zinc-900 p-4 border border-zinc-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">XP Progress</div>
          <div className="mt-1 text-lg font-semibold">{currentXP} / {xpForNextLevel} XP</div>
        </div>
        <div className="text-sm text-gray-400">{percent}%</div>
      </div>

      <div className="mt-3 h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="h-full rounded-full bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
