'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Server, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Zap,
  ShieldCheck
} from 'lucide-react';
import { statusTrackerApi, ServiceStatus } from '@/lib/status-tracker';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'rose' | 'amber';
}

interface ServiceCardProps {
  service: ServiceStatus | undefined;
  type: string;
  loading: boolean;
}

export default function StatusTrackerPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('24h');

  const ranges = ['24h', '1d', '3d', '7d', '14d', '30d'];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const availableTypes = await statusTrackerApi.getTypes();
      setTypes(availableTypes);

      const statusPromises = availableTypes.map(type => 
        statusTrackerApi.getServiceStatus(type, range)
      );
      
      const results = await Promise.all(statusPromises);
      const newServices: Record<string, ServiceStatus> = {};
      
      results.forEach((res, index) => {
        if (res) {
          newServices[availableTypes[index]] = res;
        }
      });
      
      setServices(newServices);
    } catch (error) {
      console.error('Failed to fetch status data:', error);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const stats = {
    total: types.length,
    up: Object.values(services).filter(s => s.status === 'green').length,
    down: Object.values(services).filter(s => s.status === 'red').length,
    avgUptime: Object.values(services).reduce((acc, s) => acc + s.uptime, 0) / (Object.values(services).length || 1)
  };

  return (
    <div className="p-6 space-y-6 bg-[#0a0a0a] min-h-screen text-gray-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="text-blue-500" />
            System Status Monitor
          </h1>
          <p className="text-gray-400 mt-1">Giám sát trạng thái thời gian thực của hệ thống GEN-HUB</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-gray-800">
            {ranges.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  range === r ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg hover:bg-[#252525] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Services" 
          value={stats.total} 
          icon={<Server className="text-blue-400" />} 
          color="blue"
        />
        <StatCard 
          title="Services Up" 
          value={stats.up} 
          icon={<CheckCircle2 className="text-emerald-400" />} 
          color="emerald"
        />
        <StatCard 
          title="Services Down" 
          value={stats.down} 
          icon={<AlertCircle className="text-rose-400" />} 
          color="rose"
        />
        <StatCard 
          title="Avg. Uptime" 
          value={`${stats.avgUptime.toFixed(2)}%`} 
          icon={<ShieldCheck className="text-amber-400" />} 
          color="amber"
        />
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {types.map(type => (
          <ServiceCard key={type} service={services[type]} type={type} loading={loading} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colors = {
    blue: "from-blue-500/10 to-transparent border-blue-500/20",
    emerald: "from-emerald-500/10 to-transparent border-emerald-500/20",
    rose: "from-rose-500/10 to-transparent border-rose-500/20",
    amber: "from-amber-500/10 to-transparent border-amber-500/20"
  };

  return (
    <div className={clsx("bg-[#141414] border p-5 rounded-2xl bg-gradient-to-br", colors[color])}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-gray-900/50 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function ServiceCard({ service, type, loading }: ServiceCardProps) {
  if (!service && loading) return <div className="h-40 bg-[#141414] rounded-2xl animate-pulse" />;
  if (!service) return null;

  const statusColors: Record<string, string> = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-rose-500"
  };

  return (
    <div className="bg-[#141414] border border-gray-800 rounded-2xl p-6 transition-all hover:border-gray-700">
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
        <div className="flex items-center gap-4">
          <div className={clsx("p-3 rounded-xl bg-opacity-10", {
            "bg-emerald-500": service.status === 'green',
            "bg-amber-500": service.status === 'yellow',
            "bg-rose-500": service.status === 'red'
          })}>
            <Zap className={clsx("w-6 h-6", {
              "text-emerald-500": service.status === 'green',
              "text-amber-500": service.status === 'yellow',
              "text-rose-500": service.status === 'red'
            })} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white capitalize">{type} Service</h3>
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className={clsx("w-2 h-2 rounded-full animate-pulse", statusColors[service.status])} />
              <span className="text-gray-400 font-medium uppercase tracking-tight">
                {service.status === 'green' ? 'Operational' : service.status === 'yellow' ? 'Warning' : 'Degraded Performance'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase mb-1">Current Latency</p>
            <p className="text-xl font-mono font-bold text-white">{service.currentPing}ms</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase mb-1">Uptime (Range)</p>
            <p className="text-xl font-mono font-bold text-white">{service.uptime.toFixed(3)}%</p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs text-gray-500 uppercase mb-1">Last Checked</p>
            <p className="text-xl font-mono font-bold text-white">
              {new Date(service.lastChecked * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold tracking-tighter">
          <span>{service.timeline[0]?.day} {service.timeline[0]?.hour}:00</span>
          <span>Timeline History</span>
          <span>Current</span>
        </div>
        <div className="flex gap-1 h-10">
          {service.timeline.map((point, i) => (
            <div
              key={`${point.day}-${point.hour}-${i}`}
              className={clsx(
                "flex-1 rounded-sm transition-all hover:scale-y-110 relative group",
                statusColors[point.status]
              )}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-black border border-gray-800 text-[10px] rounded shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                <div className="font-bold border-b border-gray-800 pb-1 mb-1">{point.day} @ {point.hour}:00</div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Ping:</span>
                  <span className="text-white font-mono">{point.avgPing}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={clsx({
                    "text-emerald-400": point.status === 'green',
                    "text-amber-400": point.status === 'yellow',
                    "text-rose-400": point.status === 'red'
                  })}>{point.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
