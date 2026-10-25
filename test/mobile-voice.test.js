import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { createLibraryDatabase } from '../knowledge/database.js';
import { createVoiceService } from '../voice/elevenlabs.js';
import { wakePhrase, activationReply } from '../public/voice.js';

const sample = { data: Buffer.from('OggS test sample').toString('base64'), mime: 'audio/ogg' };
async function app(t, options = {}) {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });
  const server = createServer({ apiKey: '', database, auth: { production: true, password: 'private-test-password-123', username: 'jarvis' }, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await database.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const auth = 'Basic ' + Buffer.from('jarvis:private-test-password-123').toString('base64');
  return { database, request: (path, options = {}) => fetch(base + path, { ...options, headers: { Authorization: auth, ...options.headers } }), anonymous: path => fetch(base + path) };
}
test('detecta JARVIS como palabra y conserva una petición tras el nombre', () => {
  assert.equal(activationReply, 'Sí, dígame, señor.');
  assert.deepEqual(wakePhrase('JARVIS'), { command: '' });
  assert.deepEqual(wakePhrase('Oye, Jarvís, añade leche a mi lista'), { command: 'añade leche a mi lista' });
  assert.equal(wakePhrase('superjarvis'), null); assert.equal(wakePhrase('hola asistente'), null);
});
test('manifiesto e iconos de instalación son públicos; página y API siguen privadas', async t => {
  const { anonymous } = await app(t);
  assert.equal((await anonymous('/')).status, 401);
  assert.equal((await anonymous('/api/tasks')).status, 401);
  const response = await anonymous('/manifest.webmanifest'); assert.equal(response.status, 200);
  const manifest = await response.json(); assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, '/');
  for (const icon of manifest.icons) { const data = Buffer.from(await (await anonymous(icon.src)).arrayBuffer()); assert.equal(data.readUInt32BE(16), Number(icon.sizes.split('x')[0])); }
  const worker = await anonymous('/sw.js'); assert.equal(worker.status, 200); assert.doesNotMatch(await worker.text(), /caches\.(open|match)|indexedDB|localStorage/);
});
test('adaptador de voz usa los contratos de muestras y síntesis sin revelar la clave', async () => {
  const calls = [];
  const service = createVoiceService({ apiKey: 'test-only-secret', request: async (url, options) => {
    calls.push(url); assert.equal(options.headers['xi-api-key'], 'test-only-secret');
    if (url.endsWith('/voices/add')) { assert.equal(options.body.get('name'), 'JARVIS'); assert.equal(options.body.getAll('files').length, 1); return Response.json({ voice_id: 'voice_123' }); }
    assert.equal(JSON.parse(options.body).model_id, 'eleven_multilingual_v2'); return new Response('audio-test', { headers: { 'Content-Type': 'audio/mpeg' } });
  } });
  const created = await service.clone({ name: 'JARVIS', samples: [sample] }); assert.equal(created.voiceId, 'voice_123');
  const result = await service.synthesize('Sí, dígame, señor.', created.voiceId); assert.equal(result.type, 'audio/mpeg'); assert.equal(result.buffer.toString(), 'audio-test');
  assert.equal(calls.length, 2);
  await assert.rejects(service.clone({ name: 'JARVIS', samples: [{ ...sample, data: 'invalid!' }] }), TypeError);
  assert.equal(calls.length, 2);
});
test('API crea una voz tras solicitud explícita, guarda solo su ID y lee usando esa voz', async t => {
  let clones = 0;
  const voice = { configured: true, fallbackVoiceId: 'previous_voice', clone: async () => { clones++; return { voiceId: 'new_voice', name: 'Voz personal' }; }, synthesize: async (text, id) => { assert.equal(id, 'new_voice'); return { buffer: Buffer.from('audio'), type: 'audio/mpeg' }; } };
  const { request, database } = await app(t, { voice });
  assert.equal((await (await request('/api/voice')).json()).ready, true); assert.equal(clones, 0);
  const clone = await request('/api/voice/clone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'JARVIS', samples: [sample] }) });
  assert.equal(clone.status, 200); assert.equal(clones, 1); assert.deepEqual((await database.readVoice()).voice, { voiceId: 'new_voice', name: 'Voz personal' });
  const speak = await request('/api/voice/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Una respuesta nueva' }) });
  assert.equal(speak.status, 200); assert.equal(await speak.text(), 'audio');
  const crossOrigin = await request('/api/voice/clone', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.org' }, body: '{}' }); assert.equal(crossOrigin.status, 403); assert.equal(clones, 1);
});
test('sin clave no se envían muestras y los errores del proveedor no exponen detalles', async t => {
  const unavailable = await app(t, { voice: createVoiceService({ apiKey: '', request: () => { throw new Error('No llamar'); } }) });
  assert.equal((await (await unavailable.request('/api/voice')).json()).ready, false);
  assert.equal((await unavailable.request('/api/voice/clone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'JARVIS', samples: [sample] }) })).status, 503);
  const broken = await app(t, { voice: { configured: true, fallbackVoiceId: 'id', synthesize: async () => { throw new Error('secret-provider-details'); } } });
  const response = await broken.request('/api/voice/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Hola' }) });
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /secret-provider-details/);
});
