import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { train, predict } from '../neural/network.js';
const intents = JSON.parse(await readFile(new URL('../neural/intents.json', import.meta.url), 'utf8'));
const evaluation = JSON.parse(await readFile(new URL('../neural/evaluation.json', import.meta.url), 'utf8'));
test('el modelo guardado reconoce frases reservadas y rechaza consultas fuera de alcance', async () => {
  const model = JSON.parse(await readFile(new URL('../neural/model.json', import.meta.url), 'utf8'));
  const training = new Set(intents.flatMap(intent => intent.examples));
  for (const { text, intent } of evaluation) {
    assert.ok(!training.has(text), 'La evaluación no debe reutilizar una frase de entrenamiento');
    assert.equal(predict(model, text).intent, intent, text);
  }
});
test('aprende los ejemplos y conserva predicciones al serializar', () => {
  const model = JSON.parse(JSON.stringify(train(intents)));
  for (const intent of intents) for (const text of intent.examples) assert.equal(predict(model, text).intent, intent.id, text);
});
test('clasifica combinaciones no usadas al entrenar y rechaza texto desconocido', () => {
  const model = train(intents);
  for (const [text, intent] of [['¡Hola, JARVIS!', 'saludo'], ['muchas muchas gracias', 'gracias'], ['adiós, hasta luego', 'despedida']]) assert.equal(predict(model, text).intent, intent);
  for (const text of ['', 'xyz123', 'explica termodinamica cuantica', 'hola calcula integrales complejas desconocidas']) assert.equal(predict(model, text).intent, 'desconocido');
});
