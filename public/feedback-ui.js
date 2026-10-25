import { validateFeedback, exportFeedback, intentLabel } from './feedback-data.js';

const $ = selector => document.querySelector(selector);
let entries = [], revision = 0, intents = [], available = false, editing = null, predictedIntent = 'desconocido';
const report = text => { $('#feedback-notice').textContent = text; };

function render() {
  $('#feedback-count').textContent = `${entries.length} correcciones · ${entries.filter(entry => entry.status === 'approved').length} aprobadas`;
  $('#feedback-list').replaceChildren(...entries.map(entry => {
    const row = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${entry.text} — Quería: ${intentLabel(entry.intent)}. JARVIS: ${intentLabel(entry.predictedIntent)}. ${ { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Descartada' }[entry.status] }.`;
    row.append(label);
    const button = (text, action) => { const element = document.createElement('button'); element.type = 'button'; element.textContent = text; element.addEventListener('click', action); row.append(element); };
    const setStatus = status => save(entries.map(item => item.id === entry.id ? { ...item, status } : item), 'Revisión actualizada. No se han cambiado los pesos de la red.');
    if (entry.status === 'pending') { button('Aprobar', () => setStatus('approved')); button('Descartar', () => setStatus('rejected')); }
    else button('Volver a revisar', () => setStatus('pending'));
    button('Editar', () => openEditor(entry.text, entry.predictedIntent, entry.intent, entry.id));
    button('Eliminar', async () => { if (await save(entries.filter(item => item.id !== entry.id), 'Corrección eliminada.') && editing === entry.id) reset(); });
    return row;
  }));
}
function reset() { editing = null; predictedIntent = 'desconocido'; $('#feedback-form').reset(); $('#feedback-original').textContent = ''; }
async function save(candidate, message) {
  $('#feedback-controls').disabled = true;
  try {
    const feedback = validateFeedback(candidate, intents.map(intent => intent.id));
    const response = await fetch('/api/feedback', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedback, expectedRevision: revision }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
    entries = validateFeedback(data.feedback); revision = data.revision;
    render(); report(message); return true;
  } catch (error) { report(`No se guardó el cambio: ${error.message}`); return false; }
  finally { $('#feedback-controls').disabled = false; }
}
function openEditor(text, predicted, target = '', id = null) {
  $('#feedback-panel').open = true;
  if (!available) { report('Necesitas conectar la base de datos con DATABASE_URL en Render y recargar para guardar correcciones. El chat sigue funcionando.'); return; }
  editing = id; predictedIntent = predicted;
  $('#feedback-text').value = text; $('#feedback-intent').value = target;
  $('#feedback-original').textContent = `JARVIS interpretó: ${intentLabel(predicted)}.`;
  report(text.length > 1000 ? 'Resume la frase a un máximo de 1000 caracteres antes de guardarla.' : 'Indica qué querías pedir. Se guardará pendiente de revisión; aprobar no reentrena la red.');
  $('#feedback-text').focus(); $('#feedback-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
export const reportMisunderstanding = (text, predicted) => openEditor(text, predicted);

export async function initFeedback() {
  try {
    const response = await fetch('/api/feedback'); const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las correcciones.');
    entries = validateFeedback(data.feedback); revision = data.revision; intents = data.intents;
    for (const intent of intents) { const option = document.createElement('option'); option.value = intent.id; option.textContent = intentLabel(intent.id); $('#feedback-intent').append(option); }
    available = true; $('#feedback-controls').disabled = false; render();
  } catch (error) { report(error.message); $('#feedback-count').textContent = 'Necesita conexión a la base de datos'; return; }
  $('#feedback-form').addEventListener('submit', async event => {
    event.preventDefault();
    const entry = { id: editing || crypto.randomUUID(), text: $('#feedback-text').value, predictedIntent, intent: $('#feedback-intent').value, status: 'pending' };
    if (await save(editing ? entries.map(item => item.id === editing ? entry : item) : [...entries, entry], 'Corrección pendiente guardada. Revísala y apruébala si la etiqueta es correcta.')) reset();
  });
  $('#feedback-cancel').addEventListener('click', reset);
  $('#export-feedback').addEventListener('click', () => {
    try {
      const data = exportFeedback(entries);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'jarvis-correcciones-revisadas.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      report(`Exportadas ${data.examples.length} frases aprobadas. El archivo es privado; revísalo antes de preparar un entrenamiento local.`);
    } catch (error) { report(error.message); }
  });
}
