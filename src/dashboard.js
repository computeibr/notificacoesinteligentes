export function renderPage() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Conversas</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  .contato { background: #fff; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.1); overflow: hidden; }
  .contato-header { background: #075e54; color: #fff; padding: 8px 12px; font-size: 14px; font-weight: 600; }
  .msgs { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .msg { max-width: 70%; padding: 8px 12px; border-radius: 8px; font-size: 14px; white-space: pre-wrap; }
  .msg img { max-width: 220px; border-radius: 6px; display: block; margin-bottom: 4px; }
  .in { align-self: flex-start; background: #fff; border: 1px solid #e0e0e0; }
  .out { align-self: flex-end; background: #dcf8c6; }
  .hora { display: block; font-size: 10px; color: #888; margin-top: 4px; text-align: right; }
  #vazio { color: #888; }
</style>
</head>
<body>
<h1>Conversas recebidas</h1>
<div id="lista"><p id="vazio">Carregando...</p></div>
<script>
async function carregar() {
  const res = await fetch("/api/messages");
  const msgs = await res.json();
  const porContato = {};
  for (const m of msgs) {
    (porContato[m.from] ??= []).push(m);
  }
  const lista = document.getElementById("lista");
  const contatos = Object.keys(porContato);
  if (contatos.length === 0) {
    lista.innerHTML = '<p id="vazio">Nenhuma mensagem ainda.</p>';
    return;
  }
  lista.innerHTML = contatos.map(from => {
    const bolhas = porContato[from].map(m => {
      const hora = new Date(m.timestamp).toLocaleString("pt-BR");
      const texto = m.text.replace(/</g, "&lt;");
      const img = m.image ? '<img src="data:' + m.image.mimeType + ';base64,' + m.image.base64 + '">' : "";
      return '<div class="msg ' + m.direction + '">' + img + texto + '<span class="hora">' + hora + '</span></div>';
    }).join("");
    return '<div class="contato"><div class="contato-header">' + from + '</div><div class="msgs">' + bolhas + '</div></div>';
  }).join("");
}
carregar();
setInterval(carregar, 5000);
</script>
</body>
</html>`;
}
