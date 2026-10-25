import { createLibraryStore } from './library-store.js';

const $ = selector => document.querySelector(selector);
let store;

function report(text) { $('#library-notice').textContent = text; }
function update() {
  const { documents, corrections } = store.snapshot();
  $('#library-count').textContent = `${documents.length} documentos · ${corrections.length} respuestas enseñadas`;
  const list = (items, container, build) => $(container).replaceChildren(...items.map(build));
  list(documents, '#document-list', document => {
    const row = window.document.createElement('li');
    row.append(window.document.createTextNode(`${document.title} (${document.content.length} caracteres) `));
    const remove = window.document.createElement('button');
    remove.textContent = 'Eliminar';
    remove.type = 'button';
    remove.addEventListener('click', () => modify(() => store.removeDocument(document.id), 'Documento eliminado.'));
    row.append(remove);
    return row;
  });
  list(corrections, '#correction-list', correction => {
    const row = document.createElement('li');
    row.append(document.createTextNode(`${correction.question} `));
    for (const [label, action] of [
      ['Editar', () => editCorrection(correction.question, correction.answer)],
      ['Eliminar', () => modify(() => store.removeCorrection(correction.question), 'Respuesta enseñada eliminada.')]
    ]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click', action); row.append(button);
    }
    return row;
  });
}
async function modify(action, message) {
  $('#library-controls').disabled = true;
  try { await action(); update(); report(message); return true; }
  catch (error) { report(`No se guardó el cambio: ${error.message}. Revisa la conexión o recarga si otra pestaña o dispositivo cambió la biblioteca.`); return false; }
  finally { $('#library-controls').disabled = false; }
}

export function editCorrection(question, answer = '') {
  if (!store) return;
  document.dispatchEvent(new Event('jarvis:show-tools'));
  $('#library-panel').open = true;
  $('#teach-question').value = question.slice(0, 500);
  $('#teach-answer').value = answer.slice(0, 2000);
  $('#teach-answer').focus();
  $('#teach-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function libraryRequest(query) {
  if (!store || !$('#use-library').checked) return null;
  return { query };
}

export async function initLibrary() {
  try {
    store = createLibraryStore();
    await store.load();
  } catch (error) {
    document.dispatchEvent(new Event('jarvis:show-tools'));
  $('#library-panel').open = true;
    report(`No se pudo cargar la biblioteca: ${error.message}. El chat local sigue funcionando. Configura la conexión a PostgreSQL en Render y recarga esta página.`);
    $('#library-controls').disabled = true;
    $('#use-library').disabled = true;
    store = null;
    return;
  }
  $('#library-controls').disabled = false;
  $('#use-library').disabled = false;
  update();
  $('#document-upload').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (!/\.(txt|md)$/i.test(file.name) || file.size > 80000) throw new Error('Selecciona un archivo .txt o .md de hasta 80 KB, con un máximo de 20 000 caracteres.');
      const content = await file.text();
      if (content.includes('\u0000')) throw new Error('El archivo no parece ser texto UTF-8.');
      if (await modify(() => store.addDocument({ id: crypto.randomUUID(), title: file.name, content }), 'Documento guardado en tu base de datos. Activa «Consultar biblioteca» y escribe una pregunta.')) $('#use-library').checked = true;
    } catch (error) { report(error.message); }
    event.target.value = '';
  });
  $('#load-example').addEventListener('click', async () => {
    const added = await modify(() => store.addDocument({ id: crypto.randomUUID(), title: 'Ejemplo: fundamentos de JavaScript', content: 'Una variable guarda un valor que puede utilizarse en el programa. En JavaScript se declara con let o const.\n\nUna función agrupa instrucciones para realizar una tarea. Puede recibir parámetros y devolver un resultado mediante return.\n\nUna condición permite ejecutar instrucciones según una expresión verdadera o falsa. En JavaScript se utiliza if y, opcionalmente, else.' }), 'Ejemplo guardado. Pregunta «¿Qué es una variable?» con «Consultar biblioteca» activado.');
    if (added) $('#use-library').checked = true;
  });
  $('#teach-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (await modify(() => store.teach($('#teach-question').value, $('#teach-answer').value), 'Respuesta guardada. Al repetir esa pregunta en modo biblioteca, usaré lo que enseñaste. Esto no entrena los pesos de la red.')) {
      $('#teach-form').reset();
      $('#use-library').checked = true;
    }
  });
  $('#export-library').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(store.snapshot(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'jarvis-biblioteca.json';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    report('Copia exportada. Guárdala en privado: contiene tus documentos y respuestas enseñadas.');
  });
  $('#import-library').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1048576) throw new Error('La copia no puede superar 1 MiB.');
      const backup = JSON.parse(await file.text());
      // Restaurar sustituye la biblioteca actual, por eso se pide confirmación.
      if (confirm('¿Reemplazar tu biblioteca por esta copia? Exporta antes si quieres conservar la actual.')) await modify(() => store.restore(backup), 'Copia restaurada en tu base de datos.');
    } catch (error) { report(`No se importó la copia: ${error.message}`); }
    event.target.value = '';
  });
}
