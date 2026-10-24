const $ = selector => document.querySelector(selector);
let messages = [];
let busy = false;
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem('jarvis.messages') || '[]');
  if (Array.isArray(saved)) messages = saved.filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').slice(-40);
} catch { storageAvailable = false; }
function render() {
  $('#welcome').hidden = messages.length > 0;
  $('#messages').replaceChildren(...messages.map(message => {
    const article = document.createElement('article');
    article.className = `message ${message.role}`;
    const name = document.createElement('strong');
    name.textContent = message.role === 'user' ? 'TÚ' : 'JARVIS';
    article.append(name, document.createTextNode(message.content));
    return article;
  }));
  try { localStorage.setItem('jarvis.messages', JSON.stringify(messages)); } catch { storageAvailable = false; }
}
async function send(event) {
  event.preventDefault();
  const content = $('#prompt').value.trim();
  if (!content || busy) return;
  busy = true;
  $('#send').disabled = true;
  $('#new-chat').disabled = true;
  messages.push({ role: 'user', content });
  messages = messages.slice(-38);
  $('#prompt').value = '';
  render();
  $('#notice').textContent = 'JARVIS está preparando una respuesta…';
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }), signal: AbortSignal.timeout(55000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo enviar el mensaje.');
    messages.push({ role: 'assistant', content: data.reply });
    $('#notice').textContent = storageAvailable ? '' : 'El navegador no permite guardar el historial.';
  } catch (error) {
    messages.pop();
    $('#prompt').value = content;
    $('#notice').textContent = error.name === 'TimeoutError' ? 'La solicitud tardó demasiado. Vuelve a intentarlo.' : error.message;
  } finally {
    busy = false;
    $('#send').disabled = false;
    $('#new-chat').disabled = false;
    render();
    $('#prompt').focus();
    $('#composer').scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
$('#composer').addEventListener('submit', send);
$('#prompt').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('#composer').requestSubmit(); } });
$('#new-chat').addEventListener('click', () => { if (busy) return; messages = []; render(); $('#notice').textContent = ''; $('#prompt').focus(); });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { $('#prompt').value = button.dataset.prompt; $('#prompt').focus(); }));
render();
fetch('/api/status').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
  $('#status').textContent = data.mode === 'ai' ? '● IA configurada' : '● Red neuronal local';
  if (data.mode === 'local') $('#notice').textContent = 'Red local activa: reconoce intenciones básicas con respuestas predefinidas. No genera texto libre.';
}).catch(() => { $('#status').textContent = 'Sin conexión'; });
