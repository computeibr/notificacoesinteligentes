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

// Botão que abre um link externo — só funciona DENTRO da janela de 24h
export function sendCtaUrl(to, bodyText, buttonText, url) {
  return post({
    to,
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: bodyText },
      action: {
        name: "cta_url",
        parameters: { display_text: buttonText, url },
      },
    },
  });
}

// Baixa uma mídia recebida (ex.: imagem) e devolve em base64
export async function downloadMediaBase64(mediaId) {
  const infoRes = await fetch(`https://graph.facebook.com/${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const info = await infoRes.json();
  if (!infoRes.ok) throw new Error(JSON.stringify(info));

  const fileRes = await fetch(info.url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!fileRes.ok) throw new Error(`Falha ao baixar mídia: ${fileRes.status}`);
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  return buffer.toString("base64");
}
