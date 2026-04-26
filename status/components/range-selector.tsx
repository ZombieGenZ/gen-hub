'use client';

import { clsx } from 'clsx';

interface RangeSelectorProps {
  currentRange: string;
  onChange: (range: string) => void;
  ranges: string[];
}

export function RangeSelector({ currentRange, onChange, ranges }: RangeSelectorProps) {
  return (
    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl ring-1 ring-neutral-200/50 dark:ring-neutral-700/50">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={clsx(
            'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200',
            currentRange === range
              ? 'bg-white dark:bg-neutral-700 shadow-sm text-primary dark:text-primary-light ring-1 ring-neutral-200/80 dark:ring-neutral-600/50'
              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
          )}
        >
          {range.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
