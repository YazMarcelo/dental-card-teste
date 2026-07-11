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
  /** números simulados desse template */
  simulations: Simulation[];
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
