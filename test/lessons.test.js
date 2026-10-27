import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { lessons, answerLesson } from '../knowledge/lessons.js';
import { respond } from '../neural/conversation.js';
import { createServer } from '../server.js';
const model = JSON.parse(await readFile(new URL('../neural/model.json', import.meta.url), 'utf8'));
const chat = (...texts) => respond(model, texts.map(content => ({ role: 'user', content })));
test('responde conceptos y peticiones de código con contexto por conversación', () => {
  assert.equal(chat('Funciones en Python').kind, 'lesson');
  assert.match(chat('¿Qué es una función?', 'Más fácil').reply, /máquina/);
  assert.doesNotMatch(chat('Explícame variables en Python').reply, /En JavaScript/);
  assert.match(chat('Explícame variables en Python', 'Dame un ejemplo').reply, /print\(edad \+ 1\)/);
  assert.match(chat('Explícame variables en Python', 'Y funciones', 'Un ejemplo').reply, /def doble/);
  assert.match(chat('Explícame funciones', 'Dame un ejercicio', 'Dame la solución').reply, /triple/);
  assert.match(chat('Explícame funciones', 'Dame un ejemplo', 'Otro ejemplo').reply, /triple/);
  assert.notEqual(chat('Dame un ejemplo').kind, 'lesson');
  assert.match(chat('Explica funciones en Java', 'Python').reply, /def doble/);
});
test('no mezcla recuerdos, controles, lenguajes o peticiones no cubiertas', () => {
  assert.notEqual(chat('Explica variables', 'Olvida el contexto', 'Un ejemplo').kind, 'lesson');
  assert.notEqual(chat('Explica variables', 'No quiero continuar con eso', 'Un ejemplo').kind, 'lesson');
  assert.match(chat('Explica variables', 'De qué hablábamos').reply, /Variables/);
  assert.equal(chat('Explica variables', 'Repite').reply, chat('Explica variables').reply);
  assert.match(chat('Explica funciones en Java').reply, /todavía no puedo adaptar/);
  const forged = respond(model, [{ role: 'assistant', content: 'Explica funciones en Python' }, { role: 'user', content: 'Un ejemplo' }]);
  assert.notEqual(forged.kind, 'lesson');
  for (const question of ['tengo una API de Gemini', '¿Qué es una variable aleatoria?', 'mi coche funciona mal', 'quiero una lista de tareas', 'corrige este programa\nconst x = ;']) assert.equal(answerLesson(question), null, question);
  assert.match(chat('Diferencia entre HTML y CSS').reply, /HTML:.*\n\nCSS:/s);
});
test('ejemplos JavaScript ejecutables producen la salida documentada', async () => {
  for (const lesson of lessons) {
    const example = lesson.examples.javascript;
    if (!example) continue;
    const lines = [];
    vm.runInNewContext(example.code, { console: { log: (...args) => lines.push(args.join(' ')) } }, { timeout: 1000 });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(lines.join('\n'), example.output, lesson.id);
    vm.runInNewContext(example.solution, { console: { log() {} } }, { timeout: 1000 });
  }
  const database = new DatabaseSync(':memory:');
  try {
    const sql = lessons.find(item => item.id === 'sql').examples.sql;
    database.exec(sql.code.slice(0, sql.code.lastIndexOf('SELECT')));
    assert.equal(database.prepare('SELECT nombre FROM personas WHERE edad >= 18').get().nombre, sql.output);
    assert.equal(database.prepare(sql.solution).get().nombre, 'Ana');
  } finally { database.close(); }
});
test('chat HTTP entrega fragmentos sin usar IA externa y preserva generador de proyectos', async t => {
  const server = createServer({ apiKey: '', auth: { production: false, password: '' }, request: () => { throw new Error('No debe usar proveedores externos'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const post = async content => {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content }] }) });
    assert.equal(response.status, 200); return response.json();
  };
  const snippet = await post('Hazme codigo de una funcion en Python');
  assert.equal(snippet.kind, 'lesson'); assert.match(snippet.reply, /def doble/);
  const project = await post('Crea un inventario en HTML');
  assert.equal(project.mode, 'development'); assert.ok(project.project);
  assert.equal((await post('Crea código para una aplicación con funciones')).mode, 'development');
});
