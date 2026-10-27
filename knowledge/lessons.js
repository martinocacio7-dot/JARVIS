import { readFileSync } from 'node:fs';
import { normalize } from '../public/library-data.js';
export const lessons = JSON.parse(readFileSync(new URL('./lessons.json', import.meta.url), 'utf8'));
const fence = String.fromCharCode(96).repeat(3);
const word = (text, alias) => (' ' + text + ' ').includes(' ' + alias + ' ');
const hasCue = text => /\b(explica|explicame|explicarme|ejemplo|ejemplos|ejercicio|ejercicios|codigo|que es|que son|como funciona|como funcionan|como uso|como usar|como se usa|que significa|que hace|muestr[a-z]*|para que|diferencia|comparar|ensen[a-z]*|aprend[a-z]*|entiend[a-z]*|entender)\b/.test(text);
const unsupportedLanguage = text => /\b(java|kotlin|swift|rust|php|ruby)\b|\bc\+\+|\bc#/i.test(text);
export function lessonTitle(state) { return lessons.find(item => item.id === state?.id)?.title || null; }
export function answerLesson(input, previous = null) {
  const text = normalize(input);
  if (/^(para|detente|cancela|no sigas|no quiero continuar|no deseo continuar|dejemos)\b/.test(text)) return null;
  // Do not interpret pasted programs or claims from assistant messages as a lesson request.
  if (input.includes(fence) || input.includes('\n') || /\b(aleatoria|estadistica|inyeccion|clave|contraseña|contrasena)\b/.test(text)) return null;
  const matches = lessons.filter(item => item.aliases.some(alias => word(text, alias)));
  const bare = text.replace(/\b(en|python|javascript|un|una|el|la|las|los)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const explicit = matches.length && (hasCue(text) || matches.some(item => (item.aliases.includes(text) || item.aliases.includes(bare))) || /^(y |ahora |sobre )/.test(text));
  const current = lessons.find(item => item.id === previous?.id);
  const follow = current && /^(?:y )?(?:python|javascript|en python|en javascript|un ejemplo|otro ejemplo|dame (?:un )?ejemplo|muestra(?:me)? (?:un )?ejemplo|dame (?:un )?ejercicio|ponme (?:un )?ejercicio|ejercicio|solucion|dame la solucion|muestra(?:me)? la solucion|mas facil|explicamelo mas facil|explica(?:lo|melo)? mejor|continua|sigue|siguiente)(?: por favor)?$/.test(text);
  if (!explicit && !follow) return null;
  if (explicit && matches.length > 1) {
    const compare = /\b(diferencia|comparar|compara)\b/.test(text);
    return {
      state: null, intent: 'programacion',
      reply: compare ? matches.map(item => item.title + ': ' + item.summary).join('\n\n') + '\n\nDime de cuál quieres un ejemplo.' : 'Puedo explicar ' + matches.map(item => item.title).join(', ') + '. ¿Con cuál empezamos?'
    };
  }
  const lesson = explicit ? matches[0] : current;
  let language = /\bpython\b/.test(text) ? 'python' : /\bjavascript\b/.test(text) ? 'javascript' : (lesson.examples[previous?.language] ? previous.language : Object.keys(lesson.examples)[0]);
  if (unsupportedLanguage(input) || !lesson.examples[language]) return {
    intent: 'programacion', state: { id: lesson.id, language: Object.keys(lesson.examples)[0], stage: 0 },
    reply: 'Para ' + lesson.title + ' tengo ejemplos revisados en ' + Object.keys(lesson.examples).join(' y ') + '. Dime cuál prefieres; todavía no puedo adaptar este ejemplo al lenguaje solicitado.'
  };
  let stage = explicit ? 0 : previous.stage;
  if (/\b(solucion)\b/.test(text)) stage = 3;
  else if (/\b(ejercicio|ejercicios)\b/.test(text)) stage = 2;
  else if (/\b(ejemplo|ejemplos|codigo)\b/.test(text) || /^(?:y )?(?:en )?(python|javascript)/.test(text)) stage = 1;
  else if (/^(continua|sigue|siguiente)/.test(text)) stage = Math.min(4, stage + 1);
  else if (/\b(facil|mejor)\b/.test(text)) stage = 0;
  const example = lesson.examples[language];
  const code = value => fence + language + '\n' + value + '\n' + fence;
  const content = stage === 0 ? (/\b(facil)\b/.test(text) ? lesson.simple : (lesson.explanation?.[language] || lesson.summary))
    : stage === 1 ? (text.includes('otro ejemplo') ? 'Otro ejemplo:\n\n' + code(example.solution) : code(example.code) + '\n\nResultado esperado:\n' + example.output)
    : stage === 2 ? 'Ejercicio en ' + language + ': ' + lesson.exercise + '\n\nPuedes pedirme «Dame la solución».'
    : stage === 3 ? 'Una solución posible:\n\n' + code(example.solution)
    : 'Terminamos la explicación, el ejemplo y el ejercicio de ' + lesson.title + '. Puedes pedir otro concepto o volver al ejemplo.';
  return {
    intent: 'programacion', state: { id: lesson.id, language, stage },
    reply: lesson.title + ' · ' + language + '\n\n' + content + (stage === 0 ? '\n\nPuedes pedir «Dame un ejemplo», «Más fácil» o «Dame un ejercicio».' : '') + '\n\nReferencia: ' + (language === 'python' ? 'https://docs.python.org/es/3/tutorial/' : lesson.reference)
  };
}
