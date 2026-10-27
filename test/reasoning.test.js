import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arithmetic, reasoningReply } from '../assistant/reasoning.js';
import { createServer } from '../server.js';
import { createLibraryDatabase } from '../knowledge/database.js';
const user = content => ({ role: 'user', content });
const ask = (...texts) => reasoningReply(texts.map(user));

test('calcula con prioridad, signos, decimales y límites sin ejecutar código', () => {
  assert.equal(arithmetic('2+3*4'), 14);
  assert.equal(arithmetic('(2+3)*4'), 20);
  assert.equal(arithmetic('-2^2'), -4);assert.equal(arithmetic('2^-2'), .25);
  assert.equal(arithmetic('2^3^2'), 512);
  assert.match(ask('Cuánto es 2,5 por 4').reply, /10/);
  assert.match(ask('calcula 8 dividido entre 0').reply, /cero/);
  assert.match(ask('calcula 2^100').reply, /exponentes/);
  assert.match(ask('calcula (2+3').reply, /paréntesis/);
  assert.equal(arithmetic('process.exit()'), null);
  assert.equal(ask('Explícame C++'), null);
  assert.equal(ask('Explícame el informe sobre ' + 'texto-'.repeat(100)), null);
  assert.equal(ask('Recuérdame comprar 2 libros'), null);
  assert.equal(ask('9'), null);
});
test('porcentajes, unidades compatibles y contexto se reconstruyen solo de turnos del usuario', () => {
  assert.match(ask('Cuánto es el 15 por ciento de 200').reply, /es 30/);
  assert.match(ask('Convierte 2,5 kilómetros a metros').reply, /2500 metros/);
  assert.match(ask('Pasa 2 horas a minutos').reply, /120 minutos/);
  assert.match(ask('convierte 1000 gramos a kg').reply, /1 kilogramos/);
  assert.match(ask('convierte 2 litros a ml').reply, /2000 mililitros/);
  assert.match(ask('convierte 5 metros a kilos').reply, /distintas/);
  assert.match(ask('convierte 10 dolares a euros').reply, /Todavía no/);
  assert.match(ask('25 por 4', 'y por 3').reply, /= 300/);
  assert.match(ask('25 por 4', 'y súmale 20').reply, /= 120/);
  assert.match(ask('2+2', 'hola', 'y por 3').reply, /Qué número/);
  assert.match(reasoningReply([{ role: 'assistant', content: '2+2=4' }, user('y por 3')]).reply, /Qué número/);
});
test('API contesta cálculos sin proveedor y preserva recordatorios y proyectos', async t => {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });
  const server = createServer({ database, auth: { production: false, password: '' }, request: () => { throw Error('Sin proveedor'); }, now: () => new Date('2026-10-27T12:00Z') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await database.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const chat = async (...texts) => {
    const r = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: texts.map(user) }) });
    assert.equal(r.status, 200);return r.json();
  };
  assert.match((await chat('Cuánto es 12 por 5', 'y por 2')).reply, /= 120/);
  assert.match((await chat('Recuérdame estudiar en cinco minutos')).reply, /Guardé/);
  assert.equal((await database.readTasks()).items.length, 1);
  assert.ok((await chat('Crea una calculadora')).project);
});
