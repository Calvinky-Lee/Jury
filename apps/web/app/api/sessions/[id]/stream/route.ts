import { NextRequest, NextResponse } from "next/server";

const SIDEBAR_SERVICE_URL = process.env.SIDEBAR_SERVICE_URL ?? "http://localhost:8787";

// Live SSE proxy — must stream the upstream body through untouched rather than
// buffering it, and stay request-time (never cached/prerendered).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lastEventId = req.headers.get("last-event-id");

  try {
    const upstream = await fetch(`${SIDEBAR_SERVICE_URL}/sessions/${id}/stream`, {
      headers: lastEventId ? { "last-event-id": lastEventId } : {},
      cache: "no-store",
      signal: req.signal,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch {
    return NextResponse.json({ error: "sidebar service unreachable" }, { status: 502 });
  }
}
