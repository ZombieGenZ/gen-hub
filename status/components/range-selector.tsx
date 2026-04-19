'use client';

import { clsx } from 'clsx';

interface RangeSelectorProps {
  currentRange: string;
  onChange: (range: string) => void;
  ranges: string[];
}

export function RangeSelector({ currentRange, onChange, ranges }: RangeSelectorProps) {
  return (
    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={clsx(
            'px-3 py-1 text-xs font-medium rounded-md transition-all',
            currentRange === range
              ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          {range.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
