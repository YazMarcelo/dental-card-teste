import { NextResponse } from "next/server";
import { getClinicaId, getHistory } from "@/lib/db";
import { clinicaSlug } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = clinicaSlug();
  const phone = new URL(req.url).searchParams.get("phone");
  if (!slug) {
    return NextResponse.json({ ok: false, error: "CLINICA_SLUG não configurada." }, { status: 500 });
  }
  if (!phone) {
    return NextResponse.json({ ok: false, error: "parâmetro 'phone' obrigatório." }, { status: 400 });
  }
  try {
    const clinicaId = await getClinicaId(slug);
    if (clinicaId == null) {
      return NextResponse.json({ ok: false, error: `Clínica '${slug}' não encontrada no banco.` }, { status: 404 });
    }
    const messages = await getHistory(clinicaId, phone);
    return NextResponse.json({ ok: true, messages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro ao consultar o banco";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
