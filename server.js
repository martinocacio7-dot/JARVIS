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
import { validateFeedback } from './public/feedback-data.js';
import { validateDocument, isDocumentRequest } from './public/document-data.js';
import { validateTasks } from './public/task-data.js';
import { parseTaskCommand, executeTaskCommand } from './assistant/commands.js';
import { createVoiceService } from './voice/elevenlabs.js';

const localModel = JSON.parse(readFileSync(new URL('./neural/model.json', import.meta.url), 'utf8'));

const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/voice-profile.js': ['voice-profile.js', 'text/javascript'], '/mobile.js': ['mobile.js', 'text/javascript'], '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'], '/sw.js': ['sw.js', 'text/javascript'], '/icons/jarvis-180.png': ['icons/jarvis-180.png', 'image/png'], '/icons/jarvis-192.png': ['icons/jarvis-192.png', 'image/png'], '/icons/jarvis-512.png': ['icons/jarvis-512.png', 'image/png'], '/task-data.js': ['task-data.js', 'text/javascript'], '/task-ui.js': ['task-ui.js', 'text/javascript'], '/voice.js': ['voice.js', 'text/javascript'], '/document-data.js': ['document-data.js', 'text/javascript'], '/document-ui.js': ['document-ui.js', 'text/javascript'], '/feedback-data.js': ['feedback-data.js', 'text/javascript'], '/feedback-ui.js': ['feedback-ui.js', 'text/javascript'], '/project-ui.js': ['project-ui.js', 'text/javascript'], '/library-data.js': ['library-data.js', 'text/javascript'], '/library-store.js': ['library-store.js', 'text/javascript'], '/library-ui.js': ['library-ui.js', 'text/javascript'] };
const publicInstallAssets = new Set(['/manifest.webmanifest', '/sw.js', '/icons/jarvis-180.png', '/icons/jarvis-192.png', '/icons/jarvis-512.png']);
const instruction = 'Eres JARVIS, un asistente personal útil, claro y honesto. Responde en español salvo que te pidan otro idioma. Explica tus límites. No afirmes haber realizado acciones que no puedes ejecutar.';

