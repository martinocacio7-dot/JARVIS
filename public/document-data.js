export function validateDocument(input) {
  if (!input || !['docx', 'pdf', 'pptx', 'xlsx'].includes(input.format)) throw new Error('Elige Word, PDF, PowerPoint o Excel.');
  const result = { format: input.format };
  for (const [key, max] of Object.entries({ title: 150, author: 100, institution: 150, course: 150, instructor: 100, date: 100, body: 16000, references: 4000, table: 20000 })) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new Error(`El campo ${key} no es válido o supera ${max} caracteres.`);
    result[key] = value.trim();
  }
  if (!result.title) throw new Error('Escribe el título.');
  if (['docx', 'pdf'].includes(result.format) && !result.author) throw new Error('Escribe el autor para la portada del informe.');
  if (result.format === 'xlsx') {
    if (!result.table) throw new Error('Introduce los datos de la hoja de cálculo, separados por tabulaciones.');
    const rows = result.table.split(/\r?\n/).map(row => row.split('\t'));
    if (rows.length > 200 || rows.some(row => row.length > 20 || row.some(cell => cell.length > 1000))) throw new Error('Excel admite hasta 200 filas y 20 columnas, con 1000 caracteres por celda.');
  } else if (!result.body) throw new Error('Añade el contenido que debe aparecer en el documento. El título no basta para redactar un informe.');
  return result;
}

export function documentWarnings(data) {
  if (!['docx', 'pdf'].includes(data.format)) return ['Se usará el contenido que proporcionaste; no se inventan datos ni fuentes.'];
  const warnings = ['Se aplica el formato base APA 7 estudiantil. Debes revisar el contenido, las citas y las referencias; no se certifica su exactitud.'];
  if (!data.institution || !data.course || !data.instructor || !data.date) warnings.push('Faltan datos de portada: completa institución, asignatura, docente y fecha si tu trabajo los requiere.');
  if (!data.references) warnings.push('No proporcionaste referencias: no se inventará una bibliografía.');
  else {
    if (!/\([^)]*(?:19|20)\d{2}[^)]*\)/u.test(data.body)) warnings.push('No se detectaron citas con año entre paréntesis. Comprueba las citas autor-fecha y su correspondencia con las referencias.');
    if (data.references.split('\n').some(line => line.trim() && !/\b(?:19|20)\d{2}[a-z]?\b|s\.\s*f\./i.test(line))) warnings.push('Alguna referencia no contiene un año reconocible. Revisa sus datos y su formato APA.');
  }
  return warnings;
}
export function isDocumentRequest(text) {
  const value = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/^(informe(?:\s+.*)?|word|pdf|powerpoint|excel)$/.test(value.trim())) return true;
  return /\b(crea|creame|haz|hazme|genera|generame|necesito|quiero|prepara|preparame)\b/.test(value) && /\b(informe|documento|word|pdf|powerpoint|excel|presentacion|diapositivas|hoja de calculo)\b/.test(value);
}
