import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Checa se o backend dental-card responde no /health.
export async function GET() {
  const base = process.env.DENTAL_CARD_URL;
  if (!base) {
    return NextResponse.json({ ok: false, error: "DENTAL_CARD_URL não configurada." }, { status: 500 });
  }
  const url = base.replace(/\/+$/, "") + "/health";
  try {
    const res = await fetch(url, { cache: "no-store" });
    return NextResponse.json({ ok: res.ok, status: res.status, backend: base });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    return NextResponse.json({ ok: false, error: msg, backend: base }, { status: 502 });
  }
}
