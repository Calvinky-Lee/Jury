import { NextRequest, NextResponse } from "next/server";

const SIDEBAR_SERVICE_URL = process.env.SIDEBAR_SERVICE_URL ?? "http://localhost:8787";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const res = await fetch(`${SIDEBAR_SERVICE_URL}/sessions/${id}/events`);
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "sidebar service unreachable" }, { status: 502 });
  }
}
