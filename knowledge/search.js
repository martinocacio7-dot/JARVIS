import { normalize, validateLibrary } from '../public/library-data.js';

const stopWords = new Set('a al algo cual cuales como con de del dime donde el en es esa ese eso esta este explicame hay la las lo los me mi mis para por que quien se segun son sobre su sus tu tus un una unos unas y documento documentos apuntes biblioteca'.split(' '));
const terms = text => normalize(text).split(' ').filter(word => word.length > 1 && !stopWords.has(word));

// Recuperación léxica BM25, escrita para JARVIS. No usa embeddings, modelos
// externos ni generación de texto: devuelve únicamente extractos del documento.
export function searchLibrary(query, input) {
  if (typeof query !== 'string' || !query.trim() || query.length > 8000) throw new Error('Escribe una pregunta de hasta 8000 caracteres.');
  const library = validateLibrary(input);
  const correction = library.corrections.find(c => normalize(c.question) === normalize(query));
  if (correction) return { mode: 'knowledge', found: true, kind: 'correction', sources: [], reply: `Respuesta que tú enseñaste (sin verificación externa):\n\n${correction.answer}` };
  const queryTerms = [...new Set(terms(query))];
  const passages = library.documents.flatMap(doc => {
    // Ventanas con solapamiento para no perder palabras al cruzar un límite.
    const words = doc.content.trim().split(/\s+/u);
    const parts = [];
    for (let start = 0; start < words.length; start += 90) {
      const text = words.slice(start, start + 120).join(' ');
      const tokens = terms(`${doc.title} ${text}`);
      const counts = new Map();
      for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
      parts.push({ id: doc.id, title: doc.title, text, counts, length: tokens.length, passage: parts.length + 1 });
      if (start + 120 >= words.length) break;
    }
    return parts;
  });
  const average = passages.reduce((n, p) => n + p.length, 0) / (passages.length || 1);
  const frequencies = new Map(queryTerms.map(term => [term, passages.filter(p => p.counts.has(term)).length]));
  const ranked = passages.map(p => {
    let score = 0;
    let matched = 0;
    for (const term of queryTerms) {
      const count = p.counts.get(term) || 0;
      if (!count) continue;
      matched++;
      const idf = Math.log(1 + (passages.length - frequencies.get(term) + 0.5) / (frequencies.get(term) + 0.5));
      score += idf * count * 2.2 / (count + 1.2 * (0.25 + 0.75 * p.length / (average || 1)));
    }
    return { ...p, score, matched };
  }).filter(p => p.matched && p.matched / queryTerms.length >= 0.5).sort((a, b) => b.score - a.score).slice(0, 3);
  if (!ranked.length) return { mode: 'knowledge', found: false, kind: 'not_found', sources: [], reply: 'No encontré información suficiente en tu biblioteca para esa pregunta. Prueba palabras que aparezcan en tus apuntes, añade un documento o enséñame una respuesta. No consulté Internet ni otras IA.' };
  const sources = ranked.map(({ id, title, text, passage }) => ({ documentId: id, title, passage, excerpt: text }));
  return { mode: 'knowledge', found: true, kind: 'extracts', sources, reply: `Encontré estos fragmentos en tus documentos. Son coincidencias de palabras, no una respuesta verificada:\n\n${sources.map((source, i) => `[${i + 1}] ${source.title} · fragmento ${source.passage}\n«${source.excerpt}»`).join('\n\n')}\n\nFuente: archivos que cargaste tú. No he comprobado sus afirmaciones con fuentes externas.` };
}
