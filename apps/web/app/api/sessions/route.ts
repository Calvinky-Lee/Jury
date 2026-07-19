import { NextRequest, NextResponse } from "next/server";

const SIDEBAR_SERVICE_URL = process.env.SIDEBAR_SERVICE_URL ?? "http://localhost:8787";

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search;
  try {
    const res = await fetch(`${SIDEBAR_SERVICE_URL}/sessions${qs}`);
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "sidebar service unreachable" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const res = await fetch(`${SIDEBAR_SERVICE_URL}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "sidebar service unreachable" }, { status: 502 });
  }
}
