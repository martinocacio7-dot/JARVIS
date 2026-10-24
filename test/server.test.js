import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

async function run(t, options = {}) {
  const server = createServer({ apiKey: '', ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { get: path => fetch(base + path), post: (data, headers = {}) => fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) }) };
}
test('serves the app and reports local neural mode', async t => {
  const app = await run(t);
  assert.match(await (await app.get('/')).text(), /Hola, soy/);
  assert.equal((await (await app.get('/api/status')).json()).mode, 'local');
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
