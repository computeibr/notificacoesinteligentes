# MVP — WhatsApp Cloud API oficial (echo bot local)

> **Objetivo:** provar o loop mínimo da API oficial da Meta — **receber** uma mensagem no webhook e **responder** automaticamente — usando o **número de teste** que a Meta fornece de graça (envia para até 5 contatos que você cadastra), **sem verificação de negócio**. É o "hello world" pra entender o fluxo antes de partir pra produção.
>
> **Stack:** Node.js (ESM) + Fastify + dotenv + `fetch` nativo. Sem banco e sem fila nesta fase (ficam pra Fase 2). **Para o Claude Code:** você constrói só a parte de código (seção 5 em diante). A configuração no painel da Meta (seções 1–4) é manual, feita pelo Léo.

---

## PARTE MANUAL (Léo faz no painel da Meta — o Claude Code não faz isso)

### 1. Criar o app e ativar o WhatsApp
1. Acesse `developers.facebook.com` → **My Apps** → **Create App** → tipo **Business**.
2. No dashboard do app: **Add Product** → **WhatsApp** → **Set Up**.
3. Na página **WhatsApp → API Setup**, anote:
   - **Phone Number ID** (é um ID, não o telefone)
   - **WhatsApp Business Account ID (WABA ID)**
   - **Temporary Access Token** (expira em 24h — serve só pra testar; a Fase 2 troca por token permanente)
4. Ainda nessa página, em **To**, adicione seu número pessoal como **destinatário de teste** (pode adicionar até 5). Clique em enviar o template `hello_world` e confirme que chegou no seu WhatsApp. **Responda a mensagem** pra abrir a janela de 24h.
5. A Meta pode exigir um método de pagamento e uma URL de política de privacidade em **App Settings → Basic** — pode ser uma página simples do seu site por enquanto.

### 2. Subir um túnel HTTPS para o localhost
O webhook precisa de uma URL **pública e HTTPS**. Em desenvolvimento local, use **ngrok** (ou cloudflared):
```
ngrok http 3333
```
Guarde a URL gerada, ex.: `https://xxxx.ngrok-free.app`. O webhook ficará em `https://xxxx.ngrok-free.app/webhook`.

### 3. Configurar o webhook no painel
1. Suba o servidor local (seção 6) **antes** deste passo, com o ngrok ativo.
2. No painel: **WhatsApp → Configuration → Webhook** → **Edit**.
   - **Callback URL:** `https://xxxx.ngrok-free.app/webhook`
   - **Verify Token:** uma string qualquer que você inventa (a mesma do `.env`, ex.: `meu_token_verificacao`).
3. Clique em **Verify and Save** — a Meta faz um GET no seu endpoint; o servidor tem que devolver o `challenge` (o código já faz isso).
4. Em **Webhook fields**, assine (subscribe) o campo **messages**.

### 4. Pré-requisitos locais
- Node.js 20+ (para ter `fetch` nativo).
- ngrok instalado e logado.

---

## PARTE CÓDIGO (o que o Claude Code constrói)

### 5. Estrutura do projeto
```
mvp-whatsapp/
├── .env
├── .env.example
├── package.json          // "type": "module"
└── src/
    ├── server.js          // Fastify + rotas do webhook
    └── whatsapp.js        // funções de envio (sendText, sendTemplate)
```

### 6. `.env` (variáveis)
```
PORT=3333
GRAPH_VERSION=v23.0                 # use a versão atual que aparecer no painel
WHATSAPP_TOKEN=EAAB...              # token temporário da API Setup (Fase 1)
WHATSAPP_PHONE_ID=123456789012345   # Phone Number ID
WHATSAPP_VERIFY_TOKEN=meu_token_verificacao
```
Gerar também um `.env.example` com as chaves sem valores. Nunca commitar o `.env`.

### 7. `src/whatsapp.js` — envio
```js
const GRAPH = process.env.GRAPH_VERSION;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;
const BASE = `https://graph.facebook.com/${GRAPH}/${PHONE_ID}/messages`;

async function post(payload) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

// Texto livre — só funciona DENTRO da janela de 24h (usuário mandou msg antes)
export function sendText(to, body) {
  return post({ to, type: "text", text: { body } });
}

// Template aprovado — usado para INICIAR conversa (ex.: "hello_world" já existe)
export function sendTemplate(to, name = "hello_world", lang = "en_US") {
  return post({ to, type: "template", template: { name, language: { code: lang } } });
}
```

### 8. `src/server.js` — webhook (Fastify)
```js
import "dotenv/config";
import Fastify from "fastify";
import { sendText } from "./whatsapp.js";

const app = Fastify({ logger: true });

// Verificação do webhook (Meta chama uma vez com GET)
app.get("/webhook", async (req, reply) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return reply.code(200).send(challenge);
  }
  return reply.code(403).send();
});

// Recebimento das mensagens (POST)
app.post("/webhook", async (req, reply) => {
  reply.code(200).send(); // responder rápido SEMPRE, antes de processar

  const value = req.body?.entry?.[0]?.changes?.[0]?.value;
  const msg = value?.messages?.[0];
  if (!msg) return; // pode ser um status (entregue/lido), ignorar

  const from = msg.from;                 // número do usuário
  const texto = msg.text?.body ?? "";

  try {
    // MVP: eco simples pra provar o loop
    await sendText(from, `Recebi: "${texto}"`);
  } catch (err) {
    app.log.error(err);
  }
});

app.listen({ port: Number(process.env.PORT) || 3333, host: "0.0.0.0" });
```

### 9. `package.json`
```json
{
  "name": "mvp-whatsapp",
  "type": "module",
  "scripts": { "dev": "node --watch src/server.js" },
  "dependencies": { "dotenv": "^16.4.5", "fastify": "^4.28.0" }
}
```

---

## Passo a passo de execução (incremental)

1. Claude Code: scaffold do projeto (seções 5–9), sem banco nem fila.
2. Léo: `npm install`, preencher `.env`, `npm run dev`.
3. Léo: `ngrok http 3333` e configurar o webhook no painel (seção 3).
4. Léo: mandar uma mensagem do seu WhatsApp pessoal para o número de teste → deve receber o eco "Recebi: ...".
5. Confirmado o loop, testar `sendTemplate` para iniciar conversa fora da janela.

## Lembretes de limite/custo (Fase 1)
- Número de teste envia só para os **até 5 contatos** cadastrados como destinatários.
- **Token temporário expira em 24h.** Se parar de funcionar do nada, é isso.
- Texto livre só sai **dentro da janela de 24h**; fora dela, só **template aprovado**.

## Fase 2 (depois que o loop funcionar — não fazer agora)
- Trocar o token temporário por **token permanente** (System User no Business Settings).
- Registrar um **número próprio** no lugar do número de teste (exige o número não estar registrado no app WhatsApp comum).
- Persistir mensagens no **Postgres via Prisma** (log de entrada/saída).
- Processar envios de forma assíncrona com **BullMQ/Redis**.
- Empacotar em **Docker** para deploy no EasyPanel.
- Criar **templates próprios** e tratar categorias (marketing/utility/auth).
