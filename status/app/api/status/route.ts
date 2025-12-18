import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function checkUrl(url: string, name: string) {
    try {
        const start = performance.now();
        const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        const latency = Math.round(performance.now() - start);

        if (!res.ok) {
            return { name, status: 'down', code: res.status, latency };
        }

        const data = await res.json();
        return {
            name,
            status: 'up',
            latency,
            uptime: data.uptime,
            details: data
        };
    } catch (error) {
        return { name, status: 'down', error: 'Unreachable' };
    }
}

export async function GET() {
    const clientUrl = process.env.CLIENT_URL;
    const serverUrl = process.env.SERVER_URL;

    if (!clientUrl || !serverUrl) {
        return NextResponse.json({ error: 'CLIENT_URL or SERVER_URL not configured' }, { status: 500 });
    }

    // Append specific health endpoints
    const clientHealthUrl = `${clientUrl}/api/health`;
    const serverHealthUrl = `${serverUrl}/health`;

    const [client, server] = await Promise.all([
        checkUrl(clientHealthUrl, 'Client'),
        checkUrl(serverHealthUrl, 'Server'),
    ]);

    return NextResponse.json({ client, server, timestamp: new Date().toISOString() });
}
