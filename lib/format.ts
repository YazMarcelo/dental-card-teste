// Renderização de templates e do "negrito" do WhatsApp para HTML seguro.

import type { Simulation } from "@/lib/types";

/** Primeiro nome a partir de um nome completo. */
export function primeiroNome(nome: string | undefined | null): string {
  if (!nome) return "";
  return nome.trim().split(/\s+/)[0] ?? "";
}

/**
 * Substitui placeholders {{chave}} pelos valores informados.
 * Chaves sem valor ficam como estão (útil pra enxergar o que faltou).
 */
export function renderTemplate(message: string, vars: Record<string, string | undefined>): string {
  return message.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (full, key: string) => {
    const v = vars[key];
    return v === undefined || v === null || v === "" ? full : v;
  });
}

/** Monta o dicionário de placeholders a partir de um card de simulação. */
export function buildTemplateVars(
  sim: Simulation,
  clinicName: string
): Record<string, string | undefined> {
  return {
    nome: primeiroNome(sim.nome),
    clinica: clinicName,
    hora: sim.consulta_hora,
    ...(sim.vars ?? {}),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Converte o texto (já com placeholders resolvidos) em HTML seguro:
 * escapa HTML, transforma *negrito* em <strong> e _itálico_ em <em>,
 * e preserva quebras de linha (o container usa white-space: pre-wrap).
 */
export function whatsToHtml(text: string): string {
  let out = escapeHtml(text);
  // *negrito* (um asterisco, sem ser ** e sem quebrar linha dentro)
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s.,!?;:)])/g, "$1<strong>$2</strong>");
  // _itálico_
  out = out.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,!?;:)])/g, "$1<em>$2</em>");
  return out;
}
