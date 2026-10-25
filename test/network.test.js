import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { train, predict } from '../neural/network.js';
const intents = JSON.parse(await readFile(new URL('../neural/intents.json', import.meta.url), 'utf8'));
const evaluation = JSON.parse(await readFile(new URL('../neural/evaluation.json', import.meta.url), 'utf8'));
let trained;
const trainedModel = () => trained ??= train(intents);
test('el modelo guardado reconoce frases reservadas y rechaza consultas fuera de alcance', async () => {
  const model = JSON.parse(await readFile(new URL('../neural/model.json', import.meta.url), 'utf8'));
  const training = new Set(intents.flatMap(intent => intent.examples));
  for (const { text, intent } of evaluation) {
    assert.ok(!training.has(text), 'La evaluación no debe reutilizar una frase de entrenamiento');
    assert.equal(predict(model, text).intent, intent, text);
  }
});
test('aprende los ejemplos y conserva predicciones al serializar', () => {
  const model = JSON.parse(JSON.stringify(trainedModel()));
  assert.equal(model.version, 3);
  assert.equal(model.hiddenSize, 32);
  assert.ok(model.training.finalLoss < model.training.initialLoss / 10);
  for (const intent of intents) for (const text of intent.examples) assert.equal(predict(model, text).intent, intent.id, text);
});
test('clasifica combinaciones no usadas al entrenar y rechaza texto desconocido', () => {
  const model = trainedModel();
  for (const [text, intent] of [['¡Hola, JARVIS!', 'saludo'], ['muchas muchas gracias', 'gracias'], ['adiós, hasta luego', 'despedida']]) assert.equal(predict(model, text).intent, intent);
  for (const text of ['', 'xyz123', 'explica termodinamica cuantica', 'hola calcula integrales complejas desconocidas']) assert.equal(predict(model, text).intent, 'desconocido');
});
test('clasifica nuevas capacidades y algunas erratas sin aceptar consultas ajenas', () => {
  const model = trainedModel();
  for (const [text, intent] of [['quiero aprender programasion', 'programacion'], ['graciass por tu ayuda', 'gracias'], ['quiero organizar mis tareass', 'organizacion'], ['como consulto mis propios apuntes', 'biblioteca'], ['que recuerdas de esta conversacion', 'memoria'], ['cuales son tus limitaciones actuales', 'limites']]) assert.equal(predict(model, text).intent, intent, text);
  assert.equal(predict(model, 'quiero continuar con eso').intent, 'continuar');
  assert.equal(predict(model, 'no quiero continuar con eso').intent, 'cancelar');
  const uncertain = predict(model, 'programacion proyecto');
  assert.equal(uncertain.intent, 'desconocido');
  assert.ok(uncertain.suggestions.includes('quiero aprender programacion'));
});
test('el entrenamiento valida entradas y es reproducible con una semilla fija', () => {
  const small = [{ id: 'hola', reply: 'hola', examples: ['hola amigo', 'buen dia'] }, { id: 'adios', reply: 'adios', examples: ['hasta luego', 'adios amigo'] }];
  assert.deepEqual(train(small, 10), train(small, 10));
  assert.throws(() => train(small, 0));
  assert.throws(() => train([null]));
});
test('los conjuntos nuevos están separados del entrenamiento y el modelo mantiene el rechazo', async () => {
  const data = JSON.parse(await readFile(new URL('../neural/generalization.json', import.meta.url), 'utf8'));
  const model = JSON.parse(await readFile(new URL('../neural/model.json', import.meta.url), 'utf8'));
  const normalize = text => tokenizeForTest(text);
  const training = new Set(intents.flatMap(i => i.examples.map(normalize)));
  const development = new Set(data.development.map(c => normalize(c.text)));
  for (const row of [...data.development, ...data.test]) assert.ok(!training.has(normalize(row.text)), row.text);
  for (const row of data.test) assert.ok(!development.has(normalize(row.text)), row.text);
  const correct = rows => rows.filter(row => predict(model, row.text).intent === row.intent).length;
  assert.ok(correct(data.development) >= 45);
  assert.ok(correct(data.test) >= 40);
  for (const row of data.test.filter(row => row.intent === 'desconocido')) assert.equal(predict(model, row.text).intent, 'desconocido', row.text);
});
function tokenizeForTest(text) { return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
test('corrige duplicaciones y transposiciones sin sustituir palabras válidas', () => {
  const model = trainedModel();
  for (const [text, intent] of [['continuaa por favor', 'continuar'], ['repitee eso por favor', 'repetir'], ['quiero aprender progarmacion', 'programacion']]) assert.equal(predict(model, text).intent, intent, text);
  assert.equal(predict(model, 'quiero continuar con eso').intent, 'continuar');
  assert.equal(predict(model, 'no quiero continuar con eso').intent, 'cancelar');
});
