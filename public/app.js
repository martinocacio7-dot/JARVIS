import { initAndroidDevice, deviceReply } from './android-device.js';
import { initLibrary, libraryRequest, editCorrection } from './library-ui.js';
import { projectView } from './project-ui.js';
import { initFeedback, reportMisunderstanding } from './feedback-ui.js';
import { initDocuments, openDocuments } from './document-ui.js';
import { initVoice, isDictating, speakReply, stopSpeaking } from './voice.js';
import { initTasks, refreshTasks, openTaskEditor } from './task-ui.js';
import { initMobile } from './mobile.js';
import { replyView } from './reply-view.js';

initAndroidDevice();
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
  $('#messages').replaceChildren(...messages.map((message, index) => {
    const article = document.createElement('article');
    article.className = `message ${message.role}`;
    const name = document.createElement('strong');
    name.textContent = message.role === 'user' ? 'TÚ' : 'JARVIS';
    article.append(name, message.role === 'assistant' ? replyView(message.content) : document.createTextNode(message.content));
    if (message.role === 'assistant') {
      if (message.openTasks) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'correct-answer'; button.textContent = message.taskDraft ? 'Completar pendiente' : 'Abrir mis pendientes';
        button.addEventListener('click', () => openTaskEditor(message.taskDraft)); article.append(button);
      }
      if (message.documentDraft) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'correct-answer'; button.textContent = 'Preparar mi documento';
        button.addEventListener('click', () => openDocuments(messages[index - 1]?.content || '')); article.append(button);
      }
      const project = projectView(message.project);
      if (project) article.append(project);
      if (Array.isArray(message.suggestions)) {
        const choices = document.createElement('div');
        choices.className = 'suggested-intents';
        for (const text of message.suggestions.slice(0, 2)) {
          if (typeof text !== 'string' || text.length > 200) continue;
          const button = document.createElement('button');
          button.type = 'button'; button.textContent = text;
          button.addEventListener('click', () => { $('#prompt').value = text; $('#prompt').focus(); });
          choices.append(button);
        }
        article.append(choices);
      }
    }
    if (message.role === 'assistant' && !message.activation && !message.deviceOnly && messages[index - 1]?.role === 'user') {
      const correction = document.createElement('button');
      correction.type = 'button';
      correction.className = 'correct-answer';
      correction.textContent = 'Enseñar una respuesta mejor';
      correction.addEventListener('click', () => editCorrection(messages[index - 1].content));
      article.append(correction);
      if (typeof message.intent === 'string') {
        const feedback = document.createElement('button'); feedback.type = 'button'; feedback.className = 'correct-answer'; feedback.textContent = 'Entendiste mal';
        feedback.addEventListener('click', () => reportMisunderstanding(messages[index - 1].content, message.intent)); article.append(feedback);
      }
    }
    return article;
  }));
  try { localStorage.setItem('jarvis.messages', JSON.stringify(messages.filter(message => !message.deviceOnly))); } catch { storageAvailable = false; }
}
async function send(event) {
  event.preventDefault();
  const content = $('#prompt').value.trim();
  if (!content || busy || isDictating()) return;
  busy = true;
  document.dispatchEvent(new Event('jarvis:request-start'));
  $('#send').disabled = true;
  $('#new-chat').disabled = true;
  messages.push({ role: 'user', content });
  messages = messages.slice(-38);
  $('#prompt').value = '';
  render();
  $('#notice').textContent = 'JARVIS está preparando una respuesta…';
  try {
    const development = $('#work-mode').value === 'development';
    const knowledge = development ? null : libraryRequest(content);
    const payload = development ? { prompt: content } : knowledge || { messages: messages.filter(message => !message.deviceOnly).map(({ role, content }) => ({ role, content })) };
    const localReply = development ? null : deviceReply(content);
    const response = localReply === null ? await fetch(development ? '/api/develop' : knowledge ? '/api/knowledge' : '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(55000) }) : { ok: true, json: async () => ({ reply: localReply, deviceOnly: true }) };
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo enviar el mensaje.');
    if (data.deviceOnly) messages[messages.length - 1].deviceOnly = true;
    if (data.openTasks) { const alarmStatus = await refreshTasks(); if (alarmStatus) data.reply = data.reply.replace(/Esta web no emite alarmas automáticas; puedes exportarlo a tu calendario para usar sus avisos\./g, alarmStatus); }
    messages.push({ role: 'assistant', ...(data.deviceOnly ? { deviceOnly: true } : {}), content: data.reply, ...(data.project ? { project: data.project } : {}), ...(data.suggestions ? { suggestions: data.suggestions } : {}), ...(data.documentDraft ? { documentDraft: true } : {}), ...(data.openTasks ? { openTasks: true, ...(data.taskDraft ? { taskDraft: data.taskDraft } : {}) } : {}), ...(data.mode === 'local' && typeof data.intent === 'string' ? { intent: data.intent } : {}) });
    $('#notice').textContent = storageAvailable ? '' : 'El navegador no permite guardar el historial.';
    speakReply(data.reply, { localOnly: Boolean(data.deviceOnly) });
  } catch (error) {
    messages.pop();
    $('#prompt').value = content;
    $('#notice').textContent = error.name === 'TimeoutError' ? 'La solicitud tardó demasiado. Vuelve a intentarlo.' : error.message;
  } finally {
    busy = false;
    document.dispatchEvent(new Event('jarvis:request-end'));
    $('#send').disabled = false;
    $('#new-chat').disabled = false;
    render();
    $('#prompt').focus();
    $('#composer').scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
$('#composer').addEventListener('submit', send);
document.addEventListener('jarvis:background-reply', event => {
  const { command, reply } = event.detail || {};
  if (busy || typeof command !== 'string' || typeof reply !== 'string' || command.length > 8000 || reply.length > 16000) return;
  messages.push({ role: 'user', content: command }, { role: 'assistant', content: reply });
  messages = messages.slice(-40); render(); refreshTasks();
});
document.addEventListener('jarvis:awake', event => { messages.push({ role: 'assistant', content: event.detail.text, activation: true }); messages = messages.slice(-40); render(); });
$('#prompt').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('#composer').requestSubmit(); } });
$('#new-chat').addEventListener('click', () => { if (busy || isDictating()) return; stopSpeaking(); document.dispatchEvent(new Event('jarvis:new-chat')); messages = []; render(); $('#notice').textContent = ''; $('#prompt').focus(); });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { $('#prompt').value = button.dataset.prompt; $('#prompt').focus(); }));
initLibrary();
initFeedback();
initDocuments();
initVoice();
initTasks();
initMobile();
render();
fetch('/api/status').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
  $('#status').textContent = data.mode === 'ai' ? '● IA configurada' : `● Red local v${data.neural.version} · ${data.neural.intents} intenciones`;
  if (data.mode === 'local') $('#notice').textContent = `Red propia: ${data.neural.hiddenSize} neuronas ocultas y ${data.neural.examples} ejemplos. Prueba «Qué recuerdas de mí», «Cómo puedo entrenarte» o «Cuáles son tus límites». Todavía uso respuestas programadas.`;
}).catch(() => { $('#status').textContent = 'Sin conexión'; });
