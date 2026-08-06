'use client';

import { useState } from "react";

type Day = {
  day: string;
  xp: number;
};

type HeatmapProps = {
  week: Day[];
};

function getColor(xp: number) {
  if (xp === 0) return "bg-zinc-800";
  if (xp < 50) return "bg-red-500";
  if (xp < 100) return "bg-orange-500";
  if (xp < 200) return "bg-yellow-400";
  return "bg-green-500";
}

export default function Heatmap({ week }: HeatmapProps) {

  const [selected, setSelected] = useState<Day | null>(null);

  return (
    <div>

      <div className="grid grid-cols-7 gap-3">

        {week.map((day) => (

          <button
            key={day.day}
            onClick={() => setSelected(day)}
            className={`aspect-square rounded-xl transition-all hover:scale-105 ${getColor(day.xp)}`}
          />

        ))}

      </div>

      {selected && (

        <div className="mt-6 rounded-2xl bg-zinc-800 p-4">

          <p className="text-sm text-zinc-400">
            {selected.day}
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {selected.xp} XP
          </h3>

          <p className="mt-2 text-zinc-400">
            More detailed analytics coming soon...
          </p>

        </div>

      )}

    </div>
  );
}