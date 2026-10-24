import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { createLibraryDatabase } from '../knowledge/database.js';
import { createLibraryStore } from '../public/library-store.js';

async function setup(t, options = {}) {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });
  const server = createServer({ apiKey: 'test-only-do-not-use', request: () => { throw new Error('La biblioteca no debe llamar a otras IA'); }, auth: { password: '', production: false }, database, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await database.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return (path, options) => fetch(base + path, options);
}

test('biblioteca HTTP permite subir, consultar, corregir, restaurar y eliminar desde distintos clientes', async t => {
  const request = await setup(t);
  const first = createLibraryStore(request);
  const second = createLibraryStore(request);
  await first.load();
  await second.load();
  await first.addDocument({ id: 'notas', title: 'Variables', content: 'Una variable guarda un valor con un nombre.' });
  await assert.rejects(second.teach('¿Qué estudio?', 'Otra respuesta'), /otro dispositivo/);
  assert.equal(second.snapshot().corrections.length, 0);
  await second.load();
  assert.equal(second.snapshot().documents.length, 1);
  let result = await request('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '¿Qué guarda una variable?' }) });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).sources[0].title, 'Variables');
  await second.teach('¿Qué estudio?', 'Informática');
  await second.teach('que estudio', 'Programación');
  assert.equal(second.snapshot().corrections.length, 1);
  result = await request('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '¿Qué estudio?' }) });
  assert.match((await result.json()).reply, /Programación/);
  const backup = second.snapshot();
  await second.removeDocument('notas');
  await second.removeCorrection('que estudio');
  assert.equal(second.snapshot().documents.length, 0);
  await second.restore(backup);
  assert.equal(second.snapshot().documents.length, 1);
  await assert.rejects(second.restore({ version: 9 }), /versión 1/);
  assert.deepEqual(second.snapshot(), backup);
});

test('biblioteca rechaza origen externo y datos inválidos sin escribir', async t => {
  const request = await setup(t);
  const options = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ library: { version: 1, documents: [], corrections: [] }, expectedRevision: 0 }) };
  assert.equal((await request('/api/library', { ...options, headers: { ...options.headers, Origin: 'https://other.example' } })).status, 403);
  assert.equal((await request('/api/library', { ...options, body: '{}' })).status, 400);
  assert.equal((await request('/api/library', { ...options, body: 'x'.repeat(1048577) })).status, 413);
  assert.equal((await (await request('/api/library')).json()).revision, 0);
});

test('sin base de producción la biblioteca informa el requisito y el chat local sigue funcionando', async t => {
  const database = createLibraryDatabase({ production: true, url: '' });
  const request = await setup(t, { database, apiKey: '' });
  const response = await request('/api/library');
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /DATABASE_URL/);
  const chat = await request('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Hola' }] }) });
  assert.equal(chat.status, 200);
  assert.equal((await chat.json()).intent, 'saludo');
});
