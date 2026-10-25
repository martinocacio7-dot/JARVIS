let listening = false;
export const isDictating = () => listening;
export function stopSpeaking() { window.speechSynthesis?.cancel(); }
export function speakReply(text) {
  if (!document.querySelector('#read-aloud').checked) return;
  try {
  const synthesis = window.speechSynthesis;
  const voice = synthesis?.getVoices().find(voice => voice.localService && /^es(?:-|$)/i.test(voice.lang));
  if (!voice) { document.querySelector('#voice-notice').textContent = 'No hay una voz local en español disponible. Instala una voz en tu sistema o lee la respuesta en pantalla.'; return; }
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 4000)); utterance.voice = voice; utterance.lang = voice.lang;
  if (text.length > 4000) document.querySelector('#voice-notice').textContent = 'Se leerán los primeros 4000 caracteres. La respuesta completa permanece en pantalla.';
  utterance.onerror = () => { document.querySelector('#voice-notice').textContent = 'No se pudo leer la respuesta. El texto permanece en pantalla.'; };
  synthesis.speak(utterance);
  } catch { document.querySelector('#voice-notice').textContent = 'La lectura de voz no está disponible. La respuesta permanece en pantalla.'; }
}

export function initVoice() {
  const button = document.querySelector('#microphone');
  const prompt = document.querySelector('#prompt');
  const status = document.querySelector('#voice-notice');
  document.querySelector('#stop-speaking').addEventListener('click', stopSpeaking);
  document.querySelector('#read-aloud').addEventListener('change', event => { if (!event.target.checked) stopSpeaking(); });
  window.speechSynthesis?.getVoices();
  window.addEventListener('pagehide', stopSpeaking);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition || !window.isSecureContext) {
    button.disabled = true;
    status.textContent = 'Dictado no disponible en este navegador. Puedes escribir o probar Chrome/Edge con HTTPS.';
    return;
  }
  let recognition = null;
  let prefix = '';
  let sessionText = '';
  function finish() {
    recognition = null;
    listening = false; prompt.readOnly = false;
    button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', 'Dictar mensaje');
    button.textContent = '🎤'; prompt.focus();
  }
  button.addEventListener('click', () => {
    if (listening) { try { recognition.stop(); } catch { recognition.abort(); finish(); } return; }
    if (document.querySelector('#send').disabled) { status.textContent = 'Espera a que termine la respuesta antes de dictar.'; return; }
    stopSpeaking();
    prefix = prompt.value.trimEnd(); sessionText = '';
    const session = new Recognition(); recognition = session; recognition.lang = 'es-EC'; recognition.interimResults = true; recognition.continuous = false;
    recognition.onstart = () => {
      if (recognition !== session) return;
      listening = true; prompt.readOnly = true; button.setAttribute('aria-pressed', 'true'); button.setAttribute('aria-label', 'Detener dictado'); button.textContent = '■';
      status.textContent = 'Escuchando… Pulsa detener cuando termines. El mensaje no se enviará automáticamente.';
    };
    recognition.onresult = event => {
      if (recognition !== session) return;
      sessionText = Array.from(event.results).map(result => result[0].transcript).join(' ');
      const text = [prefix, sessionText].filter(Boolean).join(' ');
      if (text.length > 8000) { status.textContent = 'El dictado superó el límite. Se conserva el texto anterior; revisa el mensaje.'; recognition.stop(); return; }
      prompt.value = text;
    };
    recognition.onerror = event => {
      if (recognition !== session) return;
      status.textContent = ({ 'not-allowed': 'No se permitió el micrófono. Revisa el permiso del sitio en el navegador.', 'audio-capture': 'No se encontró un micrófono disponible.', 'no-speech': 'No se detectó voz. Puedes intentarlo otra vez.', network: 'El servicio de voz del navegador no pudo conectarse.', aborted: 'Dictado detenido.' })[event.error] || 'No se pudo completar el dictado. Puedes escribir el mensaje.';
      finish();
    };
    recognition.onend = () => {
      if (recognition !== session) return;
      if (status.textContent.startsWith('Escuchando')) status.textContent = sessionText ? 'Dictado terminado. Revisa el texto y pulsa Enviar cuando quieras.' : 'Dictado terminado sin texto. Puedes intentarlo de nuevo.';
      finish();
    };
    try { listening = true; prompt.readOnly = true; recognition.start(); } catch { status.textContent = 'No se pudo iniciar el micrófono. Revisa los permisos del navegador.'; finish(); }
  });
  window.addEventListener('pagehide', () => { recognition?.abort(); });
}
