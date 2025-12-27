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
    const databasePanelUrl = process.env.DATABASE_PANEL_URL;
    const featureFlagPanelUrl = process.env.FEATURE_FLAG_PANEL_URL;
    const resourcesPanelUrl = process.env.RESOURCES_PANEL_URL;

    if (!clientUrl || !serverUrl) {
        return NextResponse.json({ error: 'CLIENT_URL or SERVER_URL not configured' }, { status: 500 });
    }

    // Append specific health endpoints
    const clientHealthUrl = `${clientUrl}/api/health`;
    const serverHealthUrl = `${serverUrl}/health`;
    const databasePanelHealthUrl = databasePanelUrl ? `${databasePanelUrl}/api/health` : null;
    const featureFlagPanelHealthUrl = featureFlagPanelUrl ? `${featureFlagPanelUrl}/api/health` : null;
    const resourcesPanelHealthUrl = resourcesPanelUrl ? `${resourcesPanelUrl}/api/health` : null;

    // Build promises array
    const promises = [
        checkUrl(clientHealthUrl, 'Client'),
        checkUrl(serverHealthUrl, 'Server'),
    ];

    if (databasePanelHealthUrl) {
        promises.push(checkUrl(databasePanelHealthUrl, 'Database Panel'));
    }
    if (featureFlagPanelHealthUrl) {
        promises.push(checkUrl(featureFlagPanelHealthUrl, 'Feature Flag Panel'));
    }
    if (resourcesPanelHealthUrl) {
        promises.push(checkUrl(resourcesPanelHealthUrl, 'Resources Panel'));
    }

    const results = await Promise.all(promises);

    // Map results to named keys
    const response: Record<string, unknown> = {
        client: results[0],
        server: results[1],
        timestamp: new Date().toISOString(),
    };

    if (databasePanelHealthUrl) {
        response.databasePanel = results[2];
    }
    if (featureFlagPanelHealthUrl) {
        response.featureFlagPanel = results[databasePanelHealthUrl ? 3 : 2];
    }
    if (resourcesPanelHealthUrl) {
        const index = 2 + (databasePanelHealthUrl ? 1 : 0) + (featureFlagPanelHealthUrl ? 1 : 0);
        response.resourcesPanel = results[index];
    }

    return NextResponse.json(response);
}

