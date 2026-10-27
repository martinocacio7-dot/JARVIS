import { taskKey, taskZone } from '../public/task-data.js';

export function calendarReply(text, now = new Date()) {
  const phrase = taskKey(text).replace(/^jarvis\s+/, '').replace(/ por favor$/, '');
  if (/^(que dia es(?: hoy)?|que dia estamos|en que dia estamos|que fecha es(?: hoy)?|cual es la fecha(?: de hoy)?|dime la fecha(?: de hoy)?|fecha de hoy|que dia de la semana es(?: hoy)?)$/.test(phrase)) {
    return `Hoy es ${new Intl.DateTimeFormat('es-EC', { timeZone: taskZone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now)}.`;
  }
  return null;
}
