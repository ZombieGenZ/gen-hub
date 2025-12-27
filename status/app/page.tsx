'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';

import { LanguageToggle } from '@/components/language-toggle';

type StatusDetail = {
  status: 'ok' | 'down';
  uptime?: number;
  [key: string]: any;
};

type ServiceStatus = {
  name: string;
  status: 'up' | 'down';
  latency?: number;
  code?: number;
  error?: string;
  uptime?: number;
  details?: StatusDetail;
};

type StatusResponse = {
  client: ServiceStatus;
  server: ServiceStatus;
  databasePanel?: ServiceStatus;
  featureFlagPanel?: ServiceStatus;
  resourcesPanel?: ServiceStatus;
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch status", error);
    } finally {
      setLoading(false);
      // Recursive polling: Schedule next fetch ONLY after current one finishes
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(fetchData, 600000); // 600 seconds
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchData]);

  // Manual refresh should cancel existing timer and restart immediately
  const handleManualRefresh = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    fetchData();
  };

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex justify-end gap-2 mb-8">
          <LanguageToggle />
        </div>

        <header className="mb-16 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-primary">
            {t('systemStatus')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg">{t('subtitle')}</p>
        </header>

        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            <div className="h-48 rounded-2xl bg-neutral-200 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800"></div>
            <div className="h-48 rounded-2xl bg-neutral-200 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800"></div>
            <div className="h-48 rounded-2xl bg-neutral-200 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800"></div>
            <div className="h-48 rounded-2xl bg-neutral-200 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800"></div>
            <div className="h-48 rounded-2xl bg-neutral-200 dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800"></div>
          </div>
        ) : data && data.client && data.server ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatusCard serviceKey="client" service={data.client} />
            <StatusCard serviceKey="server" service={data.server} />
            {data.databasePanel && (
              <StatusCard serviceKey="databasePanel" service={data.databasePanel} />
            )}
            {data.featureFlagPanel && (
              <StatusCard serviceKey="featureFlagPanel" service={data.featureFlagPanel} />
            )}
            {data.resourcesPanel && (
              <StatusCard serviceKey="resourcesPanel" service={data.resourcesPanel} />
            )}
          </div>
        ) : (
          <div className="text-center text-red-500">
            <p className="text-xl mb-2">{t('failedData')}</p>
            {data && (data as any).error && <p className="text-sm opacity-70">{t('error')}: {(data as any).error}</p>}
          </div>
        )}

        <footer className="mt-16 text-center text-neutral-500 text-sm">
          {lastUpdated && (
            <p>{t('lastChecked')}: {lastUpdated.toLocaleTimeString()}</p>
          )}
        </footer>
      </div>
    </main>
  );
}
