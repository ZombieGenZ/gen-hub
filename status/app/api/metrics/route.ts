import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const RESOURCES_API_KEY = process.env.RESOURCES_API_KEY || '';

let lastCpuInfo: { idle: number; total: number } | null = null;

function getCpuMetrics() {
    const cpus = os.cpus();
    const cores = cpus.length;
    let totalIdle = 0, totalTick = 0;

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
    const pm = process.memoryUsage();
    return { used, total, percentage, heapUsed: pm.heapUsed, heapTotal: pm.heapTotal, rss: pm.rss };
}

function getDiskMetrics() {
    try {
        const path = process.platform === 'win32' ? 'C:\\' : '/';
        const stats = fs.statfsSync(path);
        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        const used = total - free;
        return { used, total, percentage: Math.round((used / total) * 100) };
    } catch {
        return { used: 0, total: 0, percentage: 0 };
    }
}

let lastNetworkStats: { bytesIn: number; bytesOut: number; timestamp: number } | null = null;

function getNetworkMetrics() {
    const m = process.memoryUsage();
    const bytesIn = m.heapUsed, bytesOut = m.heapTotal - m.heapUsed;
    let bytesInPerSec = 0, bytesOutPerSec = 0;
    if (lastNetworkStats) {
        const td = (Date.now() - lastNetworkStats.timestamp) / 1000;
        if (td > 0) {
            bytesInPerSec = Math.max(0, Math.abs(bytesIn - lastNetworkStats.bytesIn) / td);
            bytesOutPerSec = Math.max(0, Math.abs(bytesOut - lastNetworkStats.bytesOut) / td);
        }
    }
    lastNetworkStats = { bytesIn, bytesOut, timestamp: Date.now() };
    return { bytesIn, bytesOut, bytesInPerSec, bytesOutPerSec };
}

export async function GET(request: Request) {
    const apiKey = request.headers.get('X-Resources-Api-Key');
    if (RESOURCES_API_KEY && apiKey !== RESOURCES_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        status: 'ok',
        service: 'status',
        uptime: process.uptime(),
        cpu: getCpuMetrics(),
        memory: getMemoryMetrics(),
        disk: getDiskMetrics(),
        network: getNetworkMetrics(),
        timestamp: new Date().toISOString(),
    });
}
