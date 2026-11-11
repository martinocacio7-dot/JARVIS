import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchCommand, safeSource } from '../public/search-data.js';
import { createGoogleSearch } from '../search/google.js';
import { createServer } from '../server.js';
test('only explicit commands are sent to search', () => {
 assert.deepEqual(searchCommand('JARVIS, busca en Google energía solar'), { query: 'energia solar' });
 assert.deepEqual(searchCommand('Busca energía solar en Google'), { query: 'energia solar' });
 assert.deepEqual(searchCommand('Noticias de hoy'), { query: 'noticias Ecuador hoy' });
 assert.deepEqual(searchCommand('Busca en Google'), { query: '' });
 for (const text of ['Qué es energía solar', 'Lee mis notificaciones', 'Recuerda que mi nombre es Miguel', 'Busca música de salsa']) assert.equal(searchCommand(text), null);
});
test('unconfigured search does not use a provider or pretend to search', async () => {
 const search = createGoogleSearch({ key: '', request: () => assert.fail('No request without credentials') });
 const result = await search('ciencia');assert.equal(result.configured, false);assert.match(result.reply, /no está configurada/);
 assert.match(result.sources[0].url, /^https:\/\/www.google.com\/search/);
 await assert.rejects(() => search('x'.repeat(301)), TypeError);
});
test('search isolates query, bounds sources and does not claim verification', async () => {
 let requests = 0;
 const search = createGoogleSearch({ key: 'private-key', engine: 'test-engine', request: async (url, options) => {
  requests++;assert.equal(url.origin + url.pathname, 'https://www.googleapis.com/customsearch/v1');assert.equal(url.searchParams.get('q'), 'energia solar');assert.equal(options.redirect, 'error');assert.ok(options.signal);
  return Response.json({ items: [{ title: 'Bad', snippet: 'unsafe', link: 'javascript:alert(1)' }, ...Array.from({ length: 6 }, (_, i) => ({ title: `Source ${i}`, snippet: 'Extracto ' + 'x'.repeat(1000), link: `https://example.org/${i}` }))] });
 } });
 const result = await search('energia solar');assert.equal(requests, 1);assert.equal(result.sources.length, 3);assert.equal(result.sources[0].snippet.length, 600);assert.match(result.reply, /no he leído las páginas completas/);assert.doesNotMatch(JSON.stringify(result), /private-key|test-engine/);
 for (const url of ['javascript:alert(1)', 'http://example.org', 'https://user:pass@example.org', 'file:///tmp/a']) assert.equal(safeSource({ title: 'bad', url }), null);
});
test('upstream failures and huge bodies are contained; quota is bounded', async () => {
 for (const request of [async () => { throw Error('private-key'); }, async () => new Response('private-key', { status: 403 }), async () => new Response('x'.repeat(140000))]) {
  const result = await createGoogleSearch({ key: 'private-key', engine: 'cx', request })('tema');assert.match(result.reply, /No pude consultar Google/);assert.doesNotMatch(JSON.stringify(result), /private-key/);
 }
 let calls = 0;const search = createGoogleSearch({ key: 'key', engine: 'cx', request: async () => { calls++;return Response.json({ items: [] }); } });
 for (let i = 0; i < 11; i++) await search('tema');assert.equal(calls, 10);
});
test('search endpoint uses the same authentication and origin boundary as chat', async t => {
 const server = createServer({ apiKey: '', auth: { production: true, password: 'google-search-test-password', username: 'jarvis' }, search: async query => ({ mode: 'search', reply: query, sources: [] }) });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));t.after(() => new Promise(resolve => { server.close(resolve);server.closeAllConnections(); }));
 const url = `http://127.0.0.1:${server.address().port}/api/search`;
 const auth='Basic '+Buffer.from('jarvis:google-search-test-password').toString('base64');
 assert.equal((await fetch(url)).status,401);
 const response = await fetch(url, { method: 'POST', headers: { Authorization:auth,'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'tema' }) });assert.equal((await response.json()).reply, 'tema');
 assert.equal((await fetch(url, { method: 'POST', headers: { Authorization:auth, 'Content-Type': 'application/json', Origin: 'https://other.example' }, body: '{}' })).status, 403);
});
