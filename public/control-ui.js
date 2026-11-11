import { displayTaskDate } from './task-data.js';
const $ = selector => document.querySelector(selector);
let generation = 0;
function text(tag, value) { const node = document.createElement(tag);node.textContent = value;return node; }
function prepare(value) { $('#prompt').value = value;$('#prompt').focus();$('#notice').textContent = 'Petición preparada. Revisa el texto y pulsa Enviar.'; }
export async function refreshControl() {
 const current = ++generation;$('#control-notice').textContent = 'Consultando los registros…';
 try {
  const response = await fetch('/api/control', { signal: AbortSignal.timeout(12000) });const data = await response.json();if (!response.ok) throw Error('No pude consultar el centro de control.');if (current !== generation) return;
  const memory = data.memory, tasks = data.tasks;
  $('#control-stats').replaceChildren();$('#control-memory').replaceChildren();$('#control-tasks').replaceChildren();
  const memories = memory.available ? memory.items.length : '—', pending = tasks.available ? tasks.items.filter(item => !item.completed).length : '—', done = tasks.available ? tasks.items.filter(item => item.completed).length : '—';
  for (const [number,label] of [[memories,'Recuerdos'],[pending,'Pendientes'],[done,'Marcadas como hechas']]) { const card = text('div','');card.append(text('strong',String(number)),text('span',label));$('#control-stats').append(card); }
  if (memory.available) {
   for (const item of memory.items) { const row = text('li',`${item.label}: ${item.value}`);row.append(text('small','Fuente: tú · Actualizado: ' + displayTaskDate(item.updatedAt) + ' (UTC−5)'));const forget = text('button','Preparar olvido');forget.type='button';forget.addEventListener('click',()=>prepare('Olvida el recuerdo '+item.label));row.append(forget);$('#control-memory').append(row); }
   if (!memory.items.length) $('#control-memory').append(text('li','Todavía no hay recuerdos guardados.'));
  } else $('#control-memory').append(text('li','Memoria no disponible. No se pudo comprobar su contenido.'));
  if (tasks.available) {
   const sorted = tasks.items.slice().sort((a,b)=>Number(a.completed)-Number(b.completed)||(a.dueAt||'z').localeCompare(b.dueAt||'z'));
   for (const item of sorted.slice(0,30)) { const row=text('li',`${item.completed?'✓ Marcada como hecha':'Pendiente'}: ${item.text}${item.dueAt?' · '+displayTaskDate(item.dueAt)+' (UTC−5)':''}`);if (!item.completed) {const button=text('button','Marcar como hecha');button.type='button';button.addEventListener('click',async()=>{button.disabled=true;try { const changed=tasks.items.map(entry=>entry.id===item.id?{...entry,completed:true}:entry);const response=await fetch('/api/tasks',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:changed,expectedRevision:tasks.revision})});if(!response.ok)throw Error('No se confirmó el cambio. Actualiza antes de repetirlo.');await refreshControl();document.dispatchEvent(new Event('jarvis:tasks-changed'));}catch(error){$('#control-notice').textContent=error.message;button.disabled=false;} });row.append(button);}$('#control-tasks').append(row); }
   if (!sorted.length) $('#control-tasks').append(text('li','No hay tareas guardadas.'));if (sorted.length>30) $('#control-tasks').append(text('li','Se muestran los primeros 30 registros; abre Mis pendientes para ver todos.'));
  } else $('#control-tasks').append(text('li','Tareas no disponibles. No se han considerado completadas ni vacías.'));
  $('#control-notice').textContent = 'Consultado: '+displayTaskDate(data.checkedAt)+' (UTC−5). Cada sección refleja su propia lectura de la base de datos.';
 } catch { if(current!==generation)return;$('#control-stats').replaceChildren();$('#control-memory').replaceChildren();$('#control-tasks').replaceChildren();$('#control-notice').textContent='No pude cargar los registros. No se ha confirmado ninguna acción. Intenta actualizar.'; }
}
export function openControl() { document.dispatchEvent(new Event('jarvis:show-tools'));if($('#control-panel').open)refreshControl();else $('#control-panel').open=true;$('#control-panel').scrollIntoView({block:'start',behavior:'smooth'}); }
export function initControl() {
 $('#open-control').addEventListener('click',openControl);$('#control-refresh').addEventListener('click',refreshControl);
 $('#control-panel').addEventListener('toggle',()=>{if($('#control-panel').open)refreshControl();});
 $('#control-remember').addEventListener('click',()=>prepare('Recuerda que mi objetivo es '));
 document.addEventListener('jarvis:request-end',()=>{if($('#control-panel').open)refreshControl();});
 document.addEventListener('jarvis:tasks-changed',()=>{if($('#control-panel').open)refreshControl();});
}
