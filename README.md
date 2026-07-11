# Simulador — Dental Card

App Next.js para **simular disparos e conversas** da atendente **Ana** (projeto
`lang-atendente` / dental-card). Mostra os templates; abaixo de cada um, os números
simulados. Clicar num número abre um chat onde **você responde como o lead** e a Ana
responde de verdade, consumindo o backend do dental-card.

## Como funciona

- **Start (indicação)**: não tem números fixos. Clique em **+ novo número** pra criar
  um lead novo — **nome aleatório** e número **crescente** a partir de `5562999999990`
  (sem repetir). Ao abrir, o simulador chama `POST /disparo` (registra o template como
  mensagem da Ana) e você conversa.
- **Confirmação**: os números **vêm do banco** — são os leads que já **agendaram**
  pelo start (têm `consulta_id_externo`). Sem nenhum, aparece uma mensagem pedindo pra
  iniciar um paciente pelo start primeiro. Confirmar usa o `appointmentId` real do lead.
- Cada mensagem que você envia vai pro `POST /webhook` e a resposta da Ana aparece.
- O **histórico** de cada conversa é lido da tabela `mensagens_log` do banco do
  dental-card (fica igual ao estado real do backend).
- As chamadas ao backend passam por **rotas server-side** (`/api/disparo`,
  `/api/webhook`, `/api/history`, `/api/confirmaveis`), que injetam o
  `X-Webhook-Token` e a conexão do banco a partir da env — segredos **nunca** vão ao
  navegador.

## Fluxo de ponta a ponta

1. **Start** → **+ novo número** (lead novo) → conversa, informa o nome completo,
   escolhe dia/horário → a Ana **agenda a limpeza**.
2. O backend grava o `appointmentId` desse agendamento no lead.
3. No bloco **Confirmação**, aquele lead passa a aparecer como card (feche o chat ou
   recarregue a lista). Abra-o pra testar a confirmação.

> ⚠️ Requer a versão do backend que grava o `appointmentId` no lead ao agendar
> (ajuste feito no `lang-atendente`). Se o backend estiver numa versão antiga,
> reimplante-o antes.

## Variáveis de ambiente

Copie `.env.example` para `.env` (dev) ou configure no EasyPanel:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DENTAL_CARD_URL` | sim | URL base do backend dental-card (sem barra no final) |
| `DENTAL_CARD_TOKEN` | sim | valor do header `X-Webhook-Token` (== `WEBHOOK_SECRET` do backend) |
| `CLINICA_SLUG` | sim | slug da clínica cadastrada no backend (ex.: `sorria-garavelo`) |
| `DENTAL_CARD_DATABASE_URL` | sim | Postgres do dental-card (o MESMO do lang-atendente) — histórico e confirmáveis |
| `DENTAL_CARD_DB_SSL` | não | `true` se o banco exigir SSL |
| `NEXT_PUBLIC_CLINIC_NAME` | não | nome de exibição da clínica (renderiza `{{clinica}}` na tela) |

## Rodar localmente

```bash
npm install
cp .env.example .env   # e edite os valores
npm run dev            # http://localhost:3000
```

## Editar os templates

Tudo em [`config/templates.ts`](config/templates.ts). Placeholders suportados:
`{{nome}}`, `{{clinica}}`, `{{indicante}}`, `{{dia1}}`, `{{dia2}}`, `{{dia_semana}}`,
`{{data}}`, `{{hora}}` (resolvidos de `nome`, `vars`/`defaults` do card e do nome da
clínica). Templates com `dynamicSource: "confirmaveis"` puxam os cards do banco.

## Deploy no EasyPanel

1. Serviço do tipo **App** apontando para este repositório (build via `Dockerfile`).
2. Configure as variáveis de ambiente da tabela acima.
3. Porta **3000**. O `Dockerfile` usa o output `standalone` do Next.
