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
  if (xp < 50) return "bg-emerald-950";
  if (xp < 100) return "bg-emerald-800";
  if (xp < 200) return "bg-emerald-600";
  return "bg-emerald-400";
}

export default function Heatmap({ week }: HeatmapProps) {

  const [selected, setSelected] = useState<Day | null>(null);

  return (
    <div>

      <div className="grid max-w-xl grid-cols-7 gap-2">

       {week.map((day, index) => (

  <button
    key={`${day.day}-${index}`}
            type="button"
            aria-label={`${day.day}, ${day.xp} XP`}
            aria-pressed={selected?.day === day.day}
            onClick={() => setSelected(day)}
            className={`h-9 rounded-md text-xs ring-emerald-300 transition-colors hover:ring-1 aria-pressed:ring-1 ${getColor(day.xp)} ${day.xp >= 100 ? "text-emerald-950" : "text-zinc-200"}`}
          >{day.day.slice(-2)}</button>

        ))}

      </div>

      {selected && (

        <div className="mt-6 rounded-2xl bg-zinc-800 p-4">

          <p className="text-sm text-zinc-400">
            {selected.day}
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {week.find((day) => day.day === selected.day)?.xp ?? 0} XP
          </h3>


        </div>

      )}

    </div>
  );
}
