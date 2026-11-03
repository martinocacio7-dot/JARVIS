import { normalize } from '../public/library-data.js';
const entries = [
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
    const text = normalize(message.content).replace(/^jarvis /, '');
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
    const found = entries.find(entry => entry.aliases.some(alias => (choice || text) === alias || new RegExp(`^(?:que es|que significa|explicame|hablame de) (?:el |lo |un estilo )?${alias}$`).test(text)));
    const follow = current && /^(dame un ejemplo|un ejemplo|por que|explicalo mejor|mas facil|en que te basas)$/.test(text);
    if (found) current = found;
    else if (!follow) { current = null;result = null;continue; }
    result = { mode: 'assistant', intent: 'concepto_cotidiano', reply: `${current.title}: ${current.answer}\n\n${current.example}\n\n${current.limit}\n\n${current.source}. Es una referencia para consultar, no una búsqueda web en directo.` };
  }
  return result;
}
