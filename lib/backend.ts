import type { ApiResult } from "@/lib/types";

/**
 * Chama o backend dental-card (FastAPI) do lado do SERVIDOR, injetando o
 * X-Webhook-Token a partir da env — o token nunca chega ao browser.
 */
export async function callBackend<T = unknown>(
  path: string,
  payload: unknown
): Promise<ApiResult<T>> {
  const base = process.env.DENTAL_CARD_URL;
  const token = process.env.DENTAL_CARD_TOKEN;

  if (!base) {
    return { ok: false, status: 500, error: "DENTAL_CARD_URL não configurada no servidor." };
  }

  const url = base.replace(/\/+$/, "") + path;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Token": token ?? "",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await res.text();
    let data: unknown = undefined;
    try {
      data = raw ? JSON.parse(raw) : undefined;
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      const detail =
        (data as { detail?: string })?.detail ?? raw ?? `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: String(detail), data: data as T };
    }

    return { ok: true, status: res.status, data: data as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha de rede ao contatar o backend.";
    return { ok: false, status: 0, error: msg };
  }
}

export function clinicaSlug(): string {
  return process.env.CLINICA_SLUG ?? "";
}
