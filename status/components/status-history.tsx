'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Activity, Clock, Server, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataPoint {
  day: string;
  hour: number;
  status: 'green' | 'yellow' | 'red';
  avgPing: number;
  downCount: number;
}

interface StatusData {
  type: string;
  status: 'green' | 'yellow' | 'red';
  currentPing: number;
  uptime: number;
  timeline: DataPoint[];
}

interface StatusHistoryProps {
  type: string;
  title: string;
  range: string;
}

export function StatusHistory({ type, title, range }: StatusHistoryProps) {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/status-tracker/${type}?range=${range}`);
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch status history:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [type, range]);

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-5 animate-pulse">
        <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-4"></div>
        <div className="h-3 w-64 bg-neutral-100 dark:bg-neutral-800 rounded mb-4"></div>
        <div className="flex gap-1 mt-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex-1 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-sm"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.timeline.length === 0) {
    return null;
  }

  const statusColors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-rose-500',
  };

  const statusBadge = {
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      ring: 'ring-emerald-200/80 dark:ring-emerald-500/20',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
      label: 'Operational',
    },
    yellow: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      ring: 'ring-amber-200/80 dark:ring-amber-500/20',
      dot: 'bg-amber-500 dark:bg-amber-400',
      label: 'Checking',
    },
    red: {
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-400',
      ring: 'ring-rose-200/80 dark:ring-rose-500/20',
      dot: 'bg-rose-500 dark:bg-rose-400',
      label: 'Service Down',
    },
  };

  const badge = statusBadge[data.status];

  return (
    <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30 p-5 transition-all duration-200 hover:border-neutral-200 dark:hover:border-neutral-700">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className={clsx('p-2 rounded-lg', {
            'bg-emerald-500/10': data.status === 'green',
            'bg-amber-500/10': data.status === 'yellow',
            'bg-rose-500/10': data.status === 'red',
          })}>
            <Server className={clsx('w-4.5 h-4.5', {
              'text-emerald-500': data.status === 'green',
              'text-amber-500': data.status === 'yellow',
              'text-rose-500': data.status === 'red',
            })} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={clsx(
                'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1',
                badge.bg, badge.text, badge.ring
              )}>
                <div className={clsx('w-1.5 h-1.5 rounded-full', badge.dot, {
                  'animate-pulse': data.status === 'green',
                })} />
                {badge.label}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          <div className="text-center md:text-right">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold mb-0.5">Uptime</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white font-mono">{data.uptime.toFixed(2)}%</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold mb-0.5">Response</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white font-mono">
              {data.currentPing > 0 ? `${data.currentPing}ms` : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
          <span>{data.timeline[0]?.day} {data.timeline[0]?.hour}:00</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span>Up</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
              <span>Down</span>
            </div>
          </div>
          <span>Now</span>
        </div>
        
        <div className="flex gap-[3px] h-10">
          {data.timeline.map((point, i) => (
            <div
              key={`${point.day}-${point.hour}-${i}`}
              className={clsx(
                'flex-1 rounded-[3px] cursor-help transition-all duration-150 hover:opacity-75 hover:scale-y-110 relative group',
                statusColors[point.status]
              )}
            >
              {/* Tooltip */}
              <div className={clsx(
                "absolute bottom-full mb-2 w-44 p-2.5 bg-neutral-900 dark:bg-neutral-800 text-white text-[10px] rounded-lg shadow-xl ring-1 ring-white/10 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity duration-150",
                i < 4 ? "left-0" : i > data.timeline.length - 5 ? "right-0" : "left-1/2 -translate-x-1/2"
              )}>
                <div className="font-bold border-b border-neutral-700 dark:border-neutral-600 pb-1 mb-1.5 text-[11px]">
                  {point.day} @ {point.hour}:00
                </div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-neutral-400">Status:</span>
                  <span className={clsx('font-semibold', {
                    'text-emerald-400': point.status === 'green',
                    'text-amber-400': point.status === 'yellow',
                    'text-rose-400': point.status === 'red'
                  })}>{point.status.toUpperCase()}</span>
                </div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-neutral-400">Avg Latency:</span>
                  <span className="font-mono">{point.avgPing}ms</span>
                </div>
                {point.downCount > 0 && (
                  <div className="flex justify-between text-rose-300">
                    <span>Incidents:</span>
                    <span className="font-mono">{point.downCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-500">
            <Activity className="w-3 h-3" />
            <span>Last 24 hours monitoring</span>
          </div>
          <div className="text-[10px] text-neutral-300 dark:text-neutral-600 font-mono italic">
            GEN-HUB Monitoring Service v1.0
          </div>
        </div>
      </div>
    </div>
  );
}
