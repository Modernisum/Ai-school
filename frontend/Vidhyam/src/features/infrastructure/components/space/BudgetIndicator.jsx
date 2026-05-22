import React from 'react';
import { DollarSign } from 'lucide-react';

export default function BudgetIndicator({ totalValue, budget }) {
  if (!budget && budget !== 0) {
    return null;
  }

  const ratio = budget > 0 ? totalValue / budget : 0;
  const pct = Math.round(ratio * 100);

  let color;
  let label;
  if (ratio <= 0.7) {
    color = 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30';
    label = 'Within Budget';
  } else if (ratio <= 0.9) {
    color = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30';
    label = 'Near Limit';
  } else {
    color = 'text-rose-600 dark:text-red-400 bg-rose-50 dark:bg-red-500/10 border-rose-200 dark:border-red-500/30';
    label = 'Over Budget';
  }

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${color}`}>
      <DollarSign size={10} />
      <span>{pct}%</span>
      <span className="opacity-70">·</span>
      <span>{label}</span>
    </div>
  );
}
