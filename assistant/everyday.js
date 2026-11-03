import { readFileSync } from 'node:fs';
import { normalize } from '../public/library-data.js';
const normalizeQuestion = text => normalize(text).replace(/^jarvis /, '').replace(/ por favor$/, '').replace(/^(?:me puedes|me podrias|puedes|podrias) (?:decir|decirme|explicar|explicarme) /, '').replace(/^explicame (que es|que significa) /, '$1 ').replace(/^dime /, '');
const vocabulary = JSON.parse(readFileSync(new URL('../knowledge/vocabulary.json', import.meta.url), 'utf8'));
const otherExamples = {
  guapo: 'Otro ejemplo: «saliste muy guapa en esa foto» expresa que quien habla te encuentra atractiva en la imagen.',
  bonito: 'Otro ejemplo: «fue un bonito gesto ayudarle» valora positivamente una acción, no su apariencia.',
  elegante: 'Otro ejemplo: «resolvió el problema de forma elegante» puede elogiar una solución clara y sencilla.',
  carismatico: 'Otro ejemplo: una presentadora que logra que el público se interese y participe puede describirse como carismática.',
  humilde: 'Otro ejemplo: una persona con mucha experiencia puede ser humilde al reconocer que todavía tiene cosas que aprender.',
  empatia: 'Otro ejemplo: antes de juzgar a un compañero preocupado, escuchar sus motivos puede ayudarte a comprender su situación.',
  respeto: 'Otro ejemplo: puedes rechazar una propuesta explicando tus motivos sin insultar a quien la presentó.',
  resiliencia: 'Otro ejemplo: tras perder una oportunidad, buscar apoyo y preparar un nuevo plan puede formar parte de recuperarse.',
  play: 'Otro ejemplo: «I play guitar» significa «toco la guitarra». En este caso play no se traduce como jugar.',
  'google play': 'Otro ejemplo: una ficha de Play Store muestra información del desarrollador y valoraciones de una aplicación.',
  'play protect': 'Otro ejemplo: Play Protect puede mostrar una advertencia sobre una aplicación instalada; el motivo depende del aviso concreto.',
  aesthetic: 'Otro ejemplo: una colección de fotografías con la misma paleta de colores puede tener una estética coherente.',
  minimalismo: 'Otro ejemplo: un cartel con un mensaje breve y mucho espacio libre puede usar un diseño minimalista.',
  vintage: 'Otro ejemplo: una cámara fotográfica original de otra época puede describirse como vintage.'
};
const entries = [
  ...vocabulary.map(({ word, ...entry }) => ({ ...entry, source: 'Referencia de consulta: https://dle.rae.es/' + encodeURIComponent(word) })),
  { aliases: ['play'], title: 'Play', answer: 'En inglés, play suele significar «jugar» o «reproducir», según el contexto.', example: 'Por ejemplo, play a game es jugar a un juego; pulsar play en un vídeo significa iniciar la reproducción.', limit: 'La traducción depende de la frase: también puede referirse a tocar un instrumento o a una obra de teatro. Si me das la frase completa puedo distinguir estos usos.', source: 'Referencia de consulta: https://dictionary.cambridge.org/dictionary/english-spanish/play' },
  { aliases: ['google play', 'play store', 'google play store'], title: 'Google Play', answer: 'Google Play es la plataforma de Google para distribuir aplicaciones y otros contenidos. Play Store es la tienda de aplicaciones de Android.', example: 'Por ejemplo, buscas una aplicación en Play Store y revisas su desarrollador antes de instalarla.', limit: 'Google Play y Play Protect no son lo mismo: Play Protect es la función de seguridad que revisa aplicaciones. No puedo confirmar por qué bloqueó una app sin ver el aviso.', source: 'Referencia de consulta: https://support.google.com/googleplay/' },
  { aliases: ['play protect', 'google play protect'], title: 'Play Protect', answer: 'Google Play Protect es una función de seguridad de Android que revisa aplicaciones y puede advertir o bloquear una instalación sospechosa.', example: 'Por ejemplo, puede mostrar un aviso al instalar un APK descargado fuera de la tienda.', limit: 'Un aviso no permite determinar la causa exacta sin leerlo. Comparte el texto completo para revisarlo; no hace falta desactivar la protección.', source: 'Referencia de consulta: https://support.google.com/googleplay/answer/2812853' },
  { aliases: ['aesthetic', 'astetic', 'aestetic', 'estetic'], title: 'Aesthetic', answer: 'Aesthetic significa «estético». En redes suele referirse a una apariencia o ambiente visual coherente: colores, ropa, fotos, música o decoración que transmiten un estilo.', example: 'Por ejemplo, una habitación con tonos suaves, luces cálidas y objetos que combinan puede describirse como aesthetic.', limit: 'No es un único estilo ni significa necesariamente caro o bonito para todo el mundo; la valoración depende del gusto y del contexto.', source: 'Uso de aesthetic en inglés: https://dictionary.cambridge.org/dictionary/english/aesthetic' },
  { aliases: ['minimalismo', 'minimalista'], title: 'Minimalismo', answer: 'El minimalismo busca reducir elementos para destacar lo esencial. Puede aplicarse al diseño, la decoración o la forma de organizar objetos.', example: 'Por ejemplo, una pantalla con pocos controles bien elegidos puede facilitar encontrar la acción principal.', limit: 'Tener menos elementos no garantiza que algo sea más útil: eliminar información necesaria puede empeorar la experiencia.', source: 'Referencia de consulta: https://www.tate.org.uk/art/art-terms/m/minimalism' },
  { aliases: ['vintage'], title: 'Vintage', answer: 'Vintage suele describir objetos o estilos asociados a una época anterior y apreciados por sus características.', example: 'Por ejemplo, una prenda original de otra década puede ser vintage; una prenda nueva que imita ese estilo suele describirse como retro.', limit: 'No hay una edad universal para todos los usos de la palabra, y antiguo no significa automáticamente valioso.', source: 'Referencia de consulta: https://dictionary.cambridge.org/dictionary/english/vintage' }
];
export function everydayReply(messages) {
  let current = null, result = null, pendingPlay = false;
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const text = normalizeQuestion(message.content);
    if (/^(?:(?:que es|que significa|explicame) )?pley$/.test(text)) {
      pendingPlay = true;current = null;
      result = { mode: 'assistant', intent: 'aclaracion_concepto', reply: '¿Te refieres a «play», la palabra inglesa que puede significar jugar o reproducir, o a Google Play, la tienda de Android? Dime «la palabra», «la tienda» o escribe la frase donde lo viste.' };
      continue;
    }
    if (pendingPlay && /^(si|si esa|eso)$/.test(text)) {
      result = { mode: 'assistant', intent: 'aclaracion_concepto', reply: '¿Cuál de las dos: la palabra inglesa «play» o la tienda Google Play?' };continue;
    }
    const choice = pendingPlay && (/^(?:la )?(?:palabra|palabra inglesa|en ingles|jugar|reproducir)$/.test(text) ? 'play' : /^(?:la )?(?:tienda|de android|tienda de android)$/.test(text) ? 'google play' : null);
    pendingPlay = false;
    const found = entries.find(entry => entry.aliases.some(alias => (choice || text) === alias || new RegExp(`^(?:que es|que significa|explicame|hablame de) (?:la palabra |el termino |el |la |lo |un estilo |ser )?${alias}$`).test(text)));
    const follow = current && /^(dame un ejemplo|un ejemplo|otro ejemplo|dame otro ejemplo|por que|explicalo mejor|mas facil|no entendi|resumelo|en resumen|en pocas palabras|dame un resumen|en que te basas|dame la fuente|fuentes|mas detalles)$/.test(text);
    if (found) current = found;
    else if (!follow) { current = null;result = null;continue; }
    let reply;
    if (follow && /otro ejemplo/.test(text)) reply = otherExamples[current.aliases[0]] || current.example;
    else if (follow && /ejemplo/.test(text)) reply = current.example;
    else if (follow && /^(resumelo|en resumen|en pocas palabras|dame un resumen|mas facil|no entendi)$/.test(text)) reply = current.answer;
    else if (follow && /^(en que te basas|dame la fuente|fuentes)$/.test(text)) reply = current.source + '. Es una referencia de consulta; no la he abierto durante esta conversación.';
    else if (follow && /^(mas detalles|explicalo mejor|por que)$/.test(text)) reply = current.answer + '\n\n' + current.limit + '\n\n' + current.example;
    else reply = current.title + ': ' + current.answer + '\n\n' + current.example + '\n\n' + current.limit;
    result = { mode: 'assistant', intent: 'concepto_cotidiano', reply };
  }
  return result;
}

export function definitionFallback(text) {
  const match = normalizeQuestion(text).match(/^que significa (?:la palabra |el termino )?([a-z0-9]+(?: [a-z0-9]+){0,3})$/);
  return match ? `Entendí que buscas el significado de «${match[1]}». Todavía no tengo una definición revisada en mi vocabulario local. ¿En qué frase o situación lo viste?` : null;
}
