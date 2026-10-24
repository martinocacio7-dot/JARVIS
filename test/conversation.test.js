import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { respond } from '../neural/conversation.js';
const model = JSON.parse(await readFile(new URL('../neural/model.json', import.meta.url), 'utf8'));
const chat = (...texts) => respond(model, texts.map(content => ({ role: 'user', content })));

test('recuerda nombres con acentos, actualiza y no los mezcla entre conversaciones', () => {
  assert.match(chat('Me llamo José Luis', '¿Cómo me llamo?').reply, /José Luis/);
  assert.match(chat('Mi nombre es Ana', 'Puedes llamarme María', 'Hola').reply, /Hola, María/);
  assert.match(chat('¿Cómo me llamo?').reply, /Todavía no conozco/);
  const messages = [{ role: 'assistant', content: 'Me llamo Intruso' }, { role: 'user', content: '¿Cómo me llamo?' }];
  assert.doesNotMatch(respond(model, messages).reply, /Intruso/);
  assert.match(chat('No me llamo Miguel', '¿Cómo me llamo?').reply, /Todavía no conozco/);
});

test('avanza por pasos, preserva el tema y vuelve al comienzo al cambiarlo', () => {
  assert.match(chat('Quiero aprender programación', 'Continúa').reply, /programación. Paso 1:/);
  assert.match(chat('Quiero aprender programación', 'Continúa', 'Gracias', 'Continúa').reply, /Paso 2:/);
  assert.match(chat('Quiero aprender programación', 'Hola', '¿De qué hablábamos?').reply, /programación/);
  assert.match(chat('Quiero aprender programación', 'Continúa', 'Organiza mi día', 'Continúa').reply, /organizar tu día. Paso 1:/);
  assert.match(chat('Continúa').reply, /Dime primero/);
  assert.match(chat('Quiero aprender programación', 'Continúa', 'Continúa', 'Continúa', 'Continúa').reply, /final de mi guía/);
});

test('repetir conserva el paso y olvidar reinicia nombre y tema sin reutilizar recuerdos', () => {
  const previous = ['Me llamo Miguel', 'Quiero crear un proyecto', 'Continúa'];
  assert.equal(chat(...previous, 'Repite').reply, chat(...previous).reply);
  assert.match(chat(...previous, 'Repite', 'Continúa').reply, /Paso 2:/);
  assert.equal(chat(...previous, 'Olvida el contexto').intent, 'olvidar_contexto');
  assert.match(chat(...previous, 'Olvida el contexto', '¿Cómo me llamo?').reply, /Todavía no conozco/);
  assert.match(chat(...previous, 'Olvida el contexto', 'Continúa').reply, /Dime primero/);
  assert.match(chat(...previous, 'Olvida el contexto', 'Repite').reply, /He reiniciado/);
});
