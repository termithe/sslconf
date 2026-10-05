import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startedAt = Date.now();

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sslconf",
    version: process.env.npm_package_version ?? "0.1.0",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString()
  }, {
    headers: {
      "cache-control": "no-store"
    }
  });
}
