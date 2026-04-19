import { NextResponse } from 'next/server';

export async function GET() {
  const trackerUrl = process.env.STATUS_TRACKER_URL || 'http://localhost:4100';

  try {
    const res = await fetch(`${trackerUrl}/tracker/types`, {
      next: { revalidate: 60 }, // Cache 1 phút
    });

    if (!res.ok) {
      return NextResponse.json({ types: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tracker types:', error);
    return NextResponse.json({ types: [] });
  }
}
