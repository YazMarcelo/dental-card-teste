import type { TemplateDef } from "@/lib/types";

/**
 * Nome de exibição da clínica — usado só pra renderizar o {{clinica}} dos
 * templates na tela. Vem da env pública NEXT_PUBLIC_CLINIC_NAME.
 */
export const CLINIC_NAME =
  process.env.NEXT_PUBLIC_CLINIC_NAME || "Vamos Sorrir - Porto Velho";

/**
 * ⚙️  EDITE AQUI os templates e os números simulados.
 *
 * Cada `TemplateDef` vira um bloco na tela; cada `Simulation` vira um card.
 * O texto usa placeholders {{nome}}, {{clinica}}, {{indicante}}, {{dia1}},
 * {{dia2}}, {{dia_semana}}, {{data}}, {{hora}}, resolvidos a partir de
 * `nome`, `vars` do card, `defaults` do template e de `CLINIC_NAME`.
 *
 * Números `phone`: formato Ecuro, só dígitos.
 * Números novos (botão "+ novo número") são gerados de forma CRESCENTE a
 * partir de 5562999999990, cada um com um NOME ALEATÓRIO — o lead é criado no
 * primeiro disparo, sem repetir número nem nome.
 */
export const TEMPLATES: TemplateDef[] = [
  {
    id: "start_001",
    label: "Indicação (limpeza gratuita)",
    tipo_disparo: "indicacao",
    note: "Clique em + novo número pra criar um lead novo (nome e número gerados) e disparar. A Ana agenda a limpeza e só agenda depois de obter o nome completo.",
    defaults: { indicante: "Maria José", dia1: "amanhã", dia2: "quinta-feira" },
    message:
      "Oi, {{nome}}! Tudo bem?\n" +
      "Aqui é a Ana, da {{clinica}}! 🪷\n\n" +
      "A {{indicante}} que é nossa paciente, te indicou com muito carinho 💙 e por isso você ganhou uma limpeza dental completa e gratuita como presente!\n\n" +
      "🚨 Mas corre, esse benefício é válido só pelos próximos 2 dias!\n\n" +
      "Temos horários {{dia1}} ou {{dia2}}. Qual fica melhor pra você? 😄",
    simulations: [],
  },
  {
    id: "confirmacao_001",
    label: "Confirmação de compromisso",
    // "confirmacao" tira o lead do fluxo de indicação e roteia pro prompt padrão
    // (que sabe confirmar). Sem isso, o lead ficaria preso no prompt de indicação.
    tipo_disparo: "confirmacao",
    requiresAppointment: true,
    dynamicSource: "confirmaveis",
    note: "Os cards vêm do banco: leads que já agendaram pelo start. Sem nenhum, inicie um paciente pelo start e agende a limpeza primeiro.",
    // data/hora aqui são ilustrativos (o banco não guarda o horário do agendamento);
    // o que importa é o consulta_id_externo real, que vem do card do banco.
    defaults: { dia_semana: "amanhã", data: "amanhã", hora: "15:00" },
    message:
      "Olá, {{nome}}! Tudo bem? 😊\n" +
      "Aqui é a Ana, da {{clinica}}. 🦷\n" +
      "Passando para confirmar o seu compromisso de *{{dia_semana}}*:\n" +
      "📅 {{data}}\n" +
      "⏰ {{hora}}\n\n" +
      "Está tudo certo para você comparecer?",
    simulations: [],
  },
];
