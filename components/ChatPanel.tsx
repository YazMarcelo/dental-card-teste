"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiResult,
  ChatMessage,
  DisparoOut,
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
  const [starting, setStarting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const storageKey = `dcsim:conv:v1:${template.id}:${sim.id}`;

  const persist = useCallback(
    (msgs: ChatMessage[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(msgs));
      } catch {
        /* ignore quota */
      }
    },
    [storageKey]
  );

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

  const start = useCallback(async () => {
    setStarting(true);
    const rendered = renderTemplate(template.message, buildTemplateVars(sim, clinicName));
    const msgs: ChatMessage[] = [ana(rendered)];
    try {
      const res = await fetch("/api/disparo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: sim.phone,
          nome: sim.nome,
          mensagem: rendered,
          dispatch_id: `${template.id}:${sim.phone}`,
          tipo_disparo: template.tipo_disparo ?? null,
          ...consultaFields(),
        }),
      });
      const r: ApiResult<DisparoOut> = await res.json();
      if (!r.ok) {
        msgs.push(sys(`⚠️ Falha ao registrar o disparo no backend: ${r.error ?? "erro"}`));
      }
    } catch (e) {
      msgs.push(sys(`⚠️ Erro de rede ao registrar o disparo: ${e instanceof Error ? e.message : ""}`));
    }
    setMessages(msgs);
    persist(msgs);
    setStarting(false);
  }, [template, sim, clinicName, consultaFields, persist]);

  // Carrega a conversa salva ou inicia (dispara o template) quando o card muda.
  useEffect(() => {
    let saved: ChatMessage[] | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw) as ChatMessage[];
    } catch {
      saved = null;
    }
    if (saved && saved.length) {
      setMessages(saved);
    } else {
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || starting) return;
    const withLead = [...messages, lead(text)];
    setMessages(withLead);
    persist(withLead);
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
      let next: ChatMessage[];
      if (!r.ok) {
        next = [...withLead, sys(`⚠️ Erro do backend: ${r.error ?? "erro"}`)];
      } else if (r.data?.transferir_humano) {
        next = [
          ...withLead,
          sys(`👤 Conversa transferida para atendente humano${r.data.motivo ? ` — ${r.data.motivo}` : ""}`),
        ];
      } else {
        next = [...withLead, ana(r.data?.resposta || "(sem resposta)")];
      }
      setMessages(next);
      persist(next);
    } catch (e) {
      const next = [...withLead, sys(`⚠️ Erro de rede: ${e instanceof Error ? e.message : ""}`)];
      setMessages(next);
      persist(next);
    } finally {
      setLoading(false);
    }
  }, [input, loading, starting, messages, sim, consultaFields, persist]);

  const reiniciar = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setMessages([]);
    void start();
  }, [storageKey, start]);

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
        <button className="btn" onClick={reiniciar} title="Reinicia a simulação e reenvia o template">
          Reiniciar
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
        {starting && <div className="typing">registrando disparo…</div>}
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
          disabled={starting}
        />
        <button className="send" onClick={() => void send()} disabled={loading || starting || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