export function createServer({ apiKey = process.env.JARVIS_API_KEY, model = process.env.JARVIS_MODEL || 'gpt-4.1-mini', request = fetch, auth, database = createLibraryDatabase(), now = () => new Date(), voice = createVoiceService() } = {}) {
  const authorize = createAuth(auth);
  let cloning = false;
  const server = http.createServer(async (req, res) => {
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'");
    if (!(req.method === 'GET' && publicInstallAssets.has(req.url)) && !authorize(req, res)) return;
    if (req.method === 'GET' && req.url === '/api/voice') {
      if (!voice.configured) return json(200, { keyConfigured: false, ready: false, canClone: false });
      try { const saved = await database.readVoice(); return json(200, { keyConfigured: true, ready: Boolean(saved.voice.voiceId || voice.fallbackVoiceId), canClone: true, name: saved.voice.name || 'Voz personal' }); }
      catch { return json(200, { keyConfigured: true, ready: Boolean(voice.fallbackVoiceId), canClone: false, name: 'Voz personal', needsDatabase: true }); }
    }
    if (req.method === 'GET' && req.url === '/api/tasks') {
      try { return json(200, await database.readTasks()); }
      catch { return json(503, { error: 'Configura o revisa DATABASE_URL en Render para guardar tus pendientes.' }); }
    }
    if (req.method === 'GET' && req.url === '/api/feedback') {
      try { return json(200, { ...await database.readFeedback(), intents: localModel.intents.map(({ id, example }) => ({ id, example })) }); }
      catch { return json(503, { error: 'Configura o revisa DATABASE_URL en Render para guardar correcciones en PostgreSQL.' }); }
    }
    if (req.method === 'GET' && req.url === '/api/status') return json(200, { mode: apiKey ? 'ai' : 'local', model: apiKey ? model : localModel.architecture, neural: { version: localModel.version, hiddenSize: localModel.hiddenSize, intents: localModel.intents.length, examples: localModel.training.examples } });
    if (req.method === 'GET' && req.url === '/api/library') {
      try { return json(200, await database.read()); }
      catch { return json(503, { error: database.kind === 'unconfigured' ? 'Configura DATABASE_URL en Render para activar la biblioteca persistente.' : 'No se pudo acceder a la base de datos. Vuelve a intentarlo.' }); }
    }
    if ((req.method === 'POST' && ['/api/chat', '/api/knowledge', '/api/develop', '/api/documents', '/api/voice/clone', '/api/voice/speak'].includes(req.url)) || (req.method === 'PUT' && ['/api/library', '/api/feedback', '/api/tasks'].includes(req.url))) {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(403, { error: 'Origen no permitido.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Se requiere JSON.' });
      try {
        let body = '';
        let size = 0;
        const limit = req.url === '/api/voice/clone' ? 3000000 : ['/api/library', '/api/feedback', '/api/tasks'].includes(req.url) ? 1048576 : req.url === '/api/documents' ? 131072 : 65536;
        req.setEncoding('utf8');
        for await (const chunk of req) {
          body += chunk;
          size += Buffer.byteLength(chunk);
          if (size > limit) return json(413, { error: 'La petición es demasiado larga. Reduce los datos enviados.' });
        }
        let data;
        try { data = JSON.parse(body); } catch { return json(400, { error: 'JSON inválido.' }); }
        if (req.url === '/api/voice/clone') {
          if (!voice.configured) return json(503, { error: 'Configura ELEVENLABS_API_KEY en Render. No se enviaron muestras al proveedor.' });
          if (cloning) return json(409, { error: 'Ya se está creando una voz. Espera antes de intentarlo otra vez.' });
          cloning = true;
          try {
            const before = await database.readVoice();
            const created = await voice.clone(data);
            try { await database.writeVoice(created, before.revision); }
            catch { return json(202, { voiceId: created.voiceId, error: 'La voz se creó en ElevenLabs, pero no se confirmó en la base de datos. No vuelvas a crearla: guarda este identificador como ELEVENLABS_VOICE_ID en Render.' }); }
            return json(200, { ready: true, name: created.name });
          } catch (error) { return json(error instanceof TypeError ? 400 : 502, { error: error instanceof TypeError ? error.message : 'No se confirmó la creación. Revisa la conexión de base de datos, la clave, las voces de tu cuenta y el plan de ElevenLabs antes de reintentar.' }); }
          finally { cloning = false; }
        }
        if (req.url === '/api/voice/speak') {
          if (typeof data?.text !== 'string' || !data.text.trim() || data.text.length > 4000) return json(400, { error: 'Escribe entre 1 y 4000 caracteres para la voz.' });
          if (!voice.configured) return json(503, { error: 'Falta configurar ELEVENLABS_API_KEY.' });
          try {
            let id;
            try { id = (await database.readVoice()).voice.voiceId; } catch { /* Una voz configurada puede funcionar sin base de datos. */ }
            id ||= voice.fallbackVoiceId;
            const audio = await voice.synthesize(data.text, id);
            res.writeHead(200, { 'Content-Type': audio.type, 'Cache-Control': 'no-store' }); return res.end(audio.buffer);
          } catch { return json(502, { error: 'No se pudo generar la voz. Revisa la voz creada, la clave, la conexión y tu cuota de ElevenLabs.' }); }
        }
        if (req.url === '/api/tasks') {
          let items;
          try { items = validateTasks(data?.items); if (!Number.isSafeInteger(data.expectedRevision) || data.expectedRevision < 0) throw new Error('Revisión inválida.'); }
          catch (error) { return json(400, { error: error.message }); }
          try { return json(200, await database.writeTasks(items, data.expectedRevision)); }
          catch (error) { return json(error instanceof RevisionConflict ? 409 : 503, { error: error instanceof RevisionConflict ? error.message : 'No se pudieron guardar tus pendientes.' }); }
        }
        if (req.url === '/api/documents') {
          let validated;
          try { validated = validateDocument(data); } catch (error) { return json(400, { error: error.message }); }
          try {
            const { generateDocument } = await import('./documents/generator.js');
            const result = await generateDocument(validated);
            res.writeHead(200, { 'Content-Type': result.mime, 'Content-Disposition': `attachment; filename="${result.filename}"`, 'Cache-Control': 'no-store' });
            return res.end(result.buffer);
          } catch { return json(500, { error: 'No se pudo preparar el archivo. Revisa el contenido e inténtalo de nuevo.' }); }
        }
        if (req.url === '/api/feedback') {
          let feedback;
          try {
            feedback = validateFeedback(data?.feedback, localModel.intents.map(intent => intent.id));
            if (!Number.isSafeInteger(data.expectedRevision) || data.expectedRevision < 0) throw new Error('Revisión inválida.');
          } catch (error) { return json(400, { error: error.message }); }
          try { return json(200, await database.writeFeedback(feedback, data.expectedRevision)); }
          catch (error) { return json(error instanceof RevisionConflict ? 409 : 503, { error: error instanceof RevisionConflict ? error.message : 'No se pudieron guardar las correcciones. Revisa la base de datos.' }); }
        }
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
        const command = parseTaskCommand(messages.at(-1).content, now());
        if (command) {
          try { return json(200, await executeTaskCommand(command, database, now())); }
          catch (error) { return json(error instanceof RevisionConflict ? 409 : 503, { error: error instanceof RevisionConflict ? error.message : 'No pude guardar o consultar el pendiente. Revisa la conexión a la base de datos y el límite de 200 pendientes; no asumas que quedó guardado.' }); }
        }
        if (isDocumentRequest(messages.at(-1).content)) return json(200, { mode: 'local', intent: 'documentos', documentDraft: true, reply: 'Puedo preparar Word, PDF, PowerPoint y Excel con el contenido que proporciones. Para informes uso formato base APA 7 estudiantil y texto negro. Abre «Preparar mi documento» y completa título, autor, texto y fuentes reales. No investigo ni redacto un informe completo a partir de un título.' });
        if (isDevelopmentRequest(messages.at(-1).content)) return json(200, develop(messages.at(-1).content));
        if (!apiKey) {
          const result = respond(localModel, messages);
          return json(200, { mode: 'local', ...result, ...(result.intent === 'documentos' ? { documentDraft: true } : {}) });
        }
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
      try { const data = await readFile(new URL(`./public/${file}`, import.meta.url)); res.writeHead(200, { 'Content-Type': type.startsWith('image/') ? type : `${type}; charset=utf-8`, 'Cache-Control': 'no-store' }); return res.end(data); }
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
