/**
 * Resources Module Interfaces
 * Định nghĩa các types cho resource metrics
 */

export interface CpuMetrics {
  usage: number; // Percentage 0-100
  cores: number;
}

export interface MemoryMetrics {
  used: number; // Bytes
  total: number; // Bytes
  percentage: number; // 0-100
}

export interface DiskMetrics {
  used: number; // Bytes
  total: number; // Bytes
  percentage: number; // 0-100
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  bytesInPerSec: number;
  bytesOutPerSec: number;
}

export interface ServiceMetrics {
  service: string;
  status: 'online' | 'offline' | 'unknown';
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  uptime: number; // Seconds
  lastUpdated: Date;
  responseTime?: number; // ms - for external services
}

export interface ResourcesOverview {
  totalServices: number;
  onlineServices: number;
  offlineServices: number;
  averageCpu: number;
  averageMemory: number;
  averageDisk: number;
  timestamp: Date;
}

export interface ResourcesUpdateEvent {
  type: 'update';
  data: {
    services: ServiceMetrics[];
    overview: ResourcesOverview;
  };
  timestamp: string;
}

export interface ResourcesSubscribePayload {
  services?: string[]; // Optional: specific services to subscribe
}

export const SERVICES = [
  'server',
  'client', 
  'database-panel',
  'feature-flag-panel',
  'status',
  'resources-panel',
] as const;

export type ServiceName = typeof SERVICES[number];
