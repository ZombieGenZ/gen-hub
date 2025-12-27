import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'status',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
}
