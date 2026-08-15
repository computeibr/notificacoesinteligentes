const messages = []; // { from, direction: "in" | "out", text, timestamp }
const MAX_MESSAGES = 500;

export function logMessage(from, direction, text) {
  messages.push({ from, direction, text, timestamp: Date.now() });
  if (messages.length > MAX_MESSAGES) messages.shift();
}

export function getMessages() {
  return messages;
}
