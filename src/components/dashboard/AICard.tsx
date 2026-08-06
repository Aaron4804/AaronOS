'use client';

import React from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AICardProps = {
  recommendations: string[];
};

export default function AICard({ recommendations }: AICardProps) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 border border-zinc-800">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            <div className="text-sm text-gray-400">AI Coach</div>
          </div>

          <div className="mt-3 space-y-2">
            {recommendations.map((r, i) => (
              <div key={i} className="text-sm text-gray-200">• {r}</div>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0">
          <Button size="sm">Chat with AI</Button>
        </div>
      </div>
    </div>
  );
}
