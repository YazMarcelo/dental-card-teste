import { NextResponse } from "next/server";
import { getClinicaId, listConfirmaveis } from "@/lib/db";
import { clinicaSlug } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const slug = clinicaSlug();
  if (!slug) {
    return NextResponse.json({ ok: false, error: "CLINICA_SLUG não configurada." }, { status: 500 });
  }
  try {
    const clinicaId = await getClinicaId(slug);
    if (clinicaId == null) {
      return NextResponse.json({ ok: false, error: `Clínica '${slug}' não encontrada no banco.` }, { status: 404 });
    }
    const rows = await listConfirmaveis(clinicaId);
    return NextResponse.json({ ok: true, confirmaveis: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro ao consultar o banco";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
