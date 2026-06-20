import { NextResponse } from 'next/server';

const API_BASE = `http://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || '3004'}`;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/rss/deals`, {
      next: { revalidate: 1800 },
    });
    const xml = await res.text();
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800',
      },
    });
  } catch {
    return new NextResponse('RSS feed tạm thời không khả dụng', { status: 503 });
  }
}
