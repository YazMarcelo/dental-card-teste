import { NextResponse } from "next/server";
import { callBackend, clinicaSlug } from "@/lib/backend";
import type { DisparoOut } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const slug = clinicaSlug();
  if (!slug) {
    return NextResponse.json(
      { ok: false, status: 500, error: "CLINICA_SLUG não configurada no servidor." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const payload = {
    clinica_slug: slug,
    paciente_telefone: body.phone,
    mensagem: body.mensagem,
    dispatch_id: body.dispatch_id,
    paciente_nome: body.nome ?? null,
    tipo_disparo: body.tipo_disparo ?? null,
    consulta_id_externo: body.consulta_id_externo ?? null,
    consulta_data: body.consulta_data ?? null,
    consulta_hora: body.consulta_hora ?? null,
    especialidade_id: body.especialidade_id ?? null,
    doctor_id: body.doctor_id ?? null,
  };

  const r = await callBackend<DisparoOut>("/disparo", payload);
  return NextResponse.json(r, { status: r.ok ? 200 : r.status || 502 });
}
