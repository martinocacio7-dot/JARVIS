import { normalize } from '../public/library-data.js';
export async function musicReply(messages, database) {
  let pending = false, query = null, active = false;
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const text = message.content.trim().replace(/^jarvis[,\s]+/iu, '').replace(/[.!?]+$/, '');
    const request = text.match(/^(?:pon(?:me)?|reproduce|busca)\s+(?:m[uú]sica|canciones)(?:\s+(?:en youtube|en you tube))?(?:\s+(?:de|para|sobre)\s+(.+))?$/iu);
    if (request) { active = true;query = request[1] || null;pending = !query; }
    else if (/^(?:pon(?:me)?|reproduce|busca) (?:musica|canciones) (?:segun mis gustos|segun mi recomendacion|que me guste)$/.test(normalize(text))) { active = true;pending = true;query = null; }
    else if (pending && /^(?:de |para |sobre )/iu.test(text)) { query = text.replace(/^(?:de|para|sobre)\s+/iu, '');pending = false;active = true; }
    else { pending = false;query = null;active = false; }
  }
  if (!active) return null;
  if (!query) {
    try { const saved = await database.readMemories();query = saved.items.find(item => ['musica', 'musica favorita', 'genero musical', 'artista favorito'].includes(normalize(item.label)))?.value || null; }
    catch { /* Ask for a query rather than invent preferences if memory is unavailable. */ }
  }
  if (!query) return { mode: 'assistant', reply: '¿Qué artista, género o ambiente prefieres? Puedes decir «de salsa» o «para estudiar». Para conservar el gusto, dime «recuerda que mi música favorita es salsa».' };
  if (query.length > 140 || /[\u0000-\u001f]/.test(query)) return { mode: 'assistant', reply: 'Dime un artista, género o ambiente de hasta 140 caracteres para buscar en YouTube.' };
  return { mode: 'assistant', musicQuery: query, reply: `Preparé una búsqueda en YouTube de «${query}». Para abrirla desde JARVIS necesitas el APK compatible. No he confirmado reproducción ni consultado recomendaciones de tu cuenta.` };
}
