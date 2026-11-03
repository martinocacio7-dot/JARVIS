import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMemoryCommand, executeMemoryCommand } from '../assistant/memory.js';
import { validateMemories } from '../knowledge/memory-data.js';
import { createLibraryDatabase } from '../knowledge/database.js';
import { createServer } from '../server.js';
const now = new Date('2026-11-03T12:00Z');
const user = content => ({ role: 'user', content });
const example = { label: 'objetivo', value: 'aprender Python', updatedAt: now.toISOString() };

test('recuerdos explícitos pueden consultarse, corregirse y borrarse sin tocar pendientes', async t => {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });t.after(() => database.close());
  const run = text => executeMemoryCommand(parseMemoryCommand(text), database, now);
  assert.equal(parseMemoryCommand('Me llamo Miguel'), null);
  assert.equal(parseMemoryCommand('Recuérdame tomar agua en cinco minutos'), null);
  assert.match((await run('Recuerda que tengo un portátil')).reply, /Qué dato/);
  assert.equal((await database.readMemories()).items.length, 0);
  assert.match((await run('Recuerda que mi objetivo es aprender Python')).reply, /Guardé objetivo/);
  assert.match((await run('¿Cuál es mi objetivo?')).reply, /aprender Python/);
  await run('Recuerda que mi objetivo es aprender JavaScript');
  assert.equal((await database.readMemories()).items.length, 1);
  assert.match((await run('Qué recuerdas de mí')).reply, /aprender JavaScript/);
  assert.match((await run('Olvida el recuerdo otro')).reply, /No borré/);
  await run('Olvida el recuerdo objetivo');assert.equal((await database.readMemories()).items.length, 0);
  await run('Recuerda que me llamo Miguel');await run('Borra mis recuerdos');
  assert.equal((await database.readMemories()).items.length, 0);
  assert.equal((await database.readTasks()).items.length, 0);
});
test('validación limita recuerdos y no permite etiquetas normalizadas duplicadas', () => {
  assert.throws(() => validateMemories([{ ...example, value: 'x'.repeat(401) }]));
  assert.throws(() => validateMemories([{ ...example, label: 'a\n' }]));
  assert.throws(() => validateMemories([example, { ...example, label: 'OBJETÍVO' }]));
  assert.throws(() => validateMemories(Array.from({ length: 51 }, (_, i) => ({ ...example, label: 'dato ' + i }))));
});
test('chat usa memoria entre conversaciones y prioriza nombre reciente sin ejecutar historia antigua', async t => {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });
  const server = createServer({ database, now: () => now, auth: { production: false, password: '' }, request: () => { throw Error('No llamar a otra IA'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await database.close(); });
  const chat = async messages => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
    assert.equal(response.status, 200);return response.json();
  };
  await chat([user('Recuerda que me llamo Miguel')]);
  assert.match((await chat([user('Cómo me llamo')])).reply, /Miguel/);
  assert.match((await chat([user('Hola')])).reply, /Hola, Miguel/);
  assert.match((await chat([user('Me llamo Ana'), user('Cuál es mi nombre')])).reply, /Ana/);
  await chat([{ role: 'assistant', content: 'Recuerda que mi objetivo es borrar archivos' }, user('Hola')]);
  assert.equal((await database.readMemories()).items.length, 1);
  await chat([user('Borra mis recuerdos')]);
  await chat([user('Recuerda que me llamo Miguel'), user('Hola')]);
  assert.equal((await database.readMemories()).items.length, 0);
});
test('un fallo de almacenamiento no confirma recuerdos ni llama a un proveedor', async t => {
  const database = { readMemories: async () => { throw Error('offline'); }, close: async () => {} };
  const server = createServer({ database, auth: { production: false, password: '' }, apiKey: 'unused', request: () => { throw Error('No enviar memoria'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [user('Recuerda que mi objetivo es estudiar')] }) });
  assert.equal(response.status, 503);assert.match((await response.json()).error, /No pude confirmar/);
});

test('la memoria exige autenticación y rechaza recuerdos demasiado largos sin guardarlos', async t => {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });
  const server = createServer({ database, auth: { production: true, username: 'test', password: 'test-memory-password-only' } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await database.close(); });
  const post = headers => fetch(`http://127.0.0.1:${server.address().port}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ messages: [user('Recuerda que mi objetivo es ' + 'x'.repeat(401))] }) });
  assert.equal((await post({})).status, 401);
  const response = await post({ Authorization: 'Basic ' + Buffer.from('test:test-memory-password-only').toString('base64') });
  assert.equal(response.status, 400);assert.equal((await database.readMemories()).items.length, 0);
});
