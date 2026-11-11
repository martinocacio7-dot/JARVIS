const sphere = document.querySelector('#particle-sphere');
for (let i = 0; i < 640; i++) {
  const y = 1 - 2 * (i + .5) / 640, radius = Math.sqrt(1 - y * y);
  const angle = i * Math.PI * (3 - Math.sqrt(5));
  const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('cx', String(150 + x * 114));
  dot.setAttribute('cy', String(150 + y * 114));
  dot.setAttribute('r', String(.6 + (z + 1) * .65));
  dot.setAttribute('opacity', String(.18 + (z + 1) * .38));
  sphere.append(dot);
}
const status = document.querySelector('#orb-status');
const start = document.querySelector('#voice-start');
function activate() {
  if (window.JarvisAndroid?.activateWake) window.JarvisAndroid.activateWake();
  else if (window.JarvisAndroid) status.textContent = 'Pulsa Activar JARVIS en la barra superior.';
  else document.querySelector('#wake-mode').click();
}
start.addEventListener('click', activate);
document.querySelector('#voice-orb').addEventListener('click', activate);
const home = document.querySelector('.voice-home');
const wave = document.querySelector('.voice-wave');
for (let i = 0; i < 31; i++) { const bar = document.createElement('i');bar.style.setProperty('--bar', String(i));wave.append(bar); }
function showState(state, text) {
  home.dataset.state = state;
  document.querySelector('#orb-mode').textContent = ({ ESCUCHANDO: 'ESCUCHANDO', PREPARANDO: 'PREPARANDO', CONSULTANDO: 'PREPARANDO RESPUESTA', RESPONDIENDO: 'RESPONDIENDO', PAUSADO: 'PAUSADO', ERROR: 'REVISAR AUDIO', INACTIVO: 'EN REPOSO' })[state] || state;
  status.textContent = text || ({ ESCUCHANDO: 'Te escucho.', PREPARANDO: 'Preparando el micrófono…', CONSULTANDO: 'Preparando tu respuesta…', RESPONDIENDO: 'Aquí tienes mi respuesta…', PAUSADO: 'Escucha pausada.', INACTIVO: 'Activa la escucha para empezar.' })[state] || 'Revisa el aviso de voz.';
  start.textContent = state === 'PAUSADO' ? 'Retomar escucha ↗' : state === 'ESCUCHANDO' ? 'Desactivar escucha' : 'Hablar con JARVIS ↗';
  start.disabled = Boolean(document.querySelector('#wake-mode').disabled);
}
window.addEventListener('jarvis:android', ({ detail }) => { if (detail.type === 'wake-status') showState(detail.text); });
document.addEventListener('jarvis:voice-state', ({ detail }) => { if (!window.JarvisAndroid) showState(detail.state, detail.text); });
showState('INACTIVO', 'Estoy aquí para ayudarte.');
