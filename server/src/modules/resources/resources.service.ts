import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import * as fs from 'fs';
import {
    ServiceMetrics,
    ResourcesOverview,
    SERVICES,
    ServiceName,
    CpuMetrics,
    MemoryMetrics,
    DiskMetrics,
    NetworkMetrics,
} from './resources.interfaces';

/**
 * Resources Service
 * Thu thập metrics từ hệ thống và các services
 */
@Injectable()
export class ResourcesService {
    private readonly logger = new Logger(ResourcesService.name);

    // Cache cho việc tính toán network throughput
    private lastNetworkStats: { bytesIn: number; bytesOut: number; timestamp: number } | null = null;

    // Cache CPU usage
    private lastCpuInfo: { idle: number; total: number } | null = null;

    // Service health check URLs and API keys
    private readonly serviceUrls: Record<string, string>;
    private readonly serviceApiKeys: Record<string, string>;

    constructor(private readonly configService: ConfigService) {
        // Load URLs from env or use defaults (using /api/metrics for full system metrics)
        this.serviceUrls = {
            'server': this.configService.get<string>('RESOURCES_SERVER_URL', 'http://localhost:4000/health'),
            'client': this.configService.get<string>('RESOURCES_CLIENT_URL', 'http://localhost:3000/api/metrics'),
            'admin-panel': this.configService.get<string>('RESOURCES_ADMIN_PANEL_URL', 'http://localhost:3600/api/metrics'),
            'database-panel': this.configService.get<string>('RESOURCES_DATABASE_PANEL_URL', 'http://localhost:3600/api/metrics'),
            'feature-flag-panel': this.configService.get<string>('RESOURCES_FEATURE_FLAG_PANEL_URL', 'http://localhost:3700/api/metrics'),
            'status': this.configService.get<string>('RESOURCES_STATUS_URL', 'http://localhost:3500/api/metrics'),
            'resources-panel': this.configService.get<string>('RESOURCES_RESOURCES_PANEL_URL', 'http://localhost:3800/api/metrics'),
        };

        // Load API keys from env
        this.serviceApiKeys = {
            'server': this.configService.get<string>('RESOURCES_API_KEY_SERVER', ''),
            'client': this.configService.get<string>('RESOURCES_API_KEY_CLIENT', ''),
            'admin-panel': this.configService.get<string>('RESOURCES_API_KEY_ADMIN_PANEL', ''),
            'database-panel': this.configService.get<string>('RESOURCES_API_KEY_DATABASE_PANEL', ''),
            'feature-flag-panel': this.configService.get<string>('RESOURCES_API_KEY_FEATURE_FLAG_PANEL', ''),
            'status': this.configService.get<string>('RESOURCES_API_KEY_STATUS', ''),
            'resources-panel': this.configService.get<string>('RESOURCES_API_KEY_RESOURCES_PANEL', ''),
        };
    }

    /**
     * Lấy tất cả metrics của các services
     */
    async getAllServicesMetrics(filterServices?: string[]): Promise<ServiceMetrics[]> {
        const servicesToCheck = filterServices?.length
            ? SERVICES.filter(s => filterServices.includes(s))
            : [...SERVICES];

        const metricsPromises = servicesToCheck.map(service =>
            this.getServiceMetrics(service)
        );

        const results = await Promise.all(metricsPromises);
        return results;
    }

    /**
     * Lấy metrics của một service cụ thể
     */
    async getServiceMetrics(serviceName: ServiceName): Promise<ServiceMetrics> {
        // Server service - đây là chính service đang chạy
        if (serviceName === 'server') {
            return this.getLocalMetrics('server');
        }

        // Các services khác - cần health check
        const healthCheckUrl = this.serviceUrls[serviceName];
        const apiKey = this.serviceApiKeys[serviceName];
        const healthResult = await this.checkServiceHealth(healthCheckUrl, apiKey);

        if (healthResult.status === 'offline') {
            return {
                service: serviceName,
                status: 'offline',
                cpu: { usage: 0, cores: 0 },
                memory: { used: 0, total: 0, percentage: 0 },
                disk: { used: 0, total: 0, percentage: 0 },
                network: { bytesIn: 0, bytesOut: 0, bytesInPerSec: 0, bytesOutPerSec: 0 },
                uptime: 0,
                lastUpdated: new Date(),
                responseTime: healthResult.responseTime,
            };
        }

        // Lấy metrics từ health response nếu có, fallback về local metrics
        const data = healthResult.data;

        // CPU
        const cpu = data?.cpu || await this.getCpuMetrics();

        // Memory
        let memory = this.getMemoryMetrics();
        if (data?.memory) {
            const m = data.memory;
            memory = {
                used: m.used || m.heapUsed || m.rss || 0,
                total: m.total || m.heapTotal || memory.total,
                percentage: m.percentage || (m.heapTotal && m.heapUsed ? Math.round((m.heapUsed / m.heapTotal) * 100) : 0),
            };
        }

        // Disk
        const disk = data?.disk || await this.getDiskMetrics();

        // Network
        const network = data?.network || this.getNetworkMetrics();

        return {
            service: serviceName,
            status: 'online',
            cpu,
            memory,
            disk,
            network,
            uptime: data?.uptime || 0,
            lastUpdated: new Date(),
            responseTime: healthResult.responseTime,
        };
    }

