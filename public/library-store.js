import { validateLibrary, normalize, limits } from './library-data.js';

export function createLibraryStore(request = fetch) {
  let value = { version: 1, documents: [], corrections: [] };
  let revision = 0;
  function snapshot() { return structuredClone(value); }
  async function call(options) {
    const response = await request('/api/library', options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo acceder a la biblioteca.');
    const validated = validateLibrary(data.library);
    if (!Number.isSafeInteger(data.revision) || data.revision < 0) throw new Error('Revisión de biblioteca no válida.');
    value = validated;
    revision = data.revision;
    return snapshot();
  }
  async function save(candidate) {
    const validated = validateLibrary(candidate);
    return call({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ library: validated, expectedRevision: revision }) });
  }
  return {
    snapshot,
    load() { return call(); },
    addDocument(document) { return save({ ...value, documents: [...value.documents, document] }); },
    removeDocument(id) { return save({ ...value, documents: value.documents.filter(d => d.id !== id) }); },
    teach(question, answer) {
      if (!question.trim() || !answer.trim()) throw new Error('Escribe una pregunta y una respuesta.');
      const corrections = value.corrections.filter(c => normalize(c.question) !== normalize(question));
      return save({ ...value, corrections: [...corrections, { question: question.trim(), answer: answer.trim() }] });
    },
    removeCorrection(question) { return save({ ...value, corrections: value.corrections.filter(c => normalize(c.question) !== normalize(question)) }); },
    restore(backup) { return save(backup); },
    limits
  };
}
