import { normalize } from '../public/library-data.js';
const entries = [
  { aliases: ['aesthetic', 'astetic', 'aestetic', 'estetic'], title: 'Aesthetic', answer: 'Aesthetic significa «estético». En redes suele referirse a una apariencia o ambiente visual coherente: colores, ropa, fotos, música o decoración que transmiten un estilo.', example: 'Por ejemplo, una habitación con tonos suaves, luces cálidas y objetos que combinan puede describirse como aesthetic.', limit: 'No es un único estilo ni significa necesariamente caro o bonito para todo el mundo; la valoración depende del gusto y del contexto.', source: 'Uso de aesthetic en inglés: https://dictionary.cambridge.org/dictionary/english/aesthetic' },
  { aliases: ['minimalismo', 'minimalista'], title: 'Minimalismo', answer: 'El minimalismo busca reducir elementos para destacar lo esencial. Puede aplicarse al diseño, la decoración o la forma de organizar objetos.', example: 'Por ejemplo, una pantalla con pocos controles bien elegidos puede facilitar encontrar la acción principal.', limit: 'Tener menos elementos no garantiza que algo sea más útil: eliminar información necesaria puede empeorar la experiencia.', source: 'Referencia de consulta: https://www.tate.org.uk/art/art-terms/m/minimalism' },
  { aliases: ['vintage'], title: 'Vintage', answer: 'Vintage suele describir objetos o estilos asociados a una época anterior y apreciados por sus características.', example: 'Por ejemplo, una prenda original de otra década puede ser vintage; una prenda nueva que imita ese estilo suele describirse como retro.', limit: 'No hay una edad universal para todos los usos de la palabra, y antiguo no significa automáticamente valioso.', source: 'Referencia de consulta: https://dictionary.cambridge.org/dictionary/english/vintage' }
];
export function everydayReply(messages) {
  let current = null, result = null;
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const text = normalize(message.content).replace(/^jarvis /, '');
    const found = entries.find(entry => entry.aliases.some(alias => text === alias || new RegExp(`^(?:que es|que significa|explicame|hablame de) (?:el |lo |un estilo )?${alias}$`).test(text)));
    const follow = current && /^(dame un ejemplo|un ejemplo|por que|explicalo mejor|mas facil|en que te basas)$/.test(text);
    if (found) current = found;
    else if (!follow) { current = null;result = null;continue; }
    result = { mode: 'assistant', intent: 'concepto_cotidiano', reply: `${current.title}: ${current.answer}\n\n${current.example}\n\n${current.limit}\n\n${current.source}. Es una referencia para consultar, no una búsqueda web en directo.` };
  }
  return result;
}
