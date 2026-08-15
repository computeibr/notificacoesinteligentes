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
