const native = () => window.JarvisAndroid;
let initialized = false;
export function initAndroidDevice() {
  if (!native() || initialized) return;
  initialized = true;
  // Current Android app has one native activation control; avoid a second web-only wake button.
  if ((native().appVersion?.() || 0) >= 5) {
    document.querySelector('#wake-mode').hidden = true;
    document.querySelector('.wake-help').textContent = 'Para oír «JARVIS» desde otras apps, pulsa Activar JARVIS en la barra superior de Android y espera el estado ESCUCHANDO. La notificación permite pausar y apagar. Pausa antes de grabar vídeos.';
  }
  if ((native().appVersion?.() || 0) >= 7) {
    document.querySelector('.wake-help').textContent = 'Activa JARVIS en la barra superior. Configura tu AccessKey de Picovoice en Permisos → Detector local. Di «JARVIS», espera «Sí, dígame, señor» y luego habla. El nombre se detecta en el teléfono; el dictado posterior puede usar Internet. Pausa antes de grabar vídeos.';
  }
  if ((native().appVersion?.() || 0) >= 9) {
    document.querySelector('.wake-help').textContent = 'Detector español local, sin cuenta ni AccessKey. Activa JARVIS en la barra superior, espera ESCUCHANDO, di «JARVIS» y espera el saludo antes de tu petición. El dictado posterior puede usar Internet. Pausa antes de grabar vídeos.';
  }
  if ((native().appVersion?.() || 0) >= 10) {
    document.querySelector('.wake-help').textContent = 'Activa JARVIS en la barra superior y espera ESCUCHANDO y la notificación. Puedes salir con Inicio y decir «JARVIS». Espera el saludo antes de preguntar; tras cuatro segundos sin pregunta vuelve a esperar el nombre. El nombre se detecta localmente y el dictado de la pregunta usa Android. Si el teléfono lo detiene, revisa Permisos → Segundo plano y batería. Pausa antes de grabar vídeos.';
  }
  const readAloud = document.querySelector('#read-aloud');
  try { readAloud.checked = localStorage.getItem('jarvis.android.read-aloud') !== 'false'; } catch { readAloud.checked = true; }
  readAloud.addEventListener('change', () => { try { localStorage.setItem('jarvis.android.read-aloud', String(readAloud.checked)); } catch {} });
  document.addEventListener('jarvis:android-pause', () => { recognition = null; });
  const taskHelp = document.querySelector('#task-panel > p');
  if (taskHelp) taskHelp.textContent = taskHelp.textContent.replace('Esta web no emite alarmas automáticas; puedes exportar la agenda e importarla en un calendario que admita avisos.', 'Android programa los avisos al sincronizar tus pendientes. Activa las notificaciones y las alarmas exactas en Permisos.');
  let serial = 0, recognition = null, utterance = null, utteranceId = 0;
  class AndroidRecognition {
    start() { this.id = ++serial; recognition = this; native().startRecognition(this.id); }
    stop() { native().stopRecognition(this.id); }
    abort() { if (recognition === this) recognition = null; native().abortRecognition(this.id); }
  }
  Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: AndroidRecognition });
  const synthesis = new EventTarget();
  synthesis.getVoices = () => { try { return JSON.parse(native().voices()); } catch { return []; } };
  synthesis.cancel = () => { utterance = null; native().stopSpeaking(); };
  synthesis.speak = value => { utterance = value; utteranceId = ++serial; native().speak(value.text, value.voice?.voiceURI || '', utteranceId); };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
  window.addEventListener('jarvis:android', ({ detail }) => {
    if (detail.type === 'background-mode') {
      const enabled = detail.text === 'true';
      document.querySelector('#wake-mode').disabled = enabled; document.querySelector('#microphone').disabled = enabled;
      if (enabled) document.dispatchEvent(new CustomEvent('jarvis:android-audio-interrupted', { detail: { text: 'El modo Fuera de app controla la escucha. Usa su notificación para pausarlo o apagarlo.' } }));
      return;
    }
    if (detail.type === 'background-reply') { try { document.dispatchEvent(new CustomEvent('jarvis:background-reply', { detail: JSON.parse(detail.text) })); } catch {} return; }
    if (detail.type === 'audio-interrupted') { document.dispatchEvent(new CustomEvent('jarvis:android-audio-interrupted', { detail: { text: detail.text } })); return; }
    if (detail.type === 'voices') { synthesis.dispatchEvent(new Event('voiceschanged')); return; }
    if (detail.type.startsWith('tts-')) { if (detail.id === utteranceId) { const value = utterance; utterance = null; (detail.type === 'tts-end' ? value?.onend : value?.onerror)?.(); } return; }
    const current = recognition; if (!current || current.id !== detail.id) return;
    if (detail.type === 'start') current.onstart?.();
    if (detail.type === 'speech') current.onspeechstart?.();
    if (detail.type === 'result') current.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: detail.text }], { isFinal: true })] });
    if (detail.type === 'error') current.onerror?.({ error: detail.text });
    if (detail.type === 'end') { if (recognition === current) recognition = null; current.onend?.(); }
  });
  // Android's document picker handles files generated in memory, without public storage access.
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && this.href.startsWith('blob:')) {
      fetch(this.href).then(response => response.blob()).then(blob => {
        if (blob.size > 20000000) throw new Error('Archivo demasiado grande para descargar desde Android.');
        return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { native().saveFile(this.download, blob.type || 'application/octet-stream', reader.result.split(',')[1]); resolve(); }; reader.onerror = reject; reader.readAsDataURL(blob); });
      }).catch(error => { document.querySelector('#notice').textContent = error.message; });
      return;
    }
    return click.call(this);
  };
}
export function deviceReply(text, now = new Date()) {
  if (!native()) return null;
  const phrase = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^jarvis[\s,]*/, '').replace(/[^a-z0-9 ]/g, '').trim();
  if (/^(?:que hora es|dime la hora|que hora tienes|la hora|hora actual)$/.test(phrase)) return `Son las ${new Intl.DateTimeFormat('es', { hour: 'numeric', minute: '2-digit' }).format(now)}.`;
  if (/^(?:lee |leeme |dime |muestra |que |cuales son |tengo |hay )?(?:mis |las )?notificaciones(?: tengo)?$/.test(phrase) || /^(?:que|cuales) notificaciones tengo$/.test(phrase)) return native().notifications();
  return null;
}
export function syncAndroidReminders(items) {
  if (!native()) return '';
  try { return native().syncReminders(JSON.stringify(items)); }
  catch { return 'No se pudieron confirmar los avisos de Android. Abre Permisos y actualiza tus pendientes.'; }
}
export function sendAndroidVoiceCommand() {
  if (!native()) return false;
  setTimeout(() => document.querySelector('#composer').requestSubmit(), 0);
  return true;
}

export function beginAndroidPlayback() {
  try { const lease = native()?.beginPlayback?.(); return typeof lease === 'number' && lease < 0 ? false : lease; }
  catch { return false; }
}
export function endAndroidPlayback(lease) {
  if (typeof lease !== 'number' || lease < 0) return;
  try { native()?.endPlayback?.(lease); } catch { /* Audio is also released by Android lifecycle cleanup. */ }
}
