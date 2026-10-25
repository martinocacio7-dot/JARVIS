import http from 'node:http';
import { readFileSync } from 'node:fs';
import { respond } from './neural/conversation.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createAuth } from './auth.js';
import { searchLibrary } from './knowledge/search.js';
import { createLibraryDatabase, RevisionConflict } from './knowledge/database.js';
import { validateLibrary } from './public/library-data.js';
import { develop, isDevelopmentRequest } from './developer/generator.js';

const localModel = JSON.parse(readFileSync(new URL('./neural/model.json', import.meta.url), 'utf8'));

const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/project-ui.js': ['project-ui.js', 'text/javascript'], '/library-data.js': ['library-data.js', 'text/javascript'], '/library-store.js': ['library-store.js', 'text/javascript'], '/library-ui.js': ['library-ui.js', 'text/javascript'] };
const instruction = 'Eres JARVIS, un asistente personal útil, claro y honesto. Responde en español salvo que te pidan otro idioma. Explica tus límites. No afirmes haber realizado acciones que no puedes ejecutar.';

export function createServer({ apiKey = process.env.JARVIS_API_KEY, model = process.env.JARVIS_MODEL || 'gpt-4.1-mini', request = fetch, auth, database = createLibraryDatabase() } = {}) {
  const authorize = createAuth(auth);
  const server = http.createServer(async (req, res) => {
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    if (!authorize(req, res)) return;
    if (req.method === 'GET' && req.url === '/api/status') return json(200, { mode: apiKey ? 'ai' : 'local', model: apiKey ? model : localModel.architecture, neural: { version: localModel.version, hiddenSize: localModel.hiddenSize, intents: localModel.intents.length, examples: localModel.training.examples } });
    if (req.method === 'GET' && req.url === '/api/library') {
      try { return json(200, await database.read()); }
      catch { return json(503, { error: database.kind === 'unconfigured' ? 'Configura DATABASE_URL en Render para activar la biblioteca persistente.' : 'No se pudo acceder a la base de datos. Vuelve a intentarlo.' }); }
    }
    if ((req.method === 'POST' && ['/api/chat', '/api/knowledge', '/api/develop'].includes(req.url)) || (req.method === 'PUT' && req.url === '/api/library')) {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(403, { error: 'Origen no permitido.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Se requiere JSON.' });
      try {
        let body = '';
        let size = 0;
        const limit = req.url === '/api/library' ? 1048576 : 65536;
        req.setEncoding('utf8');
        for await (const chunk of req) {
          body += chunk;
          size += Buffer.byteLength(chunk);
          if (size > limit) return json(413, { error: 'La petición es demasiado larga. Reduce los datos enviados.' });
        }
        let data;
        try { data = JSON.parse(body); } catch { return json(400, { error: 'JSON inválido.' }); }
        if (req.url === '/api/develop') {
          try { return json(200, develop(data?.prompt)); }
          catch (error) { return json(400, { error: error.message }); }
        }
        if (req.url === '/api/library') {
          let library;
          try {
            library = validateLibrary(data?.library);
            if (!Number.isSafeInteger(data?.expectedRevision) || data.expectedRevision < 0) throw new Error('La revisión no es válida.');
          } catch (error) { return json(400, { error: error.message }); }
          try { return json(200, await database.write(library, data.expectedRevision)); }
          catch (error) { return json(error instanceof RevisionConflict ? 409 : 503, { error: error instanceof RevisionConflict ? error.message : 'No se pudo guardar en la base de datos. Tus cambios no fueron confirmados.' }); }
        }
        if (req.url === '/api/knowledge') {
          if (typeof data?.query !== 'string' || !data.query.trim() || data.query.length > 8000) return json(400, { error: 'Escribe una pregunta de hasta 8000 caracteres.' });
          try { return json(200, searchLibrary(data.query, (await database.read()).library)); }
          catch { return json(503, { error: 'No se pudo consultar la biblioteca en la base de datos.' }); }
        }
        const messages = data?.messages;
        if (!Array.isArray(messages) || !messages.length || messages.length > 40 || messages.some(m => !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 8000) || messages.at(-1).role !== 'user') return json(400, { error: 'Envía entre 1 y 40 mensajes válidos de hasta 8000 caracteres.' });
        if (isDevelopmentRequest(messages.at(-1).content)) return json(200, develop(messages.at(-1).content));
        if (!apiKey) return json(200, { mode: 'local', ...respond(localModel, messages) });
        const upstream = await request('https://api.openai.com/v1/responses', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, instructions: instruction, input: messages.map(({ role, content }) => ({ role, content })), max_output_tokens: 1500, store: false }),
          signal: AbortSignal.timeout(45000)
        });
        if (!upstream.ok) return json(502, { error: 'El proveedor de IA no pudo responder. Revisa la clave, el modelo y el saldo de tu cuenta.' });
        const result = await upstream.json();
        const reply = result.output?.flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n');
        if (!reply) return json(502, { error: 'El modelo no devolvió una respuesta de texto.' });
        return json(200, { mode: 'ai', reply });
      } catch { return json(502, { error: 'No se pudo conectar con la IA. Inténtalo de nuevo.' }); }
    }
    if (req.method === 'GET' && files[req.url]) {
      const [file, type] = files[req.url];
      try { const data = await readFile(new URL(`./public/${file}`, import.meta.url)); res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); return res.end(data); }
      catch { return json(500, { error: 'No se pudo cargar la aplicación.' }); }
    }
    json(404, { error: 'Ruta no encontrada.' });
  });
  server.on('close', () => { database.close().catch(() => {}); });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer();
  server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`JARVIS iniciado en puerto ${server.address().port}`));
}