    /**
     * Lấy metrics local của system (cho server chính)
     */
    private async getLocalMetrics(serviceName: string): Promise<ServiceMetrics> {
        const cpu = await this.getCpuMetrics();
        const memory = this.getMemoryMetrics();
        const disk = await this.getDiskMetrics();
        const network = this.getNetworkMetrics();
        const uptime = this.getUptime();

        return {
            service: serviceName,
            status: 'online',
            cpu,
            memory,
            disk,
            network,
            uptime,
            lastUpdated: new Date(),
        };
    }

    /**
     * CPU Metrics
     */
    private async getCpuMetrics(): Promise<CpuMetrics> {
        const cpus = os.cpus();
        const cores = cpus.length;

        // Tính CPU usage
        let totalIdle = 0;
        let totalTick = 0;

        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type as keyof typeof cpu.times];
            }
            totalIdle += cpu.times.idle;
        }

        let usage = 0;
        if (this.lastCpuInfo) {
            const idleDiff = totalIdle - this.lastCpuInfo.idle;
            const totalDiff = totalTick - this.lastCpuInfo.total;
            usage = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;
        }

        this.lastCpuInfo = { idle: totalIdle, total: totalTick };

        return { usage: Math.max(0, Math.min(100, usage)), cores };
    }

    /**
     * Memory Metrics
     */
    private getMemoryMetrics(): MemoryMetrics {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const percentage = Math.round((used / total) * 100);

        return { used, total, percentage };
    }

    /**
     * Disk Metrics (root partition)
     */
    private async getDiskMetrics(): Promise<DiskMetrics> {
        try {
            // Windows: Sử dụng C: drive
            // Linux/Mac: Sử dụng /
            const path = process.platform === 'win32' ? 'C:\\' : '/';
            const stats = fs.statfsSync(path);

            const total = stats.blocks * stats.bsize;
            const free = stats.bfree * stats.bsize;
            const used = total - free;
            const percentage = Math.round((used / total) * 100);

            return { used, total, percentage };
        } catch {
            // Fallback nếu không lấy được disk stats
            return { used: 0, total: 0, percentage: 0 };
        }
    }

    /**
     * Network Metrics
     */
    private getNetworkMetrics(): NetworkMetrics {
        const networkInterfaces = os.networkInterfaces();
        let bytesIn = 0;
        let bytesOut = 0;

        // Trong Node.js không có cách trực tiếp lấy network I/O
        // Đây là placeholder - trong production nên dùng package như systeminformation
        // Giả lập số liệu dựa trên memory usage để demo
        const memUsage = process.memoryUsage();
        bytesIn = memUsage.heapUsed;
        bytesOut = memUsage.heapTotal - memUsage.heapUsed;

        let bytesInPerSec = 0;
        let bytesOutPerSec = 0;

        if (this.lastNetworkStats) {
            const timeDiff = (Date.now() - this.lastNetworkStats.timestamp) / 1000;
            if (timeDiff > 0) {
                bytesInPerSec = Math.max(0, (bytesIn - this.lastNetworkStats.bytesIn) / timeDiff);
                bytesOutPerSec = Math.max(0, (bytesOut - this.lastNetworkStats.bytesOut) / timeDiff);
            }
        }

        this.lastNetworkStats = { bytesIn, bytesOut, timestamp: Date.now() };

        return { bytesIn, bytesOut, bytesInPerSec, bytesOutPerSec };
    }

    /**
     * System Uptime (seconds)
     */
    private getUptime(): number {
        return Math.floor(os.uptime());
    }

    /**
     * Health check một service và lấy metrics
     */
    private async checkServiceHealth(url: string, apiKey?: string): Promise<{
        status: 'online' | 'offline';
        responseTime: number;
        data?: {
            uptime?: number;
            cpu?: { usage: number; cores: number };
            memory?: { used?: number; total?: number; percentage?: number; heapUsed?: number; heapTotal?: number; rss?: number };
            disk?: { used: number; total: number; percentage: number };
            network?: { bytesIn: number; bytesOut: number; bytesInPerSec: number; bytesOutPerSec: number };
        };
    }> {
        const startTime = Date.now();

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const headers: Record<string, string> = {};
            if (apiKey) {
                headers['X-Resources-Api-Key'] = apiKey;
            }

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers,
            });

            clearTimeout(timeout);
            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                return { status: 'offline', responseTime };
            }

            try {
                const data = await response.json();
                return {
                    status: 'online',
                    responseTime,
                    data,
                };
            } catch {
                return { status: 'online', responseTime };
            }
        } catch {
            return {
                status: 'offline',
                responseTime: Date.now() - startTime,
            };
        }
    }

    /**
     * Lấy overview của tất cả resources
     */
    async getResourcesOverview(): Promise<ResourcesOverview> {
        const allMetrics = await this.getAllServicesMetrics();

        const onlineServices = allMetrics.filter(m => m.status === 'online');
        const totalCpu = onlineServices.reduce((sum, m) => sum + m.cpu.usage, 0);
        const totalMemory = onlineServices.reduce((sum, m) => sum + m.memory.percentage, 0);
        const totalDisk = onlineServices.reduce((sum, m) => sum + m.disk.percentage, 0);
        const onlineCount = onlineServices.length || 1;

        return {
            totalServices: SERVICES.length,
            onlineServices: onlineServices.length,
            offlineServices: allMetrics.filter(m => m.status === 'offline').length,
            averageCpu: Math.round(totalCpu / onlineCount),
            averageMemory: Math.round(totalMemory / onlineCount),
            averageDisk: Math.round(totalDisk / onlineCount),
            timestamp: new Date(),
        };
    }
}
