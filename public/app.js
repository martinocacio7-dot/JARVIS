import { loadHistory, freshHistory, updateHistory, newHistoryChat, saveHistory } from './chat-history.js';
import { initAndroidDevice, deviceReply, openAndroidMusic } from './android-device.js';
import { initLibrary, libraryRequest, editCorrection } from './library-ui.js';
import { projectView } from './project-ui.js';
import { initFeedback, reportMisunderstanding } from './feedback-ui.js';
import { initDocuments, openDocuments } from './document-ui.js';
import { initVoice, isDictating, speakReply, stopSpeaking, setDesktopVoice } from './voice.js';
import { initTasks, refreshTasks, openTaskEditor } from './task-ui.js';
import { initMobile } from './mobile.js';
import { searchCommand, safeSource } from './search-data.js';
import { replyView } from './reply-view.js';

initAndroidDevice();
const $ = selector => document.querySelector(selector);
let messages = [];
let busy = false;
let storageAvailable = true;
let history = freshHistory();
try { history = loadHistory(localStorage); } catch { storageAvailable = false; }
messages = history.chats.find(chat => chat.id === history.activeId).messages.slice();
function closeHistory() {
  document.body.classList.remove('history-open');$('#history-backdrop').hidden = true;
  $('#toggle-history').setAttribute('aria-expanded', 'false');$('#chat-sidebar').inert = window.innerWidth <= 800;document.querySelector('main').inert = false;
}
function renderHistory() {
  $('#chat-title').textContent = '/ ' + history.chats.find(chat => chat.id === history.activeId).title;
  $('#chat-list').replaceChildren(...history.chats.slice().sort((a,b) => b.updatedAt-a.updatedAt).map(chat => {
    const button = document.createElement('button');button.type = 'button';button.className = 'chat-row';
    button.textContent = chat.title;button.title = chat.title;button.setAttribute('aria-current', String(chat.id === history.activeId));button.disabled = busy;
    button.addEventListener('click', () => {
      if (busy || isDictating()) return;
      stopSpeaking();document.dispatchEvent(new Event('jarvis:new-chat'));
      history.activeId = chat.id;messages = chat.messages.slice();$('#prompt').value = '';$('#notice').textContent = '';
      closeHistory();render();requestAnimationFrame(() => $('#chat-scroll').scrollTo({ top: $('#chat-scroll').scrollHeight }));if (window.innerWidth > 800) $('#prompt').focus();else $('#toggle-history').focus();
    });return button;
  }));
  $('#history-notice').textContent = storageAvailable ? '' : 'No se pudo guardar el historial. Conserva esta pestaña abierta; los chats anteriores no se sobrescribieron.';
}
function render() {
  $('#welcome').hidden = messages.length > 0;document.body.classList.toggle('has-messages', messages.length > 0);
  const home = document.querySelector('.voice-home');if (messages.length) document.querySelector('main').insertBefore(home, $('#chat-scroll'));else $('#chat-scroll').prepend(home);
  $('#messages').replaceChildren(...messages.map((message, index) => {
    const article = document.createElement('article');
    article.className = `message ${message.role}`;
    const name = document.createElement('strong');
    name.textContent = message.role === 'user' ? 'TÚ' : 'JARVIS';
    article.append(name, message.role === 'assistant' ? replyView(message.content) : document.createTextNode(message.content));
    if (message.role === 'assistant') {
      if (Array.isArray(message.sources)) {
        const sources = document.createElement('div');sources.className = 'search-sources';
        for (const item of message.sources.slice(0, 3)) { const source = safeSource(item);if (!source) continue;const a = document.createElement('a');a.href = source.url;a.textContent = source.title;a.target = '_blank';a.rel = 'noopener noreferrer';sources.append(a); }
        article.append(sources);
      }
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
    if (message.role === 'assistant' && !message.activation && !message.deviceOnly && !Array.isArray(message.sources) && messages[index - 1]?.role === 'user') {
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
  updateHistory(history, messages);
  if (storageAvailable) try { saveHistory(localStorage, history); } catch { storageAvailable = false; }
  renderHistory();
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
    const search = development ? null : searchCommand(content);
    const knowledge = development || search ? null : libraryRequest(content);
    const payload = search ? { query: search.query } : development ? { prompt: content } : knowledge || { messages: messages.filter(message => !message.deviceOnly).map(({ role, content }) => ({ role, content })) };
    const localReply = development ? null : deviceReply(content);
    const response = localReply === null ? await fetch(search ? '/api/search' : development ? '/api/develop' : knowledge ? '/api/knowledge' : '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(55000) }) : { ok: true, json: async () => ({ reply: localReply, deviceOnly: true }) };
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo enviar el mensaje.');
    if (data.deviceOnly) messages[messages.length - 1].deviceOnly = true;
    if (typeof data.musicQuery === 'string') data.reply = openAndroidMusic(data.musicQuery);
    if (data.openTasks) { const alarmStatus = await refreshTasks(); if (alarmStatus) data.reply = data.reply.replace(/Esta web no emite alarmas automáticas; puedes exportarlo a tu calendario para usar sus avisos\./g, alarmStatus); }
    messages.push({ role: 'assistant', ...(data.deviceOnly ? { deviceOnly: true } : {}), content: data.reply, ...(Array.isArray(data.sources) ? { sources: data.sources } : {}), ...(data.project ? { project: data.project } : {}), ...(data.suggestions ? { suggestions: data.suggestions } : {}), ...(data.documentDraft ? { documentDraft: true } : {}), ...(data.openTasks ? { openTasks: true, ...(data.taskDraft ? { taskDraft: data.taskDraft } : {}) } : {}), ...(data.mode === 'local' && typeof data.intent === 'string' ? { intent: data.intent } : {}) });
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
    $('#chat-scroll').scrollTo({ top: $('#chat-scroll').scrollHeight, behavior: 'smooth' });
  }
}
$('#composer').addEventListener('submit', send);
document.addEventListener('jarvis:background-reply', event => {
  const { command, reply, deviceOnly } = event.detail || {};
  if (busy || typeof command !== 'string' || typeof reply !== 'string' || command.length > 8000 || reply.length > 16000) return;
  messages.push({ role: 'user', content: command, ...(deviceOnly ? { deviceOnly: true } : {}) }, { role: 'assistant', content: reply, ...(deviceOnly ? { deviceOnly: true } : {}) });
  messages = messages.slice(-40); render(); refreshTasks();
});
document.addEventListener('jarvis:awake', event => { messages.push({ role: 'assistant', content: event.detail.text, activation: true }); messages = messages.slice(-40); render(); });
$('#prompt').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('#composer').requestSubmit(); } });
$('#new-chat').addEventListener('click', () => {
  if (busy || isDictating()) return;
  try { newHistoryChat(history); } catch (error) { $('#notice').textContent = error.message;return; }
  stopSpeaking();document.dispatchEvent(new Event('jarvis:new-chat'));messages = [];$('#prompt').value = '';
  closeHistory();render();$('#notice').textContent = '';$('#prompt').focus();$('#chat-scroll').scrollTop = 0;
});
$('#toggle-history').addEventListener('click', () => { document.body.classList.add('history-open');$('#chat-sidebar').inert = false;document.querySelector('main').inert = true;$('#history-backdrop').hidden = false;$('#toggle-history').setAttribute('aria-expanded', 'true');$('#close-history').focus(); });
$('#close-history').addEventListener('click', () => { closeHistory();$('#toggle-history').focus(); });
$('#history-backdrop').addEventListener('click', closeHistory);
document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('history-open')) { closeHistory();$('#toggle-history').focus(); } });
function fitViewport() { document.documentElement.style.setProperty('--app-height', `${window.visualViewport?.height || window.innerHeight}px`);if (window.innerWidth > 800) closeHistory();else $('#chat-sidebar').inert = !document.body.classList.contains('history-open'); }
window.visualViewport?.addEventListener('resize', fitViewport);window.addEventListener('resize', fitViewport);fitViewport();

document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { $('#prompt').value = button.dataset.prompt; $('#prompt').focus(); }));
initLibrary();
initFeedback();
initDocuments();
initVoice();
initTasks();
initMobile();
render();
if (messages.length) requestAnimationFrame(() => $('#chat-scroll').scrollTo({ top: $('#chat-scroll').scrollHeight }));
fetch('/api/status').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
  setDesktopVoice(data.desktop === true);
  if (data.desktop) document.querySelector('.wake-help').textContent = 'Modo PC local: al activar JARVIS, las peticiones tras el saludo se envían automáticamente y pueden abrir las apps/páginas admitidas. Espera el saludo antes de hablar. El micrófono del navegador puede usar Internet y se detiene al salir de la pestaña. Desactiva la escucha para detenerlo.';
  $('#status').textContent = data.desktop ? '● PC local' : data.mode === 'ai' ? '● IA configurada' : '● Motor propio';

}).catch(() => { $('#status').textContent = 'Sin conexión'; });
