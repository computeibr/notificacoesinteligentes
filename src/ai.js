const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_HISTORY = 20; // últimas 20 mensagens (10 trocas) por contato
const SITE_URL = "https://computei.com.br";

const SYSTEM_PROMPT = `Você é um assistente de atendimento via WhatsApp. Seu objetivo é conversar com o cliente de forma simpática e objetiva, entender o que ele precisa, e qualificar o interesse dele (o que procura, urgência, orçamento se fizer sentido). O cliente pode enviar imagens — olhe o conteúdo e comente/ajude com base no que aparece nela. Quando fizer sentido o cliente conhecer mais detalhes, use a ferramenta send_link_button para mandar um botão que leva ao site. Quando o interesse estiver claro, avise que alguém da equipe vai continuar o atendimento. Respostas curtas, tom natural de WhatsApp, em português do Brasil.`;

const TOOLS = [
  {
    name: "send_link_button",
    description: "Envia uma mensagem com um botão que leva o cliente para o site da empresa.",
    input_schema: {
      type: "object",
      properties: {
        body_text: { type: "string", description: "Texto curto que acompanha o botão" },
        button_text: { type: "string", description: "Texto do botão, ex: Acessar site" },
      },
      required: ["body_text", "button_text"],
    },
  },
];

const conversations = new Map(); // telefone -> [{ role, content }]

async function callClaude(from, userContent) {
  const history = conversations.get(from) ?? [];
  history.push({ role: "user", content: userContent });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: history,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  const toolUse = data.content?.find((block) => block.type === "tool_use");
  const text = data.content?.find((block) => block.type === "text")?.text ?? "";

  if (toolUse) {
    const { body_text, button_text } = toolUse.input;
    history.push({ role: "assistant", content: body_text });
    conversations.set(from, history.slice(-MAX_HISTORY));
    return { type: "button", bodyText: body_text, buttonText: button_text, url: SITE_URL };
  }

  history.push({ role: "assistant", content: text });
  conversations.set(from, history.slice(-MAX_HISTORY));
  return { type: "text", text };
}

export function getReply(from, userText) {
  return callClaude(from, userText);
}

export function getReplyForImage(from, base64, mediaType, caption) {
  const content = [
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
    { type: "text", text: caption || "O cliente enviou essa imagem." },
  ];
  return callClaude(from, content);
}
