// Tipos compartilhados do simulador.

export interface Simulation {
  /** id único do card (estável) */
  id: string;
  /** paciente_telefone no formato Ecuro (só dígitos, ex.: 5562993673878) */
  phone: string;
  /** nome do lead/paciente (pode ser só o primeiro nome) */
  nome: string;
  /** variáveis extras pra renderizar o template (ex.: indicante) */
  vars?: Record<string, string>;
  /** appointmentId no Ecuro — só pra templates que dependem de consulta existente */
  consulta_id_externo?: string;
  consulta_data?: string;
  consulta_hora?: string;
  especialidade_id?: string;
  doctor_id?: string;
}

export interface TemplateDef {
  /** id do template, ex.: "start_001", "confirmacao_001" */
  id: string;
  /** rótulo legível */
  label: string;
  /** tipo_disparo enviado ao /disparo (null/omitido = fluxo padrão) */
  tipo_disparo?: string | null;
  /** texto do template com placeholders {{nome}}, {{clinica}}, ... */
  message: string;
  /** true quando o template só faz sentido com uma consulta já marcada */
  requiresAppointment?: boolean;
  /** observação curta exibida na tela */
  note?: string;
  /** variáveis padrão aplicadas a números novos (+ novo número) e à prévia:
   *  ex.: { indicante, dia1, dia2 }. `nome` não entra aqui — vem do card. */
  defaults?: Record<string, string>;
  /** quando "confirmaveis", os cards vêm do banco (leads com agendamento),
   *  não de `simulations`, e não há botão "+ novo número". */
  dynamicSource?: "confirmaveis";
  /** números simulados desse template (ignorado quando há dynamicSource) */
  simulations: Simulation[];
}

/** Lead com agendamento (vindo do banco) — vira card do template de confirmação. */
export interface Confirmavel {
  phone: string;
  nome: string | null;
  consulta_id_externo: string;
  status: string | null;
}

/** Uma mensagem do histórico (tabela mensagens_log do dental-card). */
export interface HistoryMsg {
  role: ChatRole;
  text: string;
  ts: number;
  origem?: string | null;
}

export type ChatRole = "ana" | "lead" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  ts: number;
}

/** Resposta padronizada das rotas /api/* do próprio simulador. */
export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export interface DisparoOut {
  ok: boolean;
  thread_id: string;
  duplicado: boolean;
}

export interface WebhookOut {
  resposta: string;
  encerrou?: boolean;
  transferir_humano?: boolean;
  motivo?: string | null;
}
