export const historyKey = 'jarvis.chats.v1';
const cleanMessages = messages => Array.isArray(messages) ? messages.filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && !m.deviceOnly).slice(-40).map(m => ({ ...m, content: m.content.slice(0, 8000) })) : [];
const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emptyChat = () => ({ id: id(), title: 'Nuevo chat', updatedAt: Date.now(), messages: [] });
export function loadHistory(storage) {
  const raw = storage.getItem(historyKey);
  if (raw !== null) {
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !Array.isArray(saved.chats) || saved.chats.length > 50) throw Error('Historial no válido');
    const chats = saved.chats.filter(c => c && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages)).map(c => ({ id: c.id, title: c.title.slice(0, 80), updatedAt: Number(c.updatedAt) || 0, messages: cleanMessages(c.messages) }));
    if (new Set(chats.map(c => c.id)).size !== chats.length) throw Error('Historial duplicado');
    if (chats.length) return { version: 1, chats, activeId: chats.some(c => c.id === saved.activeId) ? saved.activeId : chats[0].id };
  }
  const legacy = storage.getItem('jarvis.messages');
  const chat = emptyChat();chat.messages = cleanMessages(legacy ? JSON.parse(legacy) : []);
  chat.title = titleFor(chat.messages);
  return { version: 1, activeId: chat.id, chats: [chat] };
}
export const titleFor = messages => messages.find(m => m.role === 'user' && !m.deviceOnly)?.content.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Nuevo chat';
export function freshHistory() { const chat = emptyChat();return { version: 1, activeId: chat.id, chats: [chat] }; }
export function updateHistory(state, messages) {
  const active = state.chats.find(c => c.id === state.activeId);
  const clean = cleanMessages(messages);
  if (JSON.stringify(clean) !== JSON.stringify(active.messages)) active.updatedAt = Date.now();
  active.messages = clean;
  if (active.title === 'Nuevo chat' || !clean.length) active.title = titleFor(clean);
}
export function newHistoryChat(state) {
  if (!state.chats.find(c => c.id === state.activeId).messages.length) return;
  if (state.chats.length >= 50) throw Error('Tienes 50 conversaciones guardadas. No se borró ninguna; no se pueden crear más en este navegador.');
  const chat = emptyChat();state.chats.unshift(chat);state.activeId = chat.id;
}
export function saveHistory(storage, state) { storage.setItem(historyKey, JSON.stringify(state)); }
