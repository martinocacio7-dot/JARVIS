export class MemoryValidationError extends Error {}
export const memoryKey = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
export function validateMemories(items) {
  if (!Array.isArray(items) || items.length > 50) throw new MemoryValidationError('Puedes guardar hasta 50 recuerdos. Olvida uno antes de añadir otro.');
  const keys = new Set();
  return items.map(item => {
    if (!item || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 80 || typeof item.value !== 'string' || !item.value.trim() || item.value.length > 400 || /[\u0000-\u001f]/.test(item.label + item.value) || typeof item.updatedAt !== 'string' || !Number.isFinite(Date.parse(item.updatedAt))) throw new MemoryValidationError('Usa una etiqueta de hasta 80 caracteres y un recuerdo de hasta 400, en una sola línea.');
    const key = memoryKey(item.label);
    if (!key || keys.has(key)) throw new MemoryValidationError('Los recuerdos deben tener etiquetas distintas.');
    keys.add(key);
    return { label: item.label.trim(), value: item.value.trim(), updatedAt: new Date(item.updatedAt).toISOString() };
  });
}
