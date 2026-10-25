import { sendAndroidVoiceCommand, beginAndroidPlayback, endAndroidPlayback } from './android-device.js';
import { initVoiceProfile, preferredVoice, stopGreeting, usePersonalVoice } from './voice-profile.js';

export const activationReply = 'Sí, dígame, señor.';
export function wakePhrase(text) {
  const match = text.match(/(?:^|[^\p{L}\p{N}])jarv[ií]s(?=$|[^\p{L}\p{N}])/iu);
  return match ? { command: text.slice(match.index + match[0].length).replace(/^[\s,.:;!?¡¿-]+/, '').trim() } : null;
}
let manualListening = false, armed = false, busy = false, speaking = false;
let session = null, restart = null, outputDone = null, token = 0, idleRestarts = 0;
let externalAbort = null, externalAudio = null;
const $ = selector => document.querySelector(selector);
const sayStatus = text => { $('#voice-notice').textContent = text; };
export const isDictating = () => manualListening;

function stopRecognition() {
  clearTimeout(restart); restart = null;
  const old = session; session = null;
  try { old?.abort(); } catch { /* Ya estaba detenido. */ }
  manualListening = false; $('#prompt').readOnly = false;
  $('#microphone').textContent = '🎤'; $('#microphone').setAttribute('aria-pressed', 'false'); $('#microphone').setAttribute('aria-label', 'Dictar mensaje');
}
export function stopSpeaking() {
  externalAbort?.abort(); externalAbort = null; externalAudio?.pause(); externalAudio = null;
  try { window.speechSynthesis?.cancel(); } catch { /* La interfaz sigue disponible. */ }
  stopGreeting(); outputDone?.(false); speaking = false;
}
function updateArmed() {
  $('#wake-mode').setAttribute('aria-pressed', String(armed));
  $('#wake-mode').textContent = armed ? 'Desactivar escucha de JARVIS' : 'Activar «JARVIS»';
}
function disarm(message) {
  armed = false; token++; stopRecognition(); stopSpeaking(); updateArmed();
  if (message) sayStatus(message);
}
async function speak(text, localOnly = false) {
  stopRecognition(); stopSpeaking();
  const lease = beginAndroidPlayback();
  if (lease === false) { sayStatus('Voz pausada: otro proceso está usando el audio. La respuesta permanece en pantalla.'); return false; }
  try { return await speakOutput(text, localOnly); }
  finally { endAndroidPlayback(lease); }
}
async function speakOutput(text, localOnly = false) {
  if (!localOnly && usePersonalVoice()) {
    speaking = true;
    const controller = new AbortController(); externalAbort = controller;
    try {
      const response = await fetch('/api/voice/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 4000) }), signal: controller.signal });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'No se pudo generar la voz personal.'); }
      const blob = await response.blob();
      if (controller.signal.aborted) return false;
      const url = URL.createObjectURL(blob); const audio = new Audio(url); externalAudio = audio;
      return await new Promise(resolve => {
        let finished = false;
        const done = success => { if (finished) return; finished = true; clearTimeout(timeout); audio.onended = null; audio.onerror = null; audio.pause(); audio.src = ''; URL.revokeObjectURL(url); externalAudio = null; outputDone = null; resolve(success); };
        const timeout = setTimeout(() => done(false), 180000); outputDone = done;
        audio.onended = () => done(true); audio.onerror = () => { sayStatus('No se pudo reproducir la voz personal. Prueba a reproducir audio manualmente para habilitarlo.'); done(false); };
        try { audio.play()?.catch(() => { sayStatus('El teléfono bloqueó el audio automático. Habilita la reproducción en el navegador.'); done(false); }); } catch { done(false); }
      });
    } catch (error) { if (!controller.signal.aborted) sayStatus(error.message); return false; }
    finally { if (externalAbort === controller) { externalAbort = null; speaking = false; } }
  }
  const voice = preferredVoice();
  if (!voice || !window.speechSynthesis || !window.SpeechSynthesisUtterance) { sayStatus('No hay una voz local en español disponible. La respuesta está en pantalla; puedes elegir una voz instalada en «Voz y muestras».'); return false; }
  speaking = true;
  return new Promise(resolve => {
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 4000)); utterance.voice = voice; utterance.lang = voice.lang;
    let finished = false;
    const done = success => { if (finished) return; finished = true; clearTimeout(timeout); speaking = false; outputDone = null; resolve(success); };
    const timeout = setTimeout(() => { try { window.speechSynthesis.cancel(); } catch {} done(false); }, 180000);
    outputDone = done; utterance.onend = () => done(true); utterance.onerror = () => { sayStatus('No se pudo reproducir la voz. La respuesta permanece en pantalla.'); done(false); };
    if (text.length > 4000) sayStatus('Se leerán los primeros 4000 caracteres. La respuesta completa permanece en pantalla.');
    try { window.speechSynthesis.speak(utterance); } catch { done(false); }
  });
}
function resumeWake() {
  if (!armed || busy || speaking || manualListening || document.hidden || session) return;
  startRecognition('wake');
}
export function speakReply(text, { localOnly = false } = {}) {
  if (!$('#read-aloud').checked) { resumeWake(); return; }
  const current = ++token;
  speak(text, localOnly).catch(() => { speaking = false; sayStatus('No se pudo usar la voz. La respuesta permanece en pantalla.'); }).finally(() => { if (current === token) resumeWake(); });
}
function appendText(prefix, text) {
  const combined = [prefix, text.trim()].filter(Boolean).join(' ');
  if (combined.length > 8000) { sayStatus('El dictado superó el límite. Se conserva el texto anterior; revisa el mensaje.'); return false; }
  $('#prompt').value = combined; return true;
}
async function activate(command) {
  if (!armed || busy) return;
  const current = ++token;
  stopRecognition();
  document.dispatchEvent(new CustomEvent('jarvis:awake', { detail: { text: activationReply } }));
  sayStatus(activationReply);
  try { await speak(activationReply); } catch { speaking = false; sayStatus('Sí, dígame, señor. No se pudo reproducir la voz.'); }
  if (current !== token || !armed || document.hidden || busy) return;
  if (command) { appendText($('#prompt').value.trimEnd(), command); if (!sendAndroidVoiceCommand()) sayStatus('Petición preparada. Revísala y pulsa Enviar. No se ha enviado automáticamente.'); return; }
  startRecognition('command');
}
function startRecognition(mode) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition || document.hidden) return;
  stopRecognition();
  const recognition = new Recognition(); session = recognition;
  const prefix = $('#prompt').value.trimEnd(); let text = ''; const started = Date.now();
  recognition.lang = 'es-EC'; recognition.interimResults = mode !== 'wake'; recognition.continuous = mode === 'wake';
  if (mode !== 'wake') { manualListening = true; $('#prompt').readOnly = true; }
  recognition.onstart = () => {
    if (session !== recognition) return;
    if (mode === 'wake') sayStatus('Escucha activa: di «JARVIS». El navegador puede enviar audio a su proveedor mientras este modo esté activo.');
    else { $('#microphone').textContent = '■'; $('#microphone').setAttribute('aria-pressed', 'true'); $('#microphone').setAttribute('aria-label', 'Detener dictado'); sayStatus('Escuchando tu mensaje… Revisa el texto antes de enviarlo.'); }
  };
  recognition.onresult = event => {
    if (session !== recognition) return;
    if (mode === 'wake') {
      for (let i = event.resultIndex || 0; i < event.results.length; i++) {
        if (event.results[i].isFinal === false) continue;
        const wake = wakePhrase(event.results[i][0].transcript);
        if (wake && !busy) { activate(wake.command); return; }
      }
    } else {
      text = Array.from(event.results).map(result => result[0].transcript).join(' ');
      if (!appendText(prefix, text)) { try { recognition.stop(); } catch { stopRecognition(); } }
    }
  };
  recognition.onerror = event => {
    if (session !== recognition) return;
    if (event.error === 'no-speech' && mode === 'wake') return;
    const error = ({ 'not-allowed': 'No se permitió el micrófono. Revisa los permisos del sitio.', 'service-not-allowed': 'Este navegador no habilita el servicio de voz. Prueba Chrome/Edge.', 'audio-busy': 'Otro proceso está usando el micrófono o el audio. JARVIS se ha detenido; vuelve a activarlo cuando termines.', 'audio-capture': 'No se encontró un micrófono disponible.', 'no-speech': 'No se detectó voz. Puedes intentarlo de nuevo.', network: 'El servicio de voz del navegador no pudo conectarse.', aborted: 'Dictado detenido.' })[event.error] || 'No se pudo completar el dictado.';
    disarm(error);
  };
  recognition.onend = () => {
    if (session !== recognition) return;
    session = null; manualListening = false; $('#prompt').readOnly = false; $('#microphone').textContent = '🎤'; $('#microphone').setAttribute('aria-pressed', 'false'); $('#microphone').setAttribute('aria-label', 'Dictar mensaje');
    if (mode === 'wake' && armed && !busy) {
      idleRestarts = Date.now() - started > 10000 ? 0 : idleRestarts + 1;
      if (idleRestarts > 4) { disarm('El navegador no mantiene la escucha. Puedes volver a activarla o usar el botón de micrófono.'); return; }
      restart = setTimeout(resumeWake, 800);
    } else { if (mode === 'command' && text && sendAndroidVoiceCommand()) return; sayStatus(text ? 'Dictado terminado. Revisa el texto y pulsa Enviar.' : 'No se detectó un mensaje. Puedes pulsar el micrófono para intentarlo de nuevo.'); if (!text) restart = setTimeout(resumeWake, 800); }
  };
  try { recognition.start(); } catch { disarm('No se pudo iniciar el micrófono. Revisa los permisos del navegador.'); }
}
export function initVoice() {
  initVoiceProfile();
  $('#stop-speaking').addEventListener('click', () => { token++; stopSpeaking(); resumeWake(); });
  $('#read-aloud').addEventListener('change', event => { if (!event.target.checked) { token++; stopSpeaking(); resumeWake(); } });
  document.addEventListener('jarvis:new-chat', () => { token++; stopRecognition(); stopSpeaking(); resumeWake(); });
  document.addEventListener('jarvis:request-start', () => { busy = true; token++; stopRecognition(); stopSpeaking(); });
  document.addEventListener('jarvis:request-end', () => { busy = false; resumeWake(); });
  document.addEventListener('jarvis:android-audio-interrupted', event => disarm(event.detail.text));
  document.addEventListener('jarvis:android-pause', () => disarm('Escucha detenida al salir de la aplicación.'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) disarm('Escucha detenida al salir de la aplicación. Actívala de nuevo al volver.'); });
  window.addEventListener('pagehide', () => disarm()); window.addEventListener('offline', () => disarm('Sin conexión. La escucha se ha detenido.'));
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition) || !window.isSecureContext) {
    $('#microphone').disabled = true; $('#wake-mode').disabled = true; sayStatus('Dictado y activación por voz no disponibles en este navegador. Puedes escribir o probar Chrome/Edge con HTTPS.'); return;
  }
  $('#microphone').addEventListener('click', () => {
    if (manualListening) { try { session?.stop(); } catch { stopRecognition(); } return; }
    if (busy || $('#send').disabled) { sayStatus('Espera a que termine la respuesta.'); return; }
    token++; stopSpeaking(); startRecognition('dictation');
  });
  $('#wake-mode').addEventListener('click', () => {
    if (armed) { disarm('Escucha de JARVIS desactivada.'); return; }
    if (busy) { sayStatus('Espera a que termine la respuesta.'); return; }
    armed = true; idleRestarts = 0; $('#read-aloud').checked = true; updateArmed(); resumeWake();
  });
}
