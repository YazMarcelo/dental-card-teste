# Simulador — Dental Card

App Next.js para **simular disparos e conversas** da atendente **Ana** (projeto
`lang-atendente` / dental-card). Mostra os templates; abaixo de cada um, cards com
números simulados. Clicar num card abre um chat onde **você responde como o lead** e
a Ana responde de verdade, consumindo o backend do dental-card.

## Como funciona

- Ao abrir o chat de um número, o simulador chama `POST /disparo` do backend
  (registra o template como mensagem da Ana, sem chamar o LLM).
- Cada mensagem que você envia como lead vai para `POST /webhook`, e a resposta da
  Ana aparece no chat.
- As chamadas ao backend passam por **rotas server-side** (`/api/disparo`,
  `/api/webhook`), que injetam o header `X-Webhook-Token` a partir da env — o token
  **nunca** é exposto ao navegador.
- A conversa de cada número é mantida no backend (checkpointer por
  `clínica:telefone:sessão`) e espelhada em `localStorage` no navegador.

## Variáveis de ambiente

Copie `.env.example` para `.env` (dev) ou configure no EasyPanel:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DENTAL_CARD_URL` | sim | URL base do backend dental-card (sem barra no final) |
| `DENTAL_CARD_TOKEN` | sim | valor do header `X-Webhook-Token` (== `WEBHOOK_SECRET` do backend) |
| `CLINICA_SLUG` | sim | slug da clínica cadastrada no backend (ex.: `sorria-garavelo`) |
| `NEXT_PUBLIC_CLINIC_NAME` | não | nome de exibição da clínica (usado só pra renderizar `{{clinica}}` na tela) |

## Rodar localmente

```bash
npm install
cp .env.example .env   # e edite os valores
npm run dev            # http://localhost:3000
```

## Editar os templates e números

Tudo fica em [`config/templates.ts`](config/templates.ts). Cada template vira um
bloco; cada `Simulation` vira um card. Placeholders suportados no texto:
`{{nome}}`, `{{clinica}}`, `{{indicante}}`, `{{hora}}`, `{{dia_semana}}`,
`{{data_curta}}`, `{{relativo}}` (resolvidos a partir de `nome`, `vars` do card e do
nome da clínica).

Templates de confirmação/lembrete (`requiresAppointment: true`) precisam de um
`consulta_id_externo` **real** (appointmentId do Ecuro) no card para a Ana ter uma
consulta sobre a qual agir.

O botão **+ novo número** cria um número aleatório (thread limpa no backend) — útil
pra testar o mesmo template do zero sem esbarrar em histórico anterior.

## Deploy no EasyPanel

1. Crie um serviço do tipo **App** apontando para este repositório (build via
   `Dockerfile`).
2. Configure as variáveis de ambiente da tabela acima.
3. O container expõe a porta **3000**.

O `Dockerfile` usa o output `standalone` do Next (imagem enxuta).
