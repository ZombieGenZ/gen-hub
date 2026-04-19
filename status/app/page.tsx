'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { LanguageToggle } from '@/components/language-toggle';
import { StatusHistory } from '@/components/status-history';
import { RangeSelector } from '@/components/range-selector';
import { Clock, RefreshCw } from 'lucide-react';

type ServiceStatus = {
  name: string;
  status: 'up' | 'down';
  latency?: number;
  code?: number;
  error?: string;
  uptime?: number;
};

type StatusResponse = {
  client: ServiceStatus;
  server: ServiceStatus;
  timestamp: string;
};

function StatusCard({ serviceKey, service }: { serviceKey: string, service: ServiceStatus }) {
  const { t } = useTranslation();
  const isUp = service.status === 'up';

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02] ${isUp
      ? 'bg-white border-neutral-200 shadow-md dark:backdrop-blur-xl dark:bg-emerald-500/10 dark:border-emerald-500/20 text-neutral-900 dark:text-emerald-100'
      : 'bg-white border-neutral-200 shadow-md dark:backdrop-blur-xl dark:bg-red-500/10 dark:border-red-500/20 text-neutral-900 dark:text-red-100'
      }`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-foreground">{t(serviceKey)}</h2>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${isUp
          ? 'bg-emerald-200/50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
          : 'bg-red-200/50 dark:bg-red-500/20 text-red-800 dark:text-red-300'
          }`}>
          <div className={`w-2 h-2 rounded-full ${isUp ? 'animate-pulse bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400'}`} />
          {isUp ? t('operational') : t('down')}
        </div>
      </div>

      <div className="space-y-2">
        {isUp ? (
          <>
            <div className="flex justify-between items-center text-sm text-neutral-600 dark:text-emerald-100/80">
              <span>{t('latency')}</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-emerald-100">{service.latency}ms</span>
            </div>
            <div className="flex justify-between items-center text-sm text-neutral-600 dark:text-emerald-100/80">
              <span>{t('uptime')}</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-emerald-100">{formatUptime(service.uptime)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center text-sm text-red-600 dark:text-red-200">
            <span>{t('error')}</span>
            <span className="font-mono font-medium">{service.error || `Code: ${service.code}`}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatUptime(seconds?: number): string {
  if (!seconds) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m ${Math.floor(seconds % 60)}s`;
}

export default function Home() {
  const { t } = useTranslation();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [trackerTypes, setTrackerTypes] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState('24h');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());

      // Lấy danh sách service types từ tracker
      const trackerRes = await fetch('/api/status-tracker');
      const trackerJson = await trackerRes.json();
      if (trackerJson.types) {
        setTrackerTypes(trackerJson.types);
      }
    } catch (error) {
      console.error("Failed to fetch status", error);
    } finally {
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(fetchData, 300000); // 5 phút refresh 1 lần
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchData]);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex justify-end gap-2 mb-8">
          <LanguageToggle />
        </div>

        <header className="mb-16 text-center">
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            System Live
          </div> */}
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 bg-gradient-to-b from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-500 bg-clip-text text-transparent">
            {t('systemStatus')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl mx-auto">{t('subtitle')}</p>
        </header>

        {/* Realtime Status Cards */}
        <section className="mb-16">
          {loading && !data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              <div className="h-44 rounded-2xl bg-neutral-200 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800"></div>
              <div className="h-44 rounded-2xl bg-neutral-200 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800"></div>
            </div>
          ) : data && data.client && data.server ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatusCard serviceKey="client" service={data.client} />
              <StatusCard serviceKey="server" service={data.server} />
            </div>
          ) : (
            <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800">
              <p className="text-xl text-red-500 mb-2">{t('failedData')}</p>
              <button onClick={() => fetchData()} className="mt-4 px-6 py-2 bg-primary text-white rounded-full flex items-center gap-2 mx-auto hover:opacity-90 transition-all">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          )}
        </section>

        {/* Service History Section (Status Tracker) */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold dark:text-white">Service History</h2>
            </div>

            <RangeSelector
              currentRange={selectedRange}
              onChange={setSelectedRange}
              ranges={['24h', '1d', '3d', '7d']}
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {trackerTypes.length > 0 ? (
              trackerTypes.map((type) => (
                <StatusHistory
                  key={type}
                  type={type}
                  title={`${type.charAt(0).toUpperCase() + type.slice(1)} API Service`}
                  range={selectedRange}
                />
              ))
            ) : (
              !loading && (
                <div className="text-center py-12 text-neutral-400 italic">
                  No history data available for the selected period.
                </div>
              )
            )}
          </div>
        </section>

        <footer className="mt-20 text-center space-y-4">
          <div className="h-px w-24 bg-neutral-200 dark:bg-neutral-800 mx-auto"></div>
          {lastUpdated && (
            <p className="text-neutral-500 text-xs font-medium uppercase tracking-widest">
              {t('lastChecked')}: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <p className="text-[10px] text-neutral-400 dark:text-neutral-600 font-mono italic">
            &copy; 2026 GEN-HUB Infrastructure Monitoring System
          </p>
        </footer>
      </div>
    </main>
  );
}
