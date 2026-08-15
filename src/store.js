const messages = []; // { from, direction: "in" | "out", text, image?, timestamp }
const MAX_MESSAGES = 500;

export function logMessage(from, direction, text, image) {
  messages.push({ from, direction, text, image, timestamp: Date.now() });
  if (messages.length > MAX_MESSAGES) messages.shift();
}

export function getMessages() {
  return messages;
}
