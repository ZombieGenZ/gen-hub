import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  const { type } = params;
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get('range') || '24h';
  
  const trackerUrl = process.env.STATUS_TRACKER_URL || 'http://localhost:4100';

  try {
    const res = await fetch(`${trackerUrl}/tracker/${type}?range=${range}`, {
      next: { revalidate: 30 }, // Cache 30 giây
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch status for ${type}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error fetching tracker data for ${type}:`, error);
    
    // Trả về trạng thái "vàng" nếu tracker service bị down
    return NextResponse.json({
      type,
      status: 'yellow',
      uptime: 0,
      timeline: [],
      error: 'Status tracker unavailable'
    });
  }
}
