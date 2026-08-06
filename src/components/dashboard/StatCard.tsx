'use client';

import React from 'react';
import { motion } from 'framer-motion';

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accentClass?: string;
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentClass = 'text-green-400',
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-gray-400">{title}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
          {subtitle && (
            <div className="mt-1 text-sm text-gray-400">{subtitle}</div>
          )}
        </div>

        {Icon && (
          <div className={`rounded-md bg-zinc-800 p-2 ${accentClass}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </motion.div>
  );
}