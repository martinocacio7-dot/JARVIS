import http from 'node:http';
import { readFileSync } from 'node:fs';
import { respond } from './neural/conversation.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const localModel = JSON.parse(readFileSync(new URL('./neural/model.json', import.meta.url), 'utf8'));

const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
const instruction = 'Eres JARVIS, un asistente personal útil, claro y honesto. Responde en español salvo que te pidan otro idioma. Explica tus límites. No afirmes haber realizado acciones que no puedes ejecutar.';

export function createServer({ apiKey = process.env.JARVIS_API_KEY, model = process.env.JARVIS_MODEL || 'gpt-4.1-mini', request = fetch } = {}) {
  return http.createServer(async (req, res) => {
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    if (req.method === 'GET' && req.url === '/api/status') return json(200, { mode: apiKey ? 'ai' : 'local', model: apiKey ? model : localModel.architecture });
    if (req.method === 'POST' && req.url === '/api/chat') {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(403, { error: 'Origen no permitido.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Se requiere JSON.' });
      try {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 65536) return json(413, { error: 'La conversación es demasiado larga. Inicia una nueva.' });
        }
        let data;
        try { data = JSON.parse(body); } catch { return json(400, { error: 'JSON inválido.' }); }
        const messages = data?.messages;
        if (!Array.isArray(messages) || !messages.length || messages.length > 40 || messages.some(m => !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 8000) || messages.at(-1).role !== 'user') return json(400, { error: 'Envía entre 1 y 40 mensajes válidos de hasta 8000 caracteres.' });
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
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer();
  server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`JARVIS iniciado en puerto ${server.address().port}`));
}
