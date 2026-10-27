import { randomUUID } from 'node:crypto';
import { taskKey, localDate, taskDate, displayTaskDate, validateTasks } from '../public/task-data.js';

const reminderStart = /^(?:recu[eé]rdame|av[ií]same|(?:crea|agrega|pon|hazme|hasme|haz|has|creame|créame)(?: un)? recordatorio)(?: para)?(?:\s+(.*))?$/iu;
const numberWords = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, sesenta: 60 };
function relativeDraft(text, now) {
  const key = taskKey(text);
  const match = key.match(/(?:^| )(?:en|dentro de) (\d+|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta|cuarenta|sesenta) (minutos?|horas?)(?: para| sobre| de| que)?(?: |$)/);
  if (!match) return null;
  const amount = numberWords[match[1]] ?? Number(match[1]);
  const minutes = amount * (match[2].startsWith('hora') ? 60 : 1);
  if (minutes < 1 || minutes > 10080) return { kind: 'reminder', text, date: '', time: '', dueAt: null };
  // Match against the original to preserve accents and the user's description.
  const original = text.match(/(?:^|\s)(?:en|dentro de) (?:\d+|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta|cuarenta|sesenta) (?:minutos?|horas?)(?:\s+(?:para|sobre|de|que))?(?:\s+|$)/iu);
  const description = (text.slice(0, original.index) + ' ' + text.slice(original.index + original[0].length)).trim();
  const dueAt = new Date(now.getTime() + minutes * 60000).toISOString();
  return { kind: 'reminder', text: description, date: localDate(new Date(dueAt)), time: displayTaskDate(dueAt), dueAt };
}
const notice = 'Queda guardado para consultarlo en JARVIS. Esta web no emite alarmas automáticas; puedes exportarlo a tu calendario para usar sus avisos.';
function dateFrom(words, now) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(words)) return words;
  const current = new Date(`${localDate(now)}T12:00:00-05:00`);
  current.setUTCDate(current.getUTCDate() + (words === 'hoy' ? 0 : words === 'manana' ? 1 : 2));
  return localDate(current);
}
function normalizeReminder(text, now) {
  const words = { una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };
  text = text.replace(/a (?:las?|la) (una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/giu, (_, word) => `a las ${words[word.toLowerCase()]}`);
  text = text.replace(/a (?:las?|la) (\d{1,2})(?: y (media|cuarto))? de la (ma[nñ]ana|tarde|noche)/giu, (_, h, fraction, part) => `a las ${h}${fraction ? ':' + (fraction.toLowerCase() === 'media' ? '30' : '15') : ''} ${/ma[nñ]ana/i.test(part) ? 'am' : 'pm'}`);
  const front = text.match(/^((?:(?:hoy|ma[nñ]ana|pasado ma[nñ]ana|\d{4}-\d{2}-\d{2})\s+)?a las? \d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s+(?:sobre|para|de|que)\s+(.+)$/iu);
  if (front) text = `${front[2]} ${front[1]}`;
  // Without a date, use the next occurrence and state its full date in the reply.
  if (!/\b(?:hoy|ma[nñ]ana|pasado ma[nñ]ana|\d{4}-\d{2}-\d{2})\s+a las?/iu.test(text)) {
    const tail = text.match(/\s+(a las? \d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)[.!?]?$/iu);
    if (tail) {
      const today = reminderDraft(`${text.slice(0, tail.index)} hoy ${tail[1]}`, now);
      text = `${text.slice(0, tail.index)} ${today.dueAt && Date.parse(today.dueAt) <= now.getTime() ? 'mañana' : 'hoy'} ${tail[1]}`;
    }
  }
  return text;
}
function reminderDraft(text, now) {
  const match = text.match(/\s+(hoy|ma[nñ]ana|pasado ma[nñ]ana|\d{4}-\d{2}-\d{2})(?:\s+a\s+las?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?[.!?]?$/iu);
  if (!match) return { kind: 'reminder', text, date: '', time: '', dueAt: null };
  const date = dateFrom(/^\d{4}-\d{2}-\d{2}$/.test(match[1]) ? match[1] : taskKey(match[1]), now);
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
  if ((match = phrase.match(reminderStart))) {
    if (/\b(cada (dia|semana|mes|ano|lunes|martes|miercoles|jueves|viernes|sabado|domingo|\d+ (minutos?|horas?|dias?))|todos los (dias|lunes|martes|miercoles|jueves|viernes|sabados|domingos|meses)|todas las (semanas|mananas|tardes|noches)|diariamente|semanalmente|mensualmente)\b/.test(normalized)) return { action: 'clarify', message: 'Todavía no programo repeticiones. Indica una única fecha y hora; no he guardado nada.' };
    return { action: 'create', draft: relativeDraft(match[1] || '', now) || reminderDraft(normalizeReminder(match[1] || '', now), now) };
  }
  if ((match = phrase.match(/^(?:a[nñ]ade|agrega|anota|pon)\s+(.+?)\s+(?:a|en)\s+(?:mi|la)\s+lista(?:\s+de compras)?[.!?]?$/iu)) || (match = phrase.match(/^(?:a[nñ]ade|agrega|anota)\s+(?:a|en)\s+mi\s+lista\s+(.+)$/iu))) return { action: 'create', draft: { kind: 'list', text: match[1].trim(), dueAt: null, date: '', time: '' } };
  if ((match = phrase.match(/^(?:cambia|mueve|reprograma)\s+(?:el recordatorio\s+)?(.+?)\s+para\s+(.+)$/iu))) return { action: 'reschedule', target: match[1], draft: reminderDraft(`${match[1]} ${match[2]}`, now) };
  if ((match = phrase.match(/^(?:marca|completa)\s+(.+?)(?:\s+como\s+(?:hecho|hecha|completado|completada))?[.!?]?$/iu))) return { action: 'complete', target: match[1] };
  if ((match = phrase.match(/^(?:elimina|borra|quita)\s+(.+?)\s+de\s+(?:mi|la)\s+lista[.!?]?$/iu))) return { action: 'delete', target: match[1], kind: 'list' };
  if (/^(que tengo pendiente|mis pendientes|muestra mis pendientes|muestra mis recordatorios|mis recordatorios|mi agenda|que tengo hoy|que tengo manana|muestra mi lista|mi lista|que hay en mi lista|que tengo en mi lista)$/.test(normalized)) return { action: 'read', kind: normalized.includes('lista') ? 'list' : normalized.includes('recordatorios') ? 'reminder' : null, day: normalized.endsWith('manana') ? dateFrom('manana', now) : normalized.endsWith('hoy') ? localDate(now) : null };
  return null;
}

// Reconstruct only a pending reminder in this conversation. Assistant text cannot
// manufacture an action, and a different command/question clears the pending draft.
export function parseTaskConversation(messages, now = new Date()) {
  let pending = null, result = null;
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const text = message.content.trim();
    result = parseTaskCommand(text, now);
    if (!result && pending) {
      const key = taskKey(text);
      const schedule = /^(?:hoy|manana|pasado manana|a las? |en \d|en (?:un|dos|tres|cinco|diez|quince|treinta) |dentro de )/.test(key);
      if (schedule && pending.text) {
        const dateOnly = pending.date && /^a las? /.test(key) ? pending.date + ' ' : '';
        result = parseTaskCommand('Recuérdame ' + pending.text + ' ' + dateOnly + text, now);
      } else if (!pending.text && !/^(?:que|como|cual|quien|abre|entra|cancela|olvida|no)\b/.test(key)) {
        result = parseTaskCommand('Recuérdame ' + text, now);
      }
    }
    pending = result?.action === 'create' && result.draft.kind === 'reminder' && (!result.draft.text || !result.draft.dueAt) ? result.draft : null;
  }
  return result;
}

export async function executeTaskCommand(command, database, now = new Date()) {
  const response = reply => ({ mode: 'assistant', reply, openTasks: true });
  const draftReply = (draft, reason) => ({ ...response(`${reason} Puedes responder con los datos que faltan o completar «Mis pendientes»; todavía no lo he guardado. Las horas se interpretan en America/Guayaquil (UTC−5).`), taskDraft: draft });
  if (command.action === 'clarify') return response(command.message);
  if (command.draft && (!command.draft.text.trim() || command.draft.text.length > 300)) return draftReply(command.draft, '¿Qué debo recordarte? Indica una descripción de hasta 300 caracteres y cuándo debo avisarte; por ejemplo: tomar agua en cinco minutos.');
  if (command.action === 'create' && command.draft.kind === 'reminder' && !command.draft.dueAt) return draftReply(command.draft, '¿Cuándo debo avisarte? Dime, por ejemplo, mañana a las nueve o en cinco minutos.');
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
