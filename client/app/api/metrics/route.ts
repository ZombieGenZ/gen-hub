import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';

export const dynamic = 'force-dynamic';

// API Key validation for metrics endpoint
const RESOURCES_API_KEY = process.env.RESOURCES_API_KEY || '';

// CPU metrics calculation
let lastCpuInfo: { idle: number; total: number } | null = null;

function getCpuMetrics() {
    const cpus = os.cpus();
    const cores = cpus.length;

    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
        for (const type in cpu.times) {
            totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
    }

    let usage = 0;
    if (lastCpuInfo) {
        const idleDiff = totalIdle - lastCpuInfo.idle;
        const totalDiff = totalTick - lastCpuInfo.total;
        usage = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;
    }

    lastCpuInfo = { idle: totalIdle, total: totalTick };

    return { usage: Math.max(0, Math.min(100, usage)), cores };
}

function getMemoryMetrics() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percentage = Math.round((used / total) * 100);
    const processMemory = process.memoryUsage();

    return {
        used,
        total,
        percentage,
        heapUsed: processMemory.heapUsed,
        heapTotal: processMemory.heapTotal,
        rss: processMemory.rss,
    };
}

function getDiskMetrics() {
    try {
        const path = process.platform === 'win32' ? 'C:\\' : '/';
        const stats = fs.statfsSync(path);

        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        const used = total - free;
        const percentage = Math.round((used / total) * 100);

        return { used, total, percentage };
    } catch {
        return { used: 0, total: 0, percentage: 0 };
    }
}

// Network metrics
let lastNetworkStats: { bytesIn: number; bytesOut: number; timestamp: number } | null = null;

function getNetworkMetrics() {
    const memUsage = process.memoryUsage();
    const bytesIn = memUsage.heapUsed;
    const bytesOut = memUsage.heapTotal - memUsage.heapUsed;

    let bytesInPerSec = 0;
    let bytesOutPerSec = 0;

    if (lastNetworkStats) {
        const timeDiff = (Date.now() - lastNetworkStats.timestamp) / 1000;
        if (timeDiff > 0) {
            bytesInPerSec = Math.max(0, Math.abs(bytesIn - lastNetworkStats.bytesIn) / timeDiff);
            bytesOutPerSec = Math.max(0, Math.abs(bytesOut - lastNetworkStats.bytesOut) / timeDiff);
        }
    }

    lastNetworkStats = { bytesIn, bytesOut, timestamp: Date.now() };

    return { bytesIn, bytesOut, bytesInPerSec, bytesOutPerSec };
}

export async function GET(request: Request) {
    // Validate API Key
    const apiKey = request.headers.get('X-Resources-Api-Key');
    if (RESOURCES_API_KEY && apiKey !== RESOURCES_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        status: 'ok',
        service: 'client',
        uptime: process.uptime(),
        cpu: getCpuMetrics(),
        memory: getMemoryMetrics(),
        disk: getDiskMetrics(),
        network: getNetworkMetrics(),
        timestamp: new Date().toISOString(),
    });
}
