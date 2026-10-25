import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTaskCommand, executeTaskCommand } from '../assistant/commands.js';
import { taskDate, localDate, validateTasks, exportCalendar } from '../public/task-data.js';
import { createLibraryDatabase } from '../knowledge/database.js';
import { createServer } from '../server.js';

const now = new Date('2026-10-25T02:30:00.000Z'); // 24 de octubre, 21:30 en Guayaquil.
test('interpreta fechas locales sin depender del huso horario de la máquina', () => {
  assert.equal(localDate(now), '2026-10-24');
  const tomorrow = parseTaskCommand('Recuérdame entregar el informe mañana a las 9', now).draft;
  assert.equal(tomorrow.text, 'entregar el informe');
  assert.equal(tomorrow.dueAt, '2026-10-25T14:00:00.000Z');
  assert.equal(parseTaskCommand('Recuérdame estudiar pasado mañana a las 12 am', now).draft.dueAt, '2026-10-26T05:00:00.000Z');
  assert.equal(parseTaskCommand('Recuérdame estudiar mañana a las 12 pm', now).draft.dueAt, '2026-10-25T17:00:00.000Z');
  assert.equal(parseTaskCommand('Recuérdame estudiar mañana a las 9:99', now).draft.dueAt, null);
  assert.equal(parseTaskCommand('Recuérdame estudiar mañana a las 9', new Date('2028-02-28T18:00Z')).draft.dueAt, '2028-02-29T14:00:00.000Z');
  assert.equal(parseTaskCommand('Recuérdame estudiar mañana a las 9', new Date('2026-12-31T18:00Z')).draft.dueAt, '2027-01-01T14:00:00.000Z');
  assert.throws(() => taskDate('2027-02-30', '09:00'));
  assert.equal(parseTaskCommand('No borres leche de mi lista', now), null);
  assert.equal(parseTaskCommand('Recuérdame resolver cada ejercicio mañana a las 9', now).action, 'create');
});
test('pide datos antes de guardar y no finge recordatorios recurrentes', async () => {
  const noWrite = { readTasks: () => { throw new Error('No debería acceder a la base'); } };
  const reply = await executeTaskCommand(parseTaskCommand('Recuérdame entregar el informe mañana', now), noWrite, now);
  assert.equal(reply.taskDraft.date, '2026-10-25'); assert.equal(reply.taskDraft.time, '');
  assert.match(reply.reply, /todavía no lo he guardado/);
  assert.match((await executeTaskCommand(parseTaskCommand('Recuérdame estudiar hoy a las 9', now), noWrite, now)).reply, /ya pasaron/);
  assert.match((await executeTaskCommand(parseTaskCommand('Recuérdame estudiar todos los días a las 9', now), noWrite, now)).reply, /repeticiones/);
});
test('crea, consulta, reprograma y completa con acciones verificadas en base de datos', async t => {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' }); t.after(() => database.close());
  const run = text => executeTaskCommand(parseTaskCommand(text, now), database, now);
  assert.match((await run('Recuérdame entregar el informe mañana a las 9')).reply, /Guardé/);
  assert.match((await run('Recuérdame entregar el informe mañana a las 9')).reply, /ya está guardado/);
  assert.equal((await database.readTasks()).items.length, 1);
  assert.match((await run('Qué tengo mañana')).reply, /entregar el informe/);
  await run('Cambia entregar el informe para pasado mañana a las 10');
  assert.equal((await database.readTasks()).items[0].dueAt, '2026-10-26T15:00:00.000Z');
  await run('Marca entregar el informe como hecho');
  assert.equal((await database.readTasks()).items[0].completed, true);
  await run('Añade leche a mi lista'); await run('Añade pan a mi lista');
  assert.match((await run('Qué hay en mi lista')).reply, /leche/);
  await run('Elimina leche de mi lista');
  assert.ok(!(await database.readTasks()).items.some(item => item.text === 'leche'));
  assert.match((await run('Marca algo distinto como hecho')).reply, /no cambié nada/);
  assert.equal((await database.read()).library.documents.length, 0);
  assert.equal((await database.readFeedback()).feedback.length, 0);
});
test('exporta calendario con fechas UTC, aviso y escape de texto sin cortar UTF-8', () => {
  const item = { id: 'calendar-test', kind: 'reminder', text: 'Revisar informe, citas; y resumen á'.repeat(5), dueAt: '2026-10-25T14:00:00.000Z', completed: false };
  const calendar = exportCalendar([item], now);
  assert.match(calendar, /DTSTART:20261025T140000Z/); assert.match(calendar, /BEGIN:VALARM/);
  assert.match(calendar, /informe\\, citas\\;/);
  for (const line of calendar.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.throws(() => exportCalendar([{ ...item, completed: true }], now));
  assert.throws(() => validateTasks([{ ...item, dueAt: 'invalid' }]));
  assert.ok(!exportCalendar([{ ...item, text: 'Revisar\r\nATTENDEE:ejemplo' }], now).includes('\r\nATTENDEE:'));
});
test('API privada guarda con revisión y el chat actúa sin llamar a otra IA', async t => {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });
  const server = createServer({ database, now: () => now, auth: { production: false, password: '' }, apiKey: 'test-only', request: () => { throw new Error('No usar otra IA para pendientes'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await database.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const chat = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Añade leche a mi lista' }] }) });
  assert.equal(chat.status, 200); assert.match((await chat.json()).reply, /Guardé/);
  const state = await (await fetch(base + '/api/tasks')).json(); assert.equal(state.items.length, 1);
  const options = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [], expectedRevision: state.revision - 1 }) };
  assert.equal((await fetch(base + '/api/tasks', options)).status, 409);
  assert.equal((await fetch(base + '/api/tasks', { ...options, headers: { ...options.headers, Origin: 'https://other.example' } })).status, 403);
});
