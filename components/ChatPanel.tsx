"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiResult,
  ChatMessage,
  DisparoOut,
  HistoryMsg,
  Simulation,
  TemplateDef,
  WebhookOut,
} from "@/lib/types";
import { buildTemplateVars, renderTemplate, whatsToHtml } from "@/lib/format";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function ana(text: string): ChatMessage {
  return { id: uid(), role: "ana", text, ts: Date.now() };
}
function lead(text: string): ChatMessage {
  return { id: uid(), role: "lead", text, ts: Date.now() };
}
function sys(text: string): ChatMessage {
  return { id: uid(), role: "system", text, ts: Date.now() };
}

interface Props {
  template: TemplateDef;
  sim: Simulation;
  clinicName: string;
  onClose: () => void;
}

export default function ChatPanel({ template, sim, clinicName, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const startedKey = `dcsim:started:v2:${template.id}:${sim.id}`;

  const consultaFields = useCallback(
    () => ({
      consulta_id_externo: sim.consulta_id_externo ?? null,
      consulta_data: sim.consulta_data ?? null,
      consulta_hora: sim.consulta_hora ?? null,
      especialidade_id: sim.especialidade_id ?? null,
      doctor_id: sim.doctor_id ?? null,
    }),
    [sim]
  );

  const rendered = useCallback(
    () => renderTemplate(template.message, buildTemplateVars(sim, clinicName)),
    [template, sim, clinicName]
  );

  // Busca o histórico no banco. Retorna null se o banco não respondeu.
  const fetchHistory = useCallback(async (): Promise<ChatMessage[] | null> => {
    try {
      const res = await fetch(`/api/history?phone=${encodeURIComponent(sim.phone)}`);
      const j = (await res.json()) as { ok: boolean; messages?: HistoryMsg[]; error?: string };
      if (!j.ok || !j.messages) return null;
      return j.messages.map((m, i) => ({ id: `h${i}-${m.ts}`, role: m.role, text: m.text, ts: m.ts }));
    } catch {
      return null;
    }
  }, [sim.phone]);

  const dispatch = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/disparo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: sim.phone,
          nome: sim.nome,
          mensagem: rendered(),
          dispatch_id: `${template.id}:${sim.phone}`,
          tipo_disparo: template.tipo_disparo ?? null,
          ...consultaFields(),
        }),
      });
      const r: ApiResult<DisparoOut> = await res.json();
      return r.ok ? null : r.error ?? "erro";
    } catch (e) {
      return e instanceof Error ? e.message : "erro de rede";
    }
  }, [template, sim, rendered, consultaFields]);

  // Ao abrir (ou trocar de card): dispara o template uma vez e carrega o histórico.
  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      setMessages([]);
      const extra: ChatMessage[] = [];
      let started = false;
      try {
        started = !!localStorage.getItem(startedKey);
      } catch {
        /* ignore */
      }
      if (!started) {
        const err = await dispatch();
        try {
          localStorage.setItem(startedKey, "1");
        } catch {
          /* ignore */
        }
        if (err) extra.push(sys(`⚠️ Falha ao registrar o disparo: ${err}`));
      }
      const hist = await fetchHistory();
      if (!alive) return;
      if (hist === null) {
        // Sem banco disponível: mostra ao menos o template renderizado.
        setMessages([
          ana(rendered()),
          sys("⚠️ Não consegui ler o histórico do banco (confira DENTAL_CARD_DATABASE_URL)."),
          ...extra,
        ]);
      } else {
        setMessages([...hist, ...extra]);
      }
      setBusy(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || busy) return;
    const optimistic = [...messages, lead(text)];
    setMessages(optimistic);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: sim.phone,
          nome: sim.nome,
          mensagem: text,
          ...consultaFields(),
        }),
      });
      const r: ApiResult<WebhookOut> = await res.json();
      const hist = await fetchHistory();
      const base = hist ?? optimistic;
      if (!r.ok) {
        setMessages([...base, sys(`⚠️ Erro do backend: ${r.error ?? "erro"}`)]);
      } else if (r.data?.transferir_humano) {
        setMessages([
          ...base,
          sys(`👤 Conversa transferida para atendente humano${r.data.motivo ? ` — ${r.data.motivo}` : ""}`),
        ]);
      } else if (hist === null) {
        // Sem banco: adiciona a resposta da Ana ao otimista.
        setMessages([...optimistic, ana(r.data?.resposta || "(sem resposta)")]);
      } else {
        setMessages(hist);
      }
    } catch (e) {
      setMessages((prev) => [...prev, sys(`⚠️ Erro de rede: ${e instanceof Error ? e.message : ""}`)]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, busy, messages, sim, consultaFields, fetchHistory]);

  const atualizar = useCallback(async () => {
    setBusy(true);
    const hist = await fetchHistory();
    if (hist) setMessages(hist);
    setBusy(false);
  }, [fetchHistory]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const inicial = (sim.nome.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="chat">
      <div className="chat-head">
        <button className="btn ghost" onClick={onClose} title="Voltar" aria-label="Voltar">
          ←
        </button>
        <div className="avatar">{inicial}</div>
        <div>
          <div className="who">{sim.nome}</div>
          <div className="meta">
            {sim.phone} · {template.id}
          </div>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={() => void atualizar()} title="Recarrega o histórico do banco">
          Atualizar
        </button>
      </div>

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`row ${m.role}`}>
            {m.role === "system" ? (
              <div
                className={`bubble ${m.text.startsWith("⚠️") ? "err" : m.text.startsWith("👤") ? "warn" : ""}`}
              >
                {m.text}
              </div>
            ) : (
              <div className="bubble" dangerouslySetInnerHTML={{ __html: whatsToHtml(m.text) }} />
            )}
          </div>
        ))}
        {busy && <div className="typing">carregando histórico…</div>}
        {loading && <div className="typing">Ana está digitando…</div>}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Responda como o lead…  (Enter envia, Shift+Enter quebra linha)"
          rows={1}
          disabled={busy}
        />
        <button className="send" onClick={() => void send()} disabled={loading || busy || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
