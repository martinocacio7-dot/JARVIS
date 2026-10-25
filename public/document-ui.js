import { validateDocument, documentWarnings } from './document-data.js';
const $ = selector => document.querySelector(selector);
const fields = ['format', 'title', 'author', 'institution', 'course', 'instructor', 'date', 'body', 'references', 'table'];
const report = text => { $('#document-notice').textContent = text; };
function update() {
  const format = $('#document-format').value;
  $('#document-author').required = ['docx', 'pdf'].includes(format);
  $('#document-body').required = format !== 'xlsx'; $('#document-table').required = format === 'xlsx';
  $('#document-prose').hidden = format === 'xlsx'; $('#document-grid').hidden = format !== 'xlsx';
}
export function openDocuments(prompt = '') {
  document.dispatchEvent(new Event('jarvis:show-tools'));
  $('#document-panel').open = true;
  if (prompt) report(`Petición: ${prompt}. Completa el título y el contenido real que debe aparecer. El generador no investiga ni redacta por sí solo.`);
  $('#document-title').focus(); $('#document-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
export function initDocuments() {
  $('#document-date').value = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeZone: 'America/Guayaquil' }).format(new Date());
  $('#document-format').addEventListener('change', update); update();
  $('#document-form').addEventListener('submit', async event => {
    event.preventDefault();
    let data;
    try { data = validateDocument(Object.fromEntries(fields.map(field => [field, $(`#document-${field}`).value]))); }
    catch (error) { report(error.message); return; }
    const warnings = documentWarnings(data);
    $('#document-controls').disabled = true; report('Preparando el archivo…');
    try {
      const response = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(45000) });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'No se pudo generar el documento.'); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      link.download = { docx: 'informe-apa.docx', pdf: 'informe-apa.pdf', pptx: 'presentacion.pptx', xlsx: 'datos.xlsx' }[data.format];
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      report(`Archivo preparado. ${warnings.join(' ')} Los archivos se generan en memoria y no se guardan en el servidor.`);
    } catch (error) { report(`No se pudo descargar: ${error.message}`); }
    finally { $('#document-controls').disabled = false; }
  });
}
