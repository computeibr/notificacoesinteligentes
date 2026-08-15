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

  const from = msg.from; // número do usuário
  const texto = msg.text?.body ?? "";

  try {
    // MVP: eco simples pra provar o loop
    await sendText(from, `Recebi: "${texto}"`);
  } catch (err) {
    app.log.error(err);
  }
});

app.listen({ port: Number(process.env.PORT) || 3333, host: "0.0.0.0" });
