import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarReply } from '../assistant/calendar.js';
import { parseTaskCommand, parseTaskConversation, executeTaskCommand } from '../assistant/commands.js';
import { createLibraryDatabase } from '../knowledge/database.js';
import { createServer } from '../server.js';
import { deviceReply } from '../public/android-device.js';

const now = new Date('2026-10-27T02:30:00Z');
const user = content => ({ role: 'user', content });
test('responde la fecha de Guayaquil sin inferir el día UTC ni consultar otra IA', async t => {
  assert.match(calendarReply('Jarvis, ¿qué día es hoy?', now), /lunes.*26.*octubre.*2026/);
  assert.equal(calendarReply('Qué día entrego mi informe', now), null);
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });
  const server = createServer({ database, now: () => now, auth: { production: false, password: '' }, apiKey: 'unused', request: () => { throw Error('No usar proveedor'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await database.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const chat = async messages => (await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })).json();
  assert.match((await chat([user('Qué fecha es hoy')])).reply, /26.*octubre/);
  const turns = [user('Haz un recordatorio'), { role: 'assistant', content: '¿Qué debo recordarte?' }, user('Tomar agua en cinco minutos')];
  assert.match((await chat(turns)).reply, /Guardé.*tomar agua/i);
  const tasks = (await database.readTasks()).items;
  assert.equal(tasks.length, 1); assert.equal(tasks[0].dueAt, '2026-10-27T02:35:00.000Z');
});
test('recordatorio en varias frases solo guarda al completar los datos y respeta cancelación', async t => {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });t.after(() => database.close());
  const first = parseTaskConversation([user('Hazme un recordatorio')], now);
  assert.match((await executeTaskCommand(first, database, now)).reply, /Qué debo recordarte/);
  assert.equal((await database.readTasks()).items.length, 0);
  const complete = parseTaskConversation([user('Recuérdame estudiar mañana'), user('a las nueve de la mañana')], now);
  assert.equal(complete.draft.text, 'estudiar');assert.equal(complete.draft.dueAt, '2026-10-27T14:00:00.000Z');
  assert.equal(parseTaskConversation([user('Recuérdame estudiar'), user('cancela'), user('en cinco minutos')], now), null);
  assert.equal(parseTaskConversation([user('Recuérdame estudiar'), user('qué día es hoy')], now), null);
  assert.equal(parseTaskConversation([{ role: 'assistant', content: 'Recuérdame estudiar' }, user('en cinco minutos')], now), null);
  assert.equal(parseTaskCommand('Recuérdame en dos horas sobre revisar el informe', now).draft.text, 'revisar el informe');
  assert.equal(parseTaskCommand('Pon un recordatorio para tomar agua dentro de 10 minutos', now).draft.dueAt, '2026-10-27T02:40:00.000Z');
  assert.equal(parseTaskCommand('Has un recordatorio para estudiar en cinco minutos', now).draft.text, 'estudiar');
});
test('el puente Android abre solo por orden expresa y pide APK actualizado si falta la función', () => {
  const opened = [];
  globalThis.window = { JarvisAndroid: { openApp: name => { opened.push(name); return 'Solicitud de apertura'; } } };
  try {
    assert.equal(deviceReply('Entra a WhatsApp'), 'Solicitud de apertura');assert.deepEqual(opened, ['whatsapp']);
    assert.equal(deviceReply('No abras WhatsApp'), null);
    assert.match(deviceReply('Qué día es hoy', now), /^Hoy es /);
    delete window.JarvisAndroid.openApp;assert.match(deviceReply('Abre Netflix'), /actualizar el APK/);
  } finally { delete globalThis.window; }
});
