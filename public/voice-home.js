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
window.addEventListener('jarvis:android', ({ detail }) => {
  if (detail.type !== 'wake-status') return;
  const state = detail.text;
  document.querySelector('.voice-home').dataset.state = state;
  status.textContent = ({
    ESCUCHANDO: 'Di «Jarvis». Te escucho.',
    PREPARANDO: 'Preparando el micrófono…',
    'LIBERANDO MICRÓFONO': 'Preparando el regreso a la escucha…',
    'ESPERANDO PETICIÓN': 'Sí, dígame, señor.',
    RESPONDIENDO: 'Aquí tienes mi respuesta…',
    CONSULTANDO: 'Preparando tu respuesta…',
    PAUSADO: 'Escucha pausada. Toca para retomar.',
    ERROR: 'Revisa el aviso de audio de la barra superior.',
    INACTIVO: 'Activa la escucha para empezar.'
  })[state] || 'Completa la activación en la aplicación.';
  start.textContent = state === 'PAUSADO' ? 'Retomar escucha ↗' : state === 'ESCUCHANDO' ? 'Escucha activada ✓' : 'Hablar con JARVIS ↗';
});
