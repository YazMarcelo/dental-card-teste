"use client";

import { useEffect, useMemo, useState } from "react";
import type { Simulation, TemplateDef } from "@/lib/types";
import { buildTemplateVars, renderTemplate, whatsToHtml } from "@/lib/format";
import ChatPanel from "@/components/ChatPanel";

interface Props {
  templates: TemplateDef[];
  clinicName: string;
  backendUrl: string;
}

interface Active {
  templateId: string;
  simId: string;
}

const ADHOC_KEY = "dcsim:adhoc:v1";

function randomPhone(): string {
  let d = "";
  for (let i = 0; i < 8; i++) d += Math.floor(Math.random() * 10);
  return `55629${d}`;
}

export default function Simulator({ templates, clinicName, backendUrl }: Props) {
  const [active, setActive] = useState<Active | null>(null);
  const [adhoc, setAdhoc] = useState<Record<string, Simulation[]>>({});
  const [health, setHealth] = useState<"loading" | "ok" | "bad">("loading");

  // Carrega números de teste ad-hoc salvos localmente.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADHOC_KEY);
      if (raw) setAdhoc(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Health check do backend.
  useEffect(() => {
    let alive = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => alive && setHealth(j?.ok ? "ok" : "bad"))
      .catch(() => alive && setHealth("bad"));
    return () => {
      alive = false;
    };
  }, []);

  const saveAdhoc = (next: Record<string, Simulation[]>) => {
    setAdhoc(next);
    try {
      localStorage.setItem(ADHOC_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const addAdhoc = (t: TemplateDef) => {
    const list = adhoc[t.id] ?? [];
    const n = list.length + 1;
    const sim: Simulation = {
      id: `adhoc-${t.id}-${Date.now()}`,
      phone: randomPhone(),
      nome: `Lead Teste ${n}`,
      vars: { ...(t.simulations[0]?.vars ?? {}) },
    };
    saveAdhoc({ ...adhoc, [t.id]: [...list, sim] });
    setActive({ templateId: t.id, simId: sim.id });
  };

  const removeAdhoc = (templateId: string, simId: string) => {
    const list = (adhoc[templateId] ?? []).filter((s) => s.id !== simId);
    saveAdhoc({ ...adhoc, [templateId]: list });
    setActive((a) => (a && a.simId === simId ? null : a));
  };

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === active?.templateId) ?? null,
    [templates, active]
  );
  const activeSim = useMemo(() => {
    if (!activeTemplate || !active) return null;
    const all = [...activeTemplate.simulations, ...(adhoc[activeTemplate.id] ?? [])];
    return all.find((s) => s.id === active.simId) ?? null;
  }, [activeTemplate, active, adhoc]);

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>Simulador — Dental Card</h1>
          <div className="sub">Dispare templates e converse como o lead. Atendente: Ana.</div>
        </div>
        <div className="spacer" />
        <div className="health" title={backendUrl}>
          <span className={`dot ${health === "ok" ? "ok" : health === "bad" ? "bad" : ""}`} />
          {health === "loading" ? "checando backend…" : health === "ok" ? "backend online" : "backend offline"}
        </div>
      </div>

      <div className="body">
        <div className="list">
          {templates.map((t) => {
            const first = t.simulations[0];
            const preview = first
              ? renderTemplate(t.message, buildTemplateVars(first, clinicName))
              : renderTemplate(t.message, { clinica: clinicName });
            const extra = adhoc[t.id] ?? [];
            return (
              <div className="tpl" key={t.id}>
                <div className="tpl-head">
                  <span className="tpl-id">{t.id}</span>
                  {t.tipo_disparo ? (
                    <span className="badge accent">{t.tipo_disparo}</span>
                  ) : (
                    <span className="badge">confirmação/padrão</span>
                  )}
                  {t.requiresAppointment && <span className="badge warn">requer agendamento</span>}
                </div>
                <div className="tpl-label">{t.label}</div>
                <div
                  className="tpl-msg"
                  dangerouslySetInnerHTML={{ __html: whatsToHtml(preview) }}
                />
                {t.note && <div className="tpl-note">{t.note}</div>}

                <div className="divider">Lista de simulações</div>
                <div className="cards">
                  {t.simulations.map((s) => (
                    <button
                      key={s.id}
                      className={`card ${active?.simId === s.id ? "active" : ""}`}
                      onClick={() => setActive({ templateId: t.id, simId: s.id })}
                    >
                      <span className="cname">{s.nome}</span>
                      <span className="cphone">{s.phone}</span>
                    </button>
                  ))}
                  {extra.map((s) => (
                    <button
                      key={s.id}
                      className={`card ${active?.simId === s.id ? "active" : ""}`}
                      onClick={() => setActive({ templateId: t.id, simId: s.id })}
                    >
                      <span className="cname">
                        {s.nome}{" "}
                        <span
                          role="button"
                          title="Remover número de teste"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAdhoc(t.id, s.id);
                          }}
                          style={{ color: "var(--muted)", marginLeft: 4 }}
                        >
                          ×
                        </span>
                      </span>
                      <span className="cphone">{s.phone}</span>
                    </button>
                  ))}
                  <button className="card add" onClick={() => addAdhoc(t)} title="Cria um número novo (thread limpa)">
                    + novo número
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`chat ${activeSim ? "" : "hidden"}`}>
          {activeTemplate && activeSim ? (
            <ChatPanel
              key={`${activeTemplate.id}:${activeSim.id}`}
              template={activeTemplate}
              sim={activeSim}
              clinicName={clinicName}
              onClose={() => setActive(null)}
            />
          ) : (
            <div className="chat-empty">
              <div className="big">💬</div>
              <div>Selecione um número simulado para abrir o chat.</div>
              <div className="sub">Você responde como o lead; a Ana responde pelo backend.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
