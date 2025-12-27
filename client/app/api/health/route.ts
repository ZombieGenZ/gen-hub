import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simple health check for status system (no API key required)
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'client',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
}
