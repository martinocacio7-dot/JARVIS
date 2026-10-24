export const limits = { documents: 10, documentLength: 20000, totalLength: 60000, corrections: 20, questionLength: 500, answerLength: 2000 };
export const normalize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function validateLibrary(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.documents) || !Array.isArray(value.corrections)) throw new Error('La biblioteca debe tener formato JARVIS, versión 1.');
  const { documents, corrections } = value;
  const textValues = [...documents.flatMap(d => d ? [d.id, d.title, d.content] : []), ...corrections.flatMap(c => c ? [c.question, c.answer] : [])];
  if (textValues.some(text => typeof text === 'string' && text.includes('\u0000'))) throw new Error('La biblioteca debe contener texto sin caracteres NUL.');
  if (documents.length > limits.documents || documents.some(d => !d || typeof d.id !== 'string' || !d.id || d.id.length > 100 || typeof d.title !== 'string' || !d.title.trim() || d.title.length > 150 || typeof d.content !== 'string' || !d.content.trim() || d.content.length > limits.documentLength) || documents.reduce((n, d) => n + d.content.length, 0) > limits.totalLength || new Set(documents.map(d => d.id)).size !== documents.length) throw new Error('Máximo 10 documentos de 20 000 caracteres y 60 000 caracteres en total; los identificadores deben ser únicos.');
  if (corrections.length > limits.corrections || corrections.some(c => !c || typeof c.question !== 'string' || !normalize(c.question) || c.question.length > limits.questionLength || typeof c.answer !== 'string' || !c.answer.trim() || c.answer.length > limits.answerLength) || new Set(corrections.map(c => normalize(c.question))).size !== corrections.length) throw new Error('Máximo 20 correcciones únicas: pregunta de hasta 500 caracteres y respuesta de hasta 2000.');
  // Copiar solo campos admitidos; no conservar metadatos arbitrarios de un backup.
  return { version: 1, documents: documents.map(({ id, title, content }) => ({ id, title, content })), corrections: corrections.map(({ question, answer }) => ({ question, answer })) };
}
