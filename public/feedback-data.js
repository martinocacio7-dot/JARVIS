export const feedbackLimit = 200;
export const intentLabel = id => ({ saludo: 'Saludar', identidad: 'Identidad de JARVIS', ayuda: 'Pedir ayuda', gracias: 'Agradecer', despedida: 'Despedirse', programacion: 'Aprender programación', proyecto: 'Planificar un proyecto', organizacion: 'Organizar mi día', aprendizaje_ia: 'Aprender sobre IA', continuar: 'Continuar una guía', recordar_tema: 'Recordar el tema', consultar_nombre: 'Consultar mi nombre', repetir: 'Repetir la respuesta', desarrollo_codigo: 'Preguntar por el generador de código', entrenar_red: 'Entrenar la red', memoria: 'Consultar la memoria', biblioteca: 'Usar mis documentos', limites: 'Consultar sus límites', cancelar: 'Cancelar un tema', desconocido: 'No lo reconoció', guardar_nombre: 'Guardar mi nombre', olvidar_contexto: 'Olvidar el contexto' })[id] || id;

export function validateFeedback(entries, allowedIntents) {
  if (!Array.isArray(entries) || entries.length > feedbackLimit) throw new Error('Se admiten hasta 200 correcciones de intención.');
  const ids = new Set();
  return entries.map(entry => {
    if (!entry || typeof entry.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(entry.id) || ids.has(entry.id)) throw new Error('Identificador de corrección inválido o duplicado.');
    ids.add(entry.id);
    if (typeof entry.text !== 'string' || !entry.text.trim() || entry.text.length > 1000 || entry.text.includes('\u0000')) throw new Error('La frase corregida debe tener entre 1 y 1000 caracteres, sin caracteres NUL.');
    if (typeof entry.intent !== 'string' || !/^[a-z_]{1,40}$/.test(entry.intent) || (allowedIntents && !allowedIntents.includes(entry.intent))) throw new Error('Elige una intención que la red pueda aprender.');
    if (typeof entry.predictedIntent !== 'string' || !/^[a-z_]{1,40}$/.test(entry.predictedIntent)) throw new Error('La interpretación original no es válida.');
    if (!['pending', 'approved', 'rejected'].includes(entry.status)) throw new Error('Estado de revisión inválido.');
    return { id: entry.id, text: entry.text.trim(), intent: entry.intent, predictedIntent: entry.predictedIntent, status: entry.status };
  });
}

export function exportFeedback(entries) {
  const approved = validateFeedback(entries).filter(entry => entry.status === 'approved');
  if (!approved.length) throw new Error('Aprueba al menos una corrección antes de exportar.');
  const seen = new Map();
  const examples = [];
  for (const { text, intent } of approved) {
    const key = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key) throw new Error('Una frase aprobada no contiene palabras válidas.');
    if (seen.has(key) && seen.get(key) !== intent) throw new Error('La misma frase tiene dos intenciones aprobadas distintas. Revisa esas correcciones.');
    if (!seen.has(key)) examples.push({ text, intent, reviewed: true });
    seen.set(key, intent);
  }
  return { version: 1, type: 'jarvis-intent-feedback', examples };
}
