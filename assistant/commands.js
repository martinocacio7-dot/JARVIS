import { randomUUID } from 'node:crypto';
import { taskKey, localDate, taskDate, displayTaskDate, validateTasks } from '../public/task-data.js';

const notice = 'Queda guardado para consultarlo en JARVIS. Esta web no emite alarmas automáticas; puedes exportarlo a tu calendario para usar sus avisos.';
function dateFrom(words, now) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(words)) return words;
  const current = new Date(`${localDate(now)}T12:00:00-05:00`);
  current.setUTCDate(current.getUTCDate() + (words === 'hoy' ? 0 : words === 'manana' ? 1 : 2));
  return localDate(current);
}
function reminderDraft(text, now) {
  const match = text.match(/\s+(hoy|ma[nñ]ana|pasado ma[nñ]ana|\d{4}-\d{2}-\d{2})(?:\s+a\s+las?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?[.!?]?$/iu);
  if (!match) return { kind: 'reminder', text, date: '', time: '', dueAt: null };
  const date = dateFrom(taskKey(match[1]), now);
  let hour = match[2] === undefined ? null : Number(match[2]);
  const minute = match[3] || '00';
  if (hour !== null && match[4]) {
    if (hour < 1 || hour > 12) hour = null;
    else hour = hour % 12 + (match[4].toLowerCase() === 'pm' ? 12 : 0);
  }
  const time = hour === null ? '' : `${String(hour).padStart(2, '0')}:${minute}`;
  let dueAt = null;
  try { if (time) dueAt = taskDate(date, time); } catch { /* Se pedirá al usuario que lo complete. */ }
  return { kind: 'reminder', text: text.slice(0, match.index).trim(), date, time: dueAt ? time : '', dueAt };
}

export function parseTaskCommand(text, now = new Date()) {
  const phrase = text.trim().replace(/^jarvis[,\s]+/iu, '');
  const normalized = taskKey(phrase);
  let match;
  if ((match = phrase.match(/^(?:recu[eé]rdame|av[ií]same|crea un recordatorio(?: para)?|agrega un recordatorio(?: para)?)\s+(.+)$/iu))) {
    if (/\b(cada (dia|semana|mes|ano|lunes|martes|miercoles|jueves|viernes|sabado|domingo|\d+ (minutos?|horas?|dias?))|todos los (dias|lunes|martes|miercoles|jueves|viernes|sabados|domingos|meses)|todas las (semanas|mananas|tardes|noches)|diariamente|semanalmente|mensualmente)\b/.test(normalized)) return { action: 'clarify', message: 'Todavía no programo repeticiones. Indica una única fecha y hora; no he guardado nada.' };
    return { action: 'create', draft: reminderDraft(match[1], now) };
  }
  if ((match = phrase.match(/^(?:a[nñ]ade|agrega|anota|pon)\s+(.+?)\s+(?:a|en)\s+(?:mi|la)\s+lista(?:\s+de compras)?[.!?]?$/iu)) || (match = phrase.match(/^(?:a[nñ]ade|agrega|anota)\s+(?:a|en)\s+mi\s+lista\s+(.+)$/iu))) return { action: 'create', draft: { kind: 'list', text: match[1].trim(), dueAt: null, date: '', time: '' } };
  if ((match = phrase.match(/^(?:cambia|mueve|reprograma)\s+(?:el recordatorio\s+)?(.+?)\s+para\s+(.+)$/iu))) return { action: 'reschedule', target: match[1], draft: reminderDraft(`${match[1]} ${match[2]}`, now) };
  if ((match = phrase.match(/^(?:marca|completa)\s+(.+?)(?:\s+como\s+(?:hecho|hecha|completado|completada))?[.!?]?$/iu))) return { action: 'complete', target: match[1] };
  if ((match = phrase.match(/^(?:elimina|borra|quita)\s+(.+?)\s+de\s+(?:mi|la)\s+lista[.!?]?$/iu))) return { action: 'delete', target: match[1], kind: 'list' };
  if (/^(que tengo pendiente|mis pendientes|muestra mis pendientes|muestra mis recordatorios|mis recordatorios|mi agenda|que tengo hoy|que tengo manana|muestra mi lista|mi lista|que hay en mi lista|que tengo en mi lista)$/.test(normalized)) return { action: 'read', kind: normalized.includes('lista') ? 'list' : normalized.includes('recordatorios') ? 'reminder' : null, day: normalized.endsWith('manana') ? dateFrom('manana', now) : normalized.endsWith('hoy') ? localDate(now) : null };
  return null;
}

export async function executeTaskCommand(command, database, now = new Date()) {
  const response = reply => ({ mode: 'assistant', reply, openTasks: true });
  const draftReply = (draft, reason) => ({ ...response(`${reason} Completa el pendiente en «Mis pendientes»; todavía no lo he guardado. Las horas se interpretan en America/Guayaquil (UTC−5).`), taskDraft: draft });
  if (command.action === 'clarify') return response(command.message);
  if (command.draft && (!command.draft.text.trim() || command.draft.text.length > 300)) return draftReply(command.draft, 'Necesito una descripción de entre 1 y 300 caracteres.');
  if (command.action === 'create' && command.draft.kind === 'reminder' && !command.draft.dueAt) return draftReply(command.draft, 'Necesito una fecha y una hora exactas.');
  if (command.action === 'create' && command.draft.dueAt && Date.parse(command.draft.dueAt) <= now.getTime()) return draftReply(command.draft, 'Esa fecha y hora ya pasaron. Elige una futura.');
  const saved = await database.readTasks();
  let items = saved.items;
  if (command.action === 'read') {
    const result = items.filter(item => !item.completed && (!command.kind || item.kind === command.kind) && (!command.day || item.dueAt && localDate(new Date(item.dueAt)) === command.day)).sort((a, b) => (a.dueAt || 'z').localeCompare(b.dueAt || 'z'));
    return response(result.length ? `Tienes ${result.length} pendientes${command.day ? ` para ${command.day}` : ''}:\n${result.slice(0, 10).map((item, i) => `${i + 1}. ${item.text}${item.dueAt ? ` — ${displayTaskDate(item.dueAt)} (UTC−5)` : ''}`).join('\n')}${result.length > 10 ? '\nEl chat muestra los primeros diez; abre «Mis pendientes» para ver todos.' : ''}` : 'No hay pendientes que coincidan con esa consulta.');
  }
  if (command.action === 'create') {
    const draft = command.draft;
    if (items.some(item => !item.completed && item.kind === draft.kind && item.dueAt === draft.dueAt && taskKey(item.text) === taskKey(draft.text))) return response('Ese pendiente ya está guardado. No lo añadí otra vez.');
    const item = { id: randomUUID(), kind: draft.kind, text: draft.text, dueAt: draft.dueAt, completed: false };
    items = validateTasks([...items, item]); await database.writeTasks(items, saved.revision);
    return response(`Guardé «${item.text}»${item.dueAt ? ` para ${displayTaskDate(item.dueAt)} (UTC−5)` : ' en tu lista'}. ${item.kind === 'reminder' ? notice : ''}`);
  }
  const candidates = items.filter(item => (!item.completed || command.action === 'delete') && (!command.kind || item.kind === command.kind) && (command.action !== 'reschedule' || item.kind === 'reminder') && taskKey(item.text) === taskKey(command.target));
  if (candidates.length !== 1) return response('No encontré un único pendiente con ese nombre exacto. Abre «Mis pendientes» y elige cuál quieres modificar; no cambié nada.');
  const item = candidates[0];
  if (command.action === 'reschedule') {
    if (!command.draft.dueAt || Date.parse(command.draft.dueAt) <= now.getTime()) return draftReply({ ...command.draft, id: item.id, text: item.text }, 'Elige una fecha y hora futuras para cambiarlo.');
    items = items.map(entry => entry.id === item.id ? { ...entry, dueAt: command.draft.dueAt } : entry);
  } else items = command.action === 'delete' ? items.filter(entry => entry.id !== item.id) : items.map(entry => entry.id === item.id ? { ...entry, completed: true } : entry);
  await database.writeTasks(items, saved.revision);
  return response(command.action === 'delete' ? `Eliminé «${item.text}» de tu lista.` : command.action === 'complete' ? `Marqué «${item.text}» como completado.` : `Cambié «${item.text}» a ${displayTaskDate(command.draft.dueAt)} (UTC−5). ${notice}`);
}
