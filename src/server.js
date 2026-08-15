import "dotenv/config";
import Fastify from "fastify";
import { sendText, sendCtaUrl, downloadMediaBase64 } from "./whatsapp.js";
import { getReply, getReplyForImage } from "./ai.js";
import { logMessage, getMessages } from "./store.js";
import { renderPage } from "./dashboard.js";

const app = Fastify({ logger: true });

function autenticado(req) {
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Basic ")) return false;
  const [, senha] = Buffer.from(auth.slice(6), "base64").toString().split(":");
  return senha === process.env.DASHBOARD_PASSWORD;
}

function exigirSenha(req, reply) {
  if (autenticado(req)) return true;
  reply.header("WWW-Authenticate", 'Basic realm="Conversas"');
  reply.code(401).send("Autenticação necessária");
  return false;
}

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

  const from = msg.from; // número do usuário

  try {
    let resposta;
    if (msg.type === "image") {
      const caption = msg.image.caption ?? "";
      const base64 = await downloadMediaBase64(msg.image.id);
      logMessage(from, "in", caption, { base64, mimeType: msg.image.mime_type });
      resposta = await getReplyForImage(from, base64, msg.image.mime_type, caption);
    } else {
      const texto = msg.text?.body ?? "";
      logMessage(from, "in", texto);
      resposta = await getReply(from, texto);
    }

    if (resposta.type === "button") {
      await sendCtaUrl(from, resposta.bodyText, resposta.buttonText, resposta.url);
      logMessage(from, "out", `${resposta.bodyText} [botão: ${resposta.buttonText}]`);
    } else {
      await sendText(from, resposta.text);
      logMessage(from, "out", resposta.text);
    }
  } catch (err) {
    app.log.error(err);
  }
});

// Página de acompanhamento das conversas (protegida por senha)
app.get("/conversas", async (req, reply) => {
  if (!exigirSenha(req, reply)) return;
  reply.type("text/html").send(renderPage());
});

app.get("/api/messages", async (req, reply) => {
  if (!exigirSenha(req, reply)) return;
  reply.send(getMessages());
});

app.listen({ port: Number(process.env.PORT) || 3333, host: "0.0.0.0" });
