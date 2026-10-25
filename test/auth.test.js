import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { createAuth } from '../auth.js';

const password = 'test-password-local-only';
const credentials = (user, pass) => `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

test('producción falla de forma cerrada sin contraseña o con una demasiado corta', () => {
  assert.throws(() => createAuth({ production: true, password: '' }), /JARVIS_PASSWORD/);
  assert.throws(() => createAuth({ production: true, password: '123' }), /16 caracteres/);
});

async function app(t, extra = {}) {
  const server = createServer({ apiKey: '', auth: { production: true, username: 'jarvis', password, ...extra } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return (path, options = {}) => fetch(base + path, options);
}

test('protege página, recursos y API antes de leer mensajes o devolver contenido', async t => {
  const request = await app(t);
  for (const path of ['/', '/app.js', '/style.css', '/library-ui.js', '/project-ui.js', '/feedback-ui.js', '/api/feedback', '/api/status', '/api/chat', '/api/library', '/api/knowledge', '/api/develop']) {
    const response = await request(path);
    assert.equal(response.status, 401, path);
    assert.match(response.headers.get('www-authenticate'), /Basic/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  }
  for (const authorization of [credentials('intruso', password), credentials('jarvis', 'incorrecta'), 'Bearer invalid', 'Basic !!!']) {
    assert.equal((await request('/', { headers: { authorization } })).status, 401);
  }
  const headers = { authorization: credentials('jarvis', password), 'Content-Type': 'application/json' };
  assert.equal((await request('/', { headers })).status, 200);
  const response = await request('/api/chat', { method: 'POST', headers, body: JSON.stringify({ messages: [{ role: 'user', content: 'Hola' }] }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).intent, 'saludo');
});

test('limita intentos incorrectos y permite entrar tras expirar el bloqueo', async t => {
  let clock = 0;
  const request = await app(t, { now: () => clock });
  for (let i = 0; i < 10; i++) assert.equal((await request('/', { headers: { authorization: credentials('jarvis', 'incorrecta') } })).status, 401);
  const locked = await request('/');
  assert.equal(locked.status, 429);
  assert.equal(locked.headers.get('retry-after'), '60');
  clock = 60001;
  assert.equal((await request('/', { headers: { authorization: credentials('jarvis', password) } })).status, 200);
});
