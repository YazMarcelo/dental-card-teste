"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Confirmavel, Simulation, TemplateDef } from "@/lib/types";
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
const NEXTPHONE_KEY = "dcsim:nextphone:v1";
const PHONE_BASE = "5562999999990";

/** Próximo número simulado, crescente e sem repetir (persistido no navegador). */
function nextPhone(): string {
  let cur = PHONE_BASE;
  try {
    cur = localStorage.getItem(NEXTPHONE_KEY) ?? PHONE_BASE;
    localStorage.setItem(NEXTPHONE_KEY, (BigInt(cur) + 1n).toString());
  } catch {
    /* ignore */
  }
  return cur;
}

// Cada novo lead do start ganha um nome aleatório (e um número novo).
const FIRST_NAMES = [
  "Marcelo", "Luzinete", "Joana", "Carla", "Rafael", "Beatriz", "Thiago",
  "Patrícia", "Gustavo", "Fernanda", "Lucas", "Amanda", "Bruno", "Juliana",
  "Diego", "Larissa", "Rodrigo", "Camila", "Felipe", "Mariana", "André", "Sabrina",
];
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Santos", "Pereira", "Costa", "Almeida",
  "Ribeiro", "Gomes", "Martins", "Araújo", "Barbosa", "Rocha", "Carvalho", "Lima",
];
const PREVIEW_NAME = "Marcelo Silva";

function randomName(): string {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f} ${l}`;
}

export default function Simulator({ templates, clinicName, backendUrl }: Props) {
  const [active, setActive] = useState<Active | null>(null);
  const [adhoc, setAdhoc] = useState<Record<string, Simulation[]>>({});
  const [health, setHealth] = useState<"loading" | "ok" | "bad">("loading");
  const [confirmaveis, setConfirmaveis] = useState<Confirmavel[]>([]);
  const [confState, setConfState] = useState<"loading" | "ok" | "error">("loading");
  const [confError, setConfError] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADHOC_KEY);
      if (raw) setAdhoc(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

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

  const loadConfirmaveis = useCallback(async () => {
    setConfState("loading");
    try {
      const res = await fetch("/api/confirmaveis");
      const j = (await res.json()) as { ok: boolean; confirmaveis?: Confirmavel[]; error?: string };
      if (!j.ok) {
        setConfState("error");
        setConfError(j.error ?? "erro");
        return;
      }
      setConfirmaveis(j.confirmaveis ?? []);
      setConfState("ok");
    } catch (e) {
      setConfState("error");
      setConfError(e instanceof Error ? e.message : "erro de rede");
    }
  }, []);

  useEffect(() => {
    void loadConfirmaveis();
  }, [loadConfirmaveis]);

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
    const sim: Simulation = {
      id: `adhoc-${t.id}-${Date.now()}`,
      phone: nextPhone(),
      nome: randomName(),
      vars: { ...(t.defaults ?? {}) },
    };
    saveAdhoc({ ...adhoc, [t.id]: [...list, sim] });
    setActive({ templateId: t.id, simId: sim.id });
  };

  const removeAdhoc = (templateId: string, simId: string) => {
    const list = (adhoc[templateId] ?? []).filter((s) => s.id !== simId);
    saveAdhoc({ ...adhoc, [templateId]: list });
    setActive((a) => (a && a.simId === simId ? null : a));
  };

  // Cards efetivos de um template: do banco (confirmáveis) ou do config.
  const dbSims = useCallback(
    (t: TemplateDef): Simulation[] =>
      confirmaveis.map((c) => ({
        id: `db-${c.phone}`,
        phone: c.phone,
        nome: c.nome && c.nome.trim() ? c.nome : c.phone,
        consulta_id_externo: c.consulta_id_externo,
        vars: { ...(t.defaults ?? {}) },
      })),
    [confirmaveis]
  );

  const simsOf = useCallback(
    (t: TemplateDef): Simulation[] => {
      if (t.dynamicSource === "confirmaveis") return dbSims(t);
      return [...t.simulations, ...(adhoc[t.id] ?? [])];
    },
    [dbSims, adhoc]
  );

  const closeChat = useCallback(() => {
    setActive(null);
    void loadConfirmaveis(); // um start pode ter gerado um novo agendamento
  }, [loadConfirmaveis]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === active?.templateId) ?? null,
    [templates, active]
  );
  const activeSim = useMemo(() => {
    if (!activeTemplate || !active) return null;
    return simsOf(activeTemplate).find((s) => s.id === active.simId) ?? null;
  }, [activeTemplate, active, simsOf]);

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
            const isDynamic = t.dynamicSource === "confirmaveis";
            const configured = isDynamic ? [] : t.simulations;
            const extra = isDynamic ? [] : adhoc[t.id] ?? [];
            const dyn = isDynamic ? dbSims(t) : [];
            const previewSim: Simulation =
              t.simulations[0] ?? { id: "", phone: "", nome: PREVIEW_NAME, vars: t.defaults };
            const preview = renderTemplate(t.message, buildTemplateVars(previewSim, clinicName));

            return (
              <div className="tpl" key={t.id}>
                <div className="tpl-head">
                  <span className="tpl-id">{t.id}</span>
                  {t.tipo_disparo ? (
                    <span className="badge accent">{t.tipo_disparo}</span>
                  ) : (
                    <span className="badge">padrão</span>
                  )}
                  {t.requiresAppointment && <span className="badge warn">requer agendamento</span>}
                </div>
                <div className="tpl-label">{t.label}</div>
                <div className="tpl-msg" dangerouslySetInnerHTML={{ __html: whatsToHtml(preview) }} />
                {t.note && <div className="tpl-note">{t.note}</div>}

                <div className="divider">Lista de simulações</div>

                {isDynamic ? (
                  <>
                    {confState === "loading" && <div className="tpl-label">carregando leads do banco…</div>}
                    {confState === "error" && (
                      <div className="tpl-note">⚠️ Erro ao ler o banco: {confError}</div>
                    )}
                    {confState === "ok" && dyn.length === 0 && (
                      <div className="tpl-note">
                        Nenhum paciente com agendamento pra confirmar. Inicie um paciente pelo{" "}
                        <strong>start</strong>, agende a limpeza e depois volte aqui.
                      </div>
                    )}
                    {dyn.length > 0 && (
                      <div className="cards">
                        {dyn.map((s) => (
                          <button
                            key={s.id}
                            className={`card ${active?.simId === s.id ? "active" : ""}`}
                            onClick={() => setActive({ templateId: t.id, simId: s.id })}
                          >
                            <span className="cname">{s.nome}</span>
                            <span className="cphone">{s.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="cards">
                    {[...configured, ...extra].map((s) => {
                      const isAdhoc = s.id.startsWith("adhoc-");
                      return (
                        <button
                          key={s.id}
                          className={`card ${active?.simId === s.id ? "active" : ""}`}
                          onClick={() => setActive({ templateId: t.id, simId: s.id })}
                        >
                          <span className="cname">
                            {s.nome}
                            {isAdhoc && (
                              <span
                                role="button"
                                title="Remover número de teste"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAdhoc(t.id, s.id);
                                }}
                                style={{ color: "var(--muted)", marginLeft: 6 }}
                              >
                                ×
                              </span>
                            )}
                          </span>
                          <span className="cphone">{s.phone}</span>
                        </button>
                      );
                    })}
                    <button className="card add" onClick={() => addAdhoc(t)} title="Cria um lead novo (Michael) com número crescente">
                      + novo número
                    </button>
                  </div>
                )}
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
              onClose={closeChat}
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
