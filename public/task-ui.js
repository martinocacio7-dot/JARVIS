import { syncAndroidReminders } from './android-device.js';
import { validateTasks, taskDate, localDate, displayTaskDate, exportCalendar } from './task-data.js';
const $ = selector => document.querySelector(selector);
let items = [], revision = 0, editing = null, available = false;
const report = text => { $('#task-notice').textContent = text; };
function render() {
  $('#task-count').textContent = `${items.filter(item => !item.completed).length} pendientes · ${items.length} guardados`;
  $('#task-list').replaceChildren(...items.map(item => {
    const row = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${item.completed ? '✓ Completado' : item.dueAt && Date.parse(item.dueAt) < Date.now() ? 'Vencido' : 'Pendiente'}: ${item.text}${item.dueAt ? ` — ${displayTaskDate(item.dueAt)} (UTC−5)` : ' · Lista'}`;
    row.append(label);
    for (const [text, action] of [
      [item.completed ? 'Reabrir' : 'Completar', () => save(items.map(entry => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry), 'Estado actualizado.')],
      ['Editar', () => openTaskEditor(item)],
      ['Eliminar', async () => { if (await save(items.filter(entry => entry.id !== item.id), 'Pendiente eliminado.') && editing === item.id) reset(); }]
    ]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.addEventListener('click', action); row.append(button); }
    return row;
  }));
}
function updateKind() {
  const reminder = $('#task-kind').value === 'reminder';
  $('#task-date').required = reminder; $('#task-time').required = reminder; $('#task-schedule').hidden = !reminder;
}
function reset() { editing = null; $('#task-form').reset(); updateKind(); }
async function save(candidate, message) {
  $('#task-controls').disabled = true;
  try {
    const valid = validateTasks(candidate);
    const response = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: valid, expectedRevision: revision }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
    items = validateTasks(data.items); revision = data.revision; render(); const alarms = syncAndroidReminders(items); report(alarms ? `${message.replace(/ Esta web no emite alarmas automáticas; puedes exportar la agenda a tu calendario\./, '')} ${alarms}` : message); return true;
  } catch (error) { report(`No se pudo confirmar el cambio: ${error.message} Actualiza los pendientes antes de reintentar.`); return false; }
  finally { $('#task-controls').disabled = !available; }
}
export async function refreshTasks() {
  try {
    const response = await fetch('/api/tasks'); const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los pendientes.');
    if (available && data.revision < revision) return;
    items = validateTasks(data.items); revision = data.revision; available = true; $('#task-controls').disabled = false; render(); const alarms = syncAndroidReminders(items); if (alarms) report(alarms); return alarms;
  } catch (error) { report(error.message); available = false; $('#task-controls').disabled = true; $('#task-count').textContent = 'Necesita conexión a la base de datos'; }
}
export async function openTaskEditor(draft) {
  document.dispatchEvent(new Event('jarvis:show-tools'));
  $('#task-panel').open = true;
  await refreshTasks();
  if (!available) return;
  editing = draft?.id || null;
  $('#task-kind').value = draft?.kind || 'reminder'; $('#task-text').value = draft?.text || '';
  $('#task-date').value = draft?.date || (draft?.dueAt ? localDate(new Date(draft.dueAt)) : '');
  $('#task-time').value = draft?.time || (draft?.dueAt ? new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(draft.dueAt)) : '');
  updateKind(); report('Completa el pendiente. Los horarios se interpretan en America/Guayaquil (UTC−5).');
  $('#task-text').focus(); $('#task-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
export function initTasks() {
  refreshTasks(); updateKind();
  $('#task-refresh').addEventListener('click', refreshTasks);
  $('#task-kind').addEventListener('change', updateKind); $('#task-reset').addEventListener('click', reset);
  $('#task-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const old = editing ? items.find(item => item.id === editing) : null;
      if (editing && !old) throw new Error('Ese pendiente ya no existe. Actualiza la lista.');
      const kind = $('#task-kind').value;
      const dueAt = kind === 'reminder' ? taskDate($('#task-date').value, $('#task-time').value) : null;
      if (dueAt && dueAt !== old?.dueAt && Date.parse(dueAt) <= Date.now()) throw new Error('Elige una fecha y hora futuras.');
      const item = { id: editing || crypto.randomUUID(), kind, text: $('#task-text').value, dueAt, completed: old?.completed || false };
      if (await save(editing ? items.map(entry => entry.id === editing ? item : entry) : [...items, item], 'Guardado en la base de datos. Esta web no emite alarmas automáticas; puedes exportar la agenda a tu calendario.')) reset();
    } catch (error) { report(error.message); }
  });
  $('#task-export').addEventListener('click', () => {
    try {
      const url = URL.createObjectURL(new Blob([exportCalendar(items)], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'jarvis-agenda.ics'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      report('Importa el archivo en tu calendario para usar sus avisos. La importación y los avisos dependen de ese calendario; no hay sincronización automática.');
    } catch (error) { report(error.message); }
  });
}
