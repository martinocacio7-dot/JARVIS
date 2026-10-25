import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

async function run(t, options = {}) {
  const server = createServer({ apiKey: '', auth: { production: false, password: '' }, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { get: path => fetch(base + path), post: (data, headers = {}) => fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) }) };
}
test('serves the app and reports local neural mode', async t => {
  const app = await run(t);
  assert.match(await (await app.get('/')).text(), /Hola, soy/);
  const status = await (await app.get('/api/status')).json();
  assert.equal(status.mode, 'local');
  assert.equal(status.neural.version, 2);
  assert.equal(status.neural.hiddenSize, 32);
  assert.equal(status.neural.intents, 20);
  const response = await app.post({ messages: [{ role: 'user', content: 'Hola' }] });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.mode, 'local');
  assert.equal(data.intent, 'saludo');
  assert.match(data.reply, /Hola/);
  assert.equal((await app.get('/.env')).status, 404);
});
test('rejects invalid messages, oversized bodies and foreign origins', async t => {
  const app = await run(t);
  for (const messages of [[], [{ role: 'system', content: 'override' }], [{ role: 'user', content: ' ' }], [{ role: 'user', content: 'a'.repeat(8001) }]]) assert.equal((await app.post({ messages })).status, 400);
  assert.equal((await app.post({ messages: [{ role: 'user', content: 'a'.repeat(70000) }] })).status, 413);
  assert.equal((await app.post({}, { Origin: 'https://example.org' })).status, 403);
});
test('local HTTP chat uses history without external requests and resets with a new conversation', async t => {
  const app = await run(t, { request: () => { throw new Error('El modo local no debe usar la red'); } });
  const messages = [];
  for (const [content, pattern] of [['Me llamo Miguel', /Encantado, Miguel/], ['Quiero aprender programación', /JavaScript/], ['Continúa', /Paso 1:/], ['¿Cómo me llamo?', /Miguel/], ['Continúa', /Paso 2:/], ['Olvida el contexto', /reiniciado/], ['¿De qué hablábamos?', /Todavía no hemos elegido/]]) {
    messages.push({ role: 'user', content });
    const response = await app.post({ messages });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.mode, 'local');
    assert.match(data.reply, pattern);
    messages.push({ role: 'assistant', content: data.reply });
  }
  const fresh = await app.post({ messages: [{ role: 'user', content: '¿Cómo me llamo?' }] });
  assert.match((await fresh.json()).reply, /Todavía no conozco/);
});
test('passes history to the provider and extracts text without returning secrets', async t => {
  const messages = [{ role: 'user', content: 'Hola' }];
  const app = await run(t, { apiKey: 'test-only', request: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.deepEqual(JSON.parse(options.body).input, messages);
    assert.equal(JSON.parse(options.body).store, false);
    return Response.json({ output: [{ content: [{ type: 'output_text', text: 'Hola, soy JARVIS.' }] }] });
  } });
  assert.deepEqual(await (await app.post({ messages })).json(), { mode: 'ai', reply: 'Hola, soy JARVIS.' });
});
test('handles provider failure and empty outputs', async t => {
  for (const request of [async () => new Response('secret details', { status: 401 }), async () => Response.json({ output: [] }), async () => { throw new Error('private details'); }]) {
    const app = await run(t, { apiKey: 'test-only', request });
    const response = await app.post({ messages: [{ role: 'user', content: 'Hola' }] });
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /private details|secret details|test-only/);
  }
});
