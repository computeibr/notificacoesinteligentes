const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_HISTORY = 20; // últimas 20 mensagens (10 trocas) por contato

const SYSTEM_PROMPT = `Você é um assistente de atendimento via WhatsApp. Seu objetivo é conversar com o cliente de forma simpática e objetiva, entender o que ele precisa, e qualificar o interesse dele (o que procura, urgência, orçamento se fizer sentido). Quando o interesse estiver claro, avise que alguém da equipe vai continuar o atendimento. Respostas curtas, tom natural de WhatsApp, em português do Brasil.`;

const conversations = new Map(); // telefone -> [{ role, content }]

export async function getReply(from, userText) {
  const history = conversations.get(from) ?? [];
  history.push({ role: "user", content: userText });

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
      messages: history,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  const reply = data.content?.find((block) => block.type === "text")?.text ?? "";
  history.push({ role: "assistant", content: reply });
  conversations.set(from, history.slice(-MAX_HISTORY));

  return reply;
}
