import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchLibrary } from '../knowledge/search.js';
import { validateLibrary } from '../public/library-data.js';

const library = {
  version: 1,
  documents: [
    { id: 'variables', title: 'Variables en JavaScript', content: 'Una variable guarda un valor. JavaScript permite declarar variables con let o const.' },
    { id: 'redes', title: 'Redes informáticas', content: 'Un router conecta redes y dirige paquetes. Una dirección IP identifica una interfaz de red.' }
  ],
  corrections: [{ question: '¿Qué estudio?', answer: 'Estudias informática.' }]
};
test('recupera extractos con su documento y no atribuye verificación externa', () => {
  const result = searchLibrary('¿Qué guarda una variable?', library);
  assert.equal(result.found, true);
  assert.equal(result.kind, 'extracts');
  assert.equal(result.sources[0].documentId, 'variables');
  assert.ok(library.documents[0].content.includes(result.sources[0].excerpt));
  assert.match(result.reply, /no una respuesta verificada/);
  assert.ok(!result.sources.some(source => source.documentId === 'redes'));
});
test('no inventa respuestas sin evidencia y aplica correcciones solo a la pregunta enseñada', () => {
  assert.equal(searchLibrary('¿Qué es la termodinámica cuántica?', library).found, false);
  assert.equal(searchLibrary('hola', { version: 1, documents: [], corrections: [] }).found, false);
  const result = searchLibrary('que estudio', library);
  assert.equal(result.kind, 'correction');
  assert.match(result.reply, /Estudias informática/);
  assert.match(result.reply, /sin verificación externa/);
  assert.equal(searchLibrary('¿Qué estudia Miguel?', library).kind, 'not_found');
});
test('limita documentos, rechaza duplicados y valida respuestas enseñadas', () => {
  assert.throws(() => validateLibrary(null));
  assert.throws(() => validateLibrary({ ...library, documents: [library.documents[0], library.documents[0]] }));
  assert.throws(() => validateLibrary({ ...library, documents: [{ id: 'x', title: 'x', content: 'a'.repeat(20001) }] }));
  assert.throws(() => validateLibrary({ ...library, corrections: [{ question: '???', answer: 'x' }] }));
  assert.throws(() => validateLibrary({ ...library, corrections: [{ question: 'Pregunta', answer: '\u0000' }] }));
  assert.throws(() => searchLibrary(' ', library));
});
