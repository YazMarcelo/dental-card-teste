import type { TemplateDef } from "@/lib/types";

/**
 * Nome de exibição da clínica — usado só pra renderizar o {{clinica}} dos
 * templates na tela. Vem da env pública NEXT_PUBLIC_CLINIC_NAME.
 */
export const CLINIC_NAME =
  process.env.NEXT_PUBLIC_CLINIC_NAME || "Sua Clínica";

/**
 * ⚙️  EDITE AQUI os templates e os números simulados.
 *
 * Cada `TemplateDef` vira um bloco na tela; cada `Simulation` vira um card.
 * O texto usa placeholders {{nome}}, {{clinica}}, {{indicante}}, {{hora}},
 * {{dia_semana}}, {{data_curta}}, {{relativo}}, resolvidos a partir de
 * `nome`, `vars` do card e de `CLINIC_NAME`.
 *
 * Números `phone`: formato Ecuro, só dígitos (ex.: 5562993673878).
 * Templates com `requiresAppointment: true` (confirmação, lembrete, não
 * comparecimento) precisam de um `consulta_id_externo` REAL (appointmentId
 * do Ecuro) no card — senão a Ana não terá uma consulta pra agir.
 */
export const TEMPLATES: TemplateDef[] = [
  {
    id: "start_001",
    label: "Indicação (limpeza gratuita)",
    tipo_disparo: "indicacao",
    note: "Lead indicado por um paciente. A Ana agenda a limpeza e só agenda depois de obter o nome completo.",
    message:
      "Oi, {{nome}}! Tudo bem?\n" +
      "Aqui é a *Ana*, da {{clinica}}! 🪷\n\n" +
      "A {{indicante}} que é nossa paciente, te indicou com muito carinho 💙 e por isso você ganhou uma *limpeza dental completa e gratuita* como presente!\n\n" +
      "🚨 Mas corre, esse benefício é válido só pelos próximos *2 dias*!\n\n" +
      "Temos horários amanhã ou quinta-feira. Qual fica melhor pra você? 😄",
    simulations: [
      {
        id: "start-luzinete",
        phone: "5562990010001",
        nome: "Luzinete",
        vars: { indicante: "Maria José" },
      },
      {
        id: "start-marcelo",
        phone: "5562990010002",
        nome: "Marcelo",
        vars: { indicante: "Carla Andrade" },
      },
    ],
  },
  {
    id: "confirmacao_001",
    label: "Confirmação de consulta",
    tipo_disparo: null,
    requiresAppointment: true,
    note: "Depende de um número COM agendamento (consulta_id_externo real no card).",
    message:
      "Oi {{nome}}! Aqui é a *Ana*, da {{clinica}} 🙂\n\n" +
      "Passando pra confirmar sua *consulta* {{relativo}}, *{{dia_semana}} ({{data_curta}})* às *{{hora}}*. Pode confirmar?",
    simulations: [
      {
        id: "confirma-joana",
        phone: "5562990020001",
        nome: "Joana Ribeiro",
        vars: { relativo: "amanhã", dia_semana: "quarta", data_curta: "20/05", hora: "15:00" },
        consulta_id_externo: "COLOQUE-UM-APPOINTMENTID-REAL",
        consulta_data: "20/05",
        consulta_hora: "15:00",
      },
    ],
  },
  {
    id: "lembrete_001",
    label: "Lembrete (mesmo dia)",
    tipo_disparo: null,
    requiresAppointment: true,
    note: "Aviso de que a consulta é hoje. Precisa de um número com agendamento.",
    message:
      "Oi {{nome}}! Aqui é a *Ana*, da {{clinica}} 🙂\n\n" +
      "Passando só pra lembrar que sua *consulta* é *hoje*, às *{{hora}}*. Te esperamos por aqui!",
    simulations: [
      {
        id: "lembrete-marcel",
        phone: "5562990030001",
        nome: "Marcel Souza",
        vars: { hora: "17:30" },
        consulta_id_externo: "COLOQUE-UM-APPOINTMENTID-REAL",
        consulta_hora: "17:30",
      },
    ],
  },
];
