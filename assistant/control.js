import { validateMemories, memoryKey } from '../knowledge/memory-data.js';
import { validateTasks, displayTaskDate } from '../public/task-data.js';
export const isControlQuery = text => /^(mi centro de control|centro de control|resumen de mis tareas|resumen de mi dia|que has guardado|que tareas he completado)$/.test(memoryKey(text).replace(/^jarvis /, ''));
export async function controlSnapshot(database, now = new Date()) {
  const results = await Promise.allSettled([Promise.resolve().then(() => database.readMemories()), Promise.resolve().then(() => database.readTasks())]);
  const snapshot = { checkedAt: now.toISOString(), memory: { available: false }, tasks: { available: false } };
  for (const [i, name, validate] of [[0, 'memory', validateMemories], [1, 'tasks', validateTasks]]) {
    if (results[i].status !== 'fulfilled') continue;
    try { const data = results[i].value;snapshot[name] = { available: true, items: validate(data.items), revision: data.revision }; } catch { /* Unknown is not zero. */ }
  }
  return snapshot;
}
export function controlReply(snapshot, completedOnly = false) {
  const parts = [];
  parts.push(snapshot.memory.available ? `${snapshot.memory.items.length} recuerdos guardados por petición tuya.` : 'No pude consultar la memoria; su estado es desconocido.');
  if (snapshot.tasks.available) {
    const items = snapshot.tasks.items, completed = items.filter(item => item.completed).length;
    parts.push(`${items.length - completed} pendientes y ${completed} tareas marcadas como hechas.`);
    const next = items.filter(item => item.completed === completedOnly).sort((a,b) => (a.dueAt || 'z').localeCompare(b.dueAt || 'z')).slice(0, 5);
    for (const item of next) parts.push(`• ${item.text}${item.dueAt ? ' — ' + displayTaskDate(item.dueAt) + ' (UTC−5)' : ''}`);
    parts.push('Estos estados vienen de tus registros en JARVIS. No comprueban acciones fuera de la aplicación. La web no emite alarmas automáticas.');
  } else parts.push('No pude consultar las tareas; no las he considerado una lista vacía.');
  return parts.join('\n');
}
