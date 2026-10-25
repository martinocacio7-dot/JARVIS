import { normalize } from '../public/library-data.js';

// Preparar datos no entrena ni sobrescribe los pesos. Las frases reservadas
// nunca se incorporan, para que la evaluación no se convierta en memorización.
export function prepareReviewedData(base, exported, reserved = []) {
  if (!exported || exported.version !== 1 || exported.type !== 'jarvis-intent-feedback' || !Array.isArray(exported.examples) || !exported.examples.length || exported.examples.length > 200) throw new Error('Selecciona una exportación de 1 a 200 correcciones aprobadas de JARVIS.');
  const result = structuredClone(base);
  const targets = new Map(result.map(intent => [intent.id, intent]));
  const existing = new Map();
  for (const intent of result) for (const example of intent.examples) existing.set(normalize(example), intent.id);
  const protectedPhrases = new Set(reserved.map(example => normalize(example.text)));
  let added = 0, duplicates = 0;
  for (const entry of exported.examples) {
    if (!entry || entry.reviewed !== true || typeof entry.text !== 'string' || !normalize(entry.text) || entry.text.length > 1000 || entry.text.includes('\u0000') || !targets.has(entry.intent)) throw new Error('Cada ejemplo debe estar aprobado y tener una frase y una intención válidas.');
    const key = normalize(entry.text);
    if (protectedPhrases.has(key)) throw new Error('Una frase pertenece a la evaluación reservada. No se incorporó ningún cambio.');
    if (existing.has(key)) {
      if (existing.get(key) !== entry.intent) throw new Error('Una frase ya tiene otra intención en los datos. Resuelve el conflicto antes de entrenar.');
      duplicates++; continue;
    }
    targets.get(entry.intent).examples.push(entry.text.trim()); existing.set(key, entry.intent); added++;
  }
  return { intents: result, added, duplicates };
}
