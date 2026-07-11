import { Pool } from "pg";
import type { Confirmavel, HistoryMsg } from "@/lib/types";

// Pool único (cacheado no global pra sobreviver ao hot-reload do Next em dev).
declare global {
  // eslint-disable-next-line no-var
  var _dcPool: Pool | undefined;
}

function pool(): Pool {
  const url = process.env.DENTAL_CARD_DATABASE_URL;
  if (!url) throw new Error("DENTAL_CARD_DATABASE_URL não configurada no servidor.");
  if (!global._dcPool) {
    global._dcPool = new Pool({
      connectionString: url,
      ssl: process.env.DENTAL_CARD_DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: 4,
      idleTimeoutMillis: 30_000,
    });
  }
  return global._dcPool;
}

export async function getClinicaId(slug: string): Promise<number | null> {
  const r = await pool().query<{ id: string }>("SELECT id FROM clinicas WHERE slug = $1 LIMIT 1", [slug]);
  return r.rows[0] ? Number(r.rows[0].id) : null;
}

/** Leads com agendamento (consulta_id_externo preenchido) — viram os cards de confirmação. */
export async function listConfirmaveis(clinicaId: number): Promise<Confirmavel[]> {
  const r = await pool().query(
    `SELECT paciente_telefone, paciente_nome, consulta_id_externo, status
       FROM leads
      WHERE clinica_id = $1
        AND consulta_id_externo IS NOT NULL
        AND consulta_id_externo <> ''
      ORDER BY atualizado_em DESC
      LIMIT 100`,
    [clinicaId]
  );
  return r.rows.map((row) => ({
    phone: String(row.paciente_telefone),
    nome: row.paciente_nome ?? null,
    consulta_id_externo: String(row.consulta_id_externo),
    status: row.status ?? null,
  }));
}

/** Histórico de conversa (mensagens_log) de um telefone, em ordem cronológica. */
export async function getHistory(clinicaId: number, phone: string): Promise<HistoryMsg[]> {
  const r = await pool().query(
    `SELECT direcao, conteudo, metadados, criada_em
       FROM mensagens_log
      WHERE clinica_id = $1 AND paciente_telefone = $2
      ORDER BY criada_em ASC, id ASC
      LIMIT 500`,
    [clinicaId, phone]
  );
  return r.rows.map((row) => {
    const meta = (row.metadados ?? {}) as { origem?: string };
    return {
      role: String(row.direcao) === "inbound" ? "lead" : "ana",
      text: String(row.conteudo ?? ""),
      ts: row.criada_em ? new Date(row.criada_em).getTime() : 0,
      origem: meta.origem ?? null,
    } as HistoryMsg;
  });
}
