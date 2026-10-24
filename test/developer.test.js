import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { develop, isDevelopmentRequest } from '../developer/generator.js';
import { createServer } from '../server.js';

test('genera tres prototipos autocontenidos con código JavaScript válido', () => {
  for (const kind of ['tareas', 'inventario', 'calculadora']) {
    const result = develop(`Desarrolla ${kind} en HTML, CSS y JavaScript`);
    assert.equal(result.project.kind, kind);
    assert.equal(result.project.filename, `jarvis-${kind}.html`);
    assert.ok(result.project.code.length < 30000);
    const scripts = [...result.project.code.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1);
    assert.doesNotThrow(() => new Script(scripts[0][1]));
    assert.doesNotMatch(result.project.code, /\beval\s*\(|new Function|https?:\/\/|<script\s+src/);
  }
});
test('rechaza peticiones incompatibles y escapa títulos sin convertirlos en código', () => {
  for (const prompt of ['Crea una tienda', 'Haz una calculadora en Python', 'Crea inventario y tareas', 'Crea inventario con PostgreSQL y usuarios']) assert.equal(develop(prompt).project, null, prompt);
  const title = '</title><script>alert(1)</script>';
  const project = develop(`Crea tareas titulado "${title}"`).project;
  assert.ok(!project.code.includes(title));
  assert.match(project.code, /&lt;script&gt;/);
  assert.throws(() => develop(null));
  assert.throws(() => develop('x'.repeat(8001)));
  assert.equal(isDevelopmentRequest('Hazme una calculadora'), true);
  assert.equal(isDevelopmentRequest('Quiero aprender programación'), false);
});
test('API desarrolla sin otras IA y reconoce solicitudes de código en el chat', async t => {
  const server = createServer({ apiKey: 'test-only', auth: { production: false, password: '' }, request: () => { throw new Error('No llamar a proveedores externos'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const direct = await post('/api/develop', { prompt: 'Crea inventario' });
  assert.equal(direct.status, 200);
  assert.equal((await direct.json()).project.kind, 'inventario');
  const chat = await post('/api/chat', { messages: [{ role: 'user', content: 'Hazme una calculadora' }] });
  assert.equal((await chat.json()).project.kind, 'calculadora');
  assert.equal((await post('/api/develop', {})).status, 400);
  assert.equal((await post('/api/develop', { prompt: 'Crea tareas' }, { Origin: 'https://other.example' })).status, 403);
});
