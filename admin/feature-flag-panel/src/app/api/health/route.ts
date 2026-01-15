import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'feature-flag-panel',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
}
