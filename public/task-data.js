export const taskZone = 'America/Guayaquil';
export const taskKey = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() || text.trim();
export function localDate(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: taskZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function taskDate(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || Number(time.slice(0, 2)) > 23 || Number(time.slice(3)) > 59) throw new Error('Completa una fecha y hora válidas, en formato de 24 horas.');
  const utc = new Date(`${date}T${time}:00-05:00`);
  if (!Number.isFinite(utc.getTime()) || localDate(utc) !== date) throw new Error('La fecha no existe.');
  return utc.toISOString();
}
export const displayTaskDate = dueAt => new Intl.DateTimeFormat('es-EC', { timeZone: taskZone, dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' }).format(new Date(dueAt));
export function validateTasks(items) {
  if (!Array.isArray(items) || items.length > 200) throw new Error('Puedes guardar hasta 200 pendientes.');
  const ids = new Set();
  return items.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) || ids.has(item.id)) throw new Error('Identificador inválido o duplicado.');
    ids.add(item.id);
    if (typeof item.text !== 'string' || !item.text.trim() || item.text.length > 300 || item.text.includes('\u0000') || !['reminder', 'list'].includes(item.kind) || typeof item.completed !== 'boolean') throw new Error('Revisa el pendiente: texto de hasta 300 caracteres y un tipo válido.');
    if (item.kind === 'reminder' && (typeof item.dueAt !== 'string' || !Number.isFinite(Date.parse(item.dueAt)) || new Date(item.dueAt).toISOString() !== item.dueAt)) throw new Error('El recordatorio debe tener una fecha y hora válidas.');
    if (item.kind === 'list' && item.dueAt !== null) throw new Error('Los elementos de lista no llevan fecha.');
    return { id: item.id, text: item.text.trim(), kind: item.kind, dueAt: item.dueAt, completed: item.completed };
  });
}

export function exportCalendar(items, now = new Date()) {
  const reminders = validateTasks(items).filter(item => item.kind === 'reminder' && !item.completed);
  if (!reminders.length) throw new Error('No hay recordatorios pendientes para exportar.');
  const stamp = date => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escape = text => text.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JARVIS//Agenda privada//ES', 'CALSCALE:GREGORIAN'];
  for (const item of reminders) lines.push('BEGIN:VEVENT', `UID:${item.id}@jarvis`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(item.dueAt)}`, `SUMMARY:${escape(item.text)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${escape(item.text)}`, 'END:VALARM', 'END:VEVENT');
  lines.push('END:VCALENDAR');
  // RFC 5545: plegar a 75 octetos sin cortar caracteres UTF-8.
  return lines.map(line => {
    let output = '', size = 0;
    for (const character of line) { const bytes = new TextEncoder().encode(character).length; if (size + bytes > 75) { output += '\r\n '; size = 1; } output += character; size += bytes; }
    return output;
  }).join('\r\n') + '\r\n';
}
