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
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
        <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded mb-2"></div>
        <div className="grid grid-cols-24 gap-1 mt-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded-sm"></div>
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

  const statusIcons = {
    green: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    yellow: <Clock className="w-4 h-4 text-amber-500" />,
    red: <AlertCircle className="w-4 h-4 text-rose-500" />,
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className={clsx('p-2 rounded-lg bg-opacity-10', {
            'bg-emerald-500': data.status === 'green',
            'bg-amber-500': data.status === 'yellow',
            'bg-rose-500': data.status === 'red',
          })}>
            <Server className={clsx('w-5 h-5', {
              'text-emerald-500': data.status === 'green',
              'text-amber-500': data.status === 'yellow',
              'text-rose-500': data.status === 'red',
            })} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              <span className="flex items-center gap-1 font-medium capitalize">
                {statusIcons[data.status]}
                {data.status === 'green' ? 'Operational' : data.status === 'yellow' ? 'Checking' : 'Service Down'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-8">
          <div className="text-center md:text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Uptime</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{data.uptime.toFixed(2)}%</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Response</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {data.currentPing > 0 ? `${data.currentPing}ms` : '--'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
          <span>{data.timeline[0]?.day} {data.timeline[0]?.hour}:00</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>Up</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <span>Down</span>
            </div>
          </div>
          <span>Now</span>
        </div>
        
        <div className="flex gap-1 h-12">
          {data.timeline.map((point, i) => (
            <div
              key={`${point.day}-${point.hour}-${i}`}
              className={clsx(
                'flex-1 rounded-sm cursor-help transition-all hover:opacity-80 relative group',
                statusColors[point.status]
              )}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                <div className="font-bold border-b border-gray-700 pb-1 mb-1">
                  {point.day} @ {point.hour}:00
                </div>
                <div className="flex justify-between mb-0.5">
                  <span>Status:</span>
                  <span className={clsx({
                    'text-emerald-400': point.status === 'green',
                    'text-amber-400': point.status === 'yellow',
                    'text-rose-400': point.status === 'red'
                  })}>{point.status.toUpperCase()}</span>
                </div>
                <div className="flex justify-between mb-0.5">
                  <span>Avg Latency:</span>
                  <span>{point.avgPing}ms</span>
                </div>
                {point.downCount > 0 && (
                  <div className="flex justify-between text-rose-300">
                    <span>Incidents:</span>
                    <span>{point.downCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Activity className="w-3 h-3" />
            <span>Last 24 hours monitoring</span>
          </div>
          <div className="text-[10px] text-gray-300 dark:text-gray-600 font-mono italic">
            GEN-HUB Monitoring Service v1.0
          </div>
        </div>
      </div>
    </div>
  );
}
