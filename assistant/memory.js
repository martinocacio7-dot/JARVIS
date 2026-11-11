import { memoryKey, validateMemories } from '../knowledge/memory-data.js';

export function parseMemoryCommand(text) {
  const phrase = text.trim().replace(/^jarvis[,\s]+/iu, '').replace(/^[¿¡]+/u, '').replace(/[.!?¿]+$/u, '');
  const key = memoryKey(phrase);
  if (/^(que recuerdas de mi|que sabes de mi|mis recuerdos|muestra mis recuerdos|que tienes guardado en tu memoria)$/.test(key)) return { action: 'read' };
  if (/^(como guardo recuerdos|como uso tu memoria)$/.test(key)) return { action: 'clarify' };
  if (/^(olvida mis recuerdos|borra mis recuerdos|borra tu memoria guardada)$/.test(key)) return { action: 'clear' };
  let match = phrase.match(/^(?:recuerda|guarda en tu memoria|acu[eé]rdate de)\s+(?:que\s+)?(.+)$/iu);
  if (match) {
    const content = match[1];
    const name = content.match(/^me llamo\s+([\p{L}]+(?:[ '\-][\p{L}]+){0,3})$/iu);
    if (name) return { action: 'write', label: 'nombre', value: name[1] };
    const labelled = content.match(/^(?:mi\s+)?(.{1,80}?)\s+(?:es|son|:)\s*(.+)$/iu);
    if (labelled) return { action: 'write', label: labelled[1], value: labelled[2] };
    const partial = content.match(/^(?:mi\s+)(.{1,80}?)(?:\s+(?:es|son|:))?$/iu);
    return partial ? { action: 'clarify', label: partial[1] } : { action: 'clarify' };
  }
  match = phrase.match(/^(?:qu[eé] recuerdas (?:sobre|de)|cu[aá]l es mi|c[oó]mo se llama mi)\s+(.+)$/iu);
  if (match) return { action: 'read', label: match[1] };
  match = phrase.match(/^(?:olvida el recuerdo|borra el recuerdo|olvida de tu memoria)\s+(.+)$/iu);
  if (match) return { action: 'delete', label: match[1] };
  return null;
}

// Only the immediately preceding explicit, incomplete user request may supply a label.
export function parseMemoryConversation(messages) {
  const users = messages.filter(message => message.role === 'user');
  if (!users.length) return null;
  const latest = users.at(-1).content;const direct = parseMemoryCommand(latest);if (direct) return direct;
  const pending = users.length > 1 ? parseMemoryCommand(users.at(-2).content) : null;
  const key = memoryKey(latest);
  if (pending?.action !== 'clarify' || !pending.label || /^(que|como|cual|quien|cuando|donde|por que|abre|abrir|entra|ingresa|pon|busca|investiga|reproduce|recuerdame|haz|has|hasme|hazme|avisa|avisame|borra|elimina|marca|completa|lee|leeme|mis|mi agenda|olvida|cancela|no|si|hola|gracias|continua|repite|retoma|retomemos|termina|ya|todavia|aun|hecho|listo|crea|creame|programa|agrega|anade|anota|muestra|apaga|enciende|manda|envia|modifica|edita|cambia|mueve|reprograma|actualiza|guarda|acuerdate|la hora|hora|hora actual|fecha|noticias|notificaciones|ayuda|en resumen|mas facil|dame un ejemplo|centro de control|resumen de mis tareas|resumen de mi dia)(?: |$)/.test(key)) return null;
  return { action: 'write', label: pending.label, value: latest.trim().replace(/^es\s+/iu, '') };
}

export async function executeMemoryCommand(command, database, now = new Date()) {
  const response = reply => ({ mode: 'assistant', intent: 'memoria_guardada', reply });
  if (command.action === 'clarify' && command.label) return response(`¿Qué valor guardo para «${command.label}»? Puedes responder «es aprender Python». Todavía no he guardado nada.`);
  if (command.action === 'clarify') return response('¿Qué dato quieres que guarde? Dime, por ejemplo, «recuerda que mi objetivo es aprender Python». Solo guardo recuerdos cuando me lo pides; no programas recordatorios con esta orden.');
  const saved = await database.readMemories();
  const key = memoryKey(command.label || '');
  if (command.action === 'read') {
    const found = command.label ? saved.items.filter(item => memoryKey(item.label) === key) : saved.items;
    return response(found.length
      ? 'Según lo que me pediste guardar: ' + found.slice(-10).map(item => `${item.label}: ${item.value}`).join('; ') + (found.length > 10 ? `. Muestro los últimos diez de ${found.length}; pregunta por una etiqueta para consultar otra.` : '.') + ' Estos datos vienen de ti; no los he verificado por otra fuente.'
      : key === 'nombre' ? 'Todavía no conozco tu nombre. Para guardarlo entre conversaciones, dime «recuerda que me llamo Miguel».' : command.label ? `No tengo un recuerdo guardado con la etiqueta «${command.label}». ¿Quieres indicármelo con «recuerda que mi ${command.label} es …»?` : 'No tengo recuerdos permanentes guardados. Puedes decir «recuerda que me llamo Miguel» o «recuerda que mi objetivo es aprender Python».');
  }
  let items;
  if (command.action === 'write') {
    const entry = { label: command.label, value: command.value, updatedAt: now.toISOString() };
    items = validateMemories([...saved.items.filter(item => memoryKey(item.label) !== key), entry]);
  } else if (command.action === 'clear') items = [];
  else {
    items = saved.items.filter(item => memoryKey(item.label) !== key);
    if (items.length === saved.items.length) return response('No encontré ese recuerdo exacto. No borré nada. Puedes consultar «mis recuerdos» para ver las etiquetas.');
  }
  await database.writeMemories(items, saved.revision);
  return response(command.action === 'write'
    ? `${saved.items.some(item => memoryKey(item.label) === key) ? 'Actualicé' : 'Guardé'} ${command.label}: ${command.value}. Lo recordaré entre conversaciones mientras tu base de datos esté disponible. Puedes decir «olvida el recuerdo ${command.label}».`
    : command.action === 'clear' ? 'Borré tus recuerdos permanentes. El historial, los documentos y los recordatorios siguen separados.' : `Borré el recuerdo ${command.label}.`);
}
