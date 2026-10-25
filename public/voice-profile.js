let profile = { clips: [], selected: '' };
let currentAudio = null;
let finishAudio = null;
const $ = selector => document.querySelector(selector);
export const usePersonalVoice = () => $('#voice-engine').value === 'external' && !$('#voice-engine option[value="external"]').disabled;
async function refreshEngine() {
  try {
    const response = await fetch('/api/voice'); const state = await response.json();
    $('#voice-engine option[value="external"]').disabled = !state.ready;
    $('#create-personal-voice').disabled = !state.canClone;
    let selected = ''; try { selected = localStorage.getItem('jarvis.voice.engine') || ''; } catch {}
    $('#voice-engine').value = state.ready && selected !== 'local' ? 'external' : 'local';
    $('#voice-engine-notice').textContent = state.ready ? 'Voz personal preparada. Al usarla se enviará a ElevenLabs el texto que se lea. La voz local no usa ese proveedor.' : state.keyConfigured ? 'Falta crear la voz. Revisa la conexión de base de datos y el acceso a clonación de tu cuenta.' : 'Para la voz personalizada configura ELEVENLABS_API_KEY en Render. Las claves de Gemini o Groq no sirven para este proveedor. Puedes seguir con una voz local.';
  } catch { $('#voice-engine-notice').textContent = 'No se pudo comprobar el motor de voz. Puedes usar una voz local.'; }
}
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('jarvis-voice', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function stored(value) {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction('settings', value ? 'readwrite' : 'readonly');
    const request = value ? tx.objectStore('settings').put(value, 'profile') : tx.objectStore('settings').get('profile');
    tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
function show() {
  $('#greeting-choice').replaceChildren();
  const option = document.createElement('option'); option.value = ''; option.textContent = 'Sin muestra seleccionada'; $('#greeting-choice').append(option);
  for (const clip of profile.clips) { const option = document.createElement('option'); option.value = clip.id; option.textContent = clip.name; $('#greeting-choice').append(option); }
  $('#greeting-choice').value = profile.selected;
}
export function preferredVoice() {
  const voices = window.speechSynthesis?.getVoices().filter(voice => voice.localService && /^es(?:-|$)/i.test(voice.lang)) || [];
  return voices.find(voice => voice.voiceURI === $('#voice-choice')?.value) || voices[0];
}
function showVoices() {
  let selected = ''; try { selected = localStorage.getItem('jarvis.voice.uri') || ''; } catch { /* No almacenar una preferencia no impide hablar. */ }
  $('#voice-choice').replaceChildren();
  const option = document.createElement('option'); option.value = ''; option.textContent = 'Automática · voz local en español'; $('#voice-choice').append(option);
  for (const voice of window.speechSynthesis?.getVoices() || []) if (voice.localService && /^es(?:-|$)/i.test(voice.lang)) { const option = document.createElement('option'); option.value = voice.voiceURI; option.textContent = `${voice.name} (${voice.lang})`; $('#voice-choice').append(option); }
  $('#voice-choice').value = [...$('#voice-choice').options].some(option => option.value === selected) ? selected : '';
}
export function stopGreeting() { if (currentAudio) currentAudio.pause(); finishAudio?.(false); }
export async function playGreeting() {
  const clip = profile.clips.find(clip => clip.id === profile.selected);
  if (!clip) return false;
  stopGreeting();
  return new Promise(resolve => {
    const url = URL.createObjectURL(clip.blob); const audio = new Audio(url); currentAudio = audio;
    let finished = false;
    const done = success => { if (finished) return; finished = true; clearTimeout(timer); audio.onended = null; audio.onerror = null; audio.pause(); audio.src = ''; URL.revokeObjectURL(url); currentAudio = null; finishAudio = null; resolve(success); };
    const timer = setTimeout(() => done(false), 20000); finishAudio = done;
    audio.onended = () => done(true); audio.onerror = () => done(false);
    try { const started = audio.play(); started?.catch(() => done(false)); } catch { done(false); }
  });
}
export async function initVoiceProfile() {
  refreshEngine();
  $('#voice-engine').addEventListener('change', event => { try { localStorage.setItem('jarvis.voice.engine', event.target.value); } catch {} });
  showVoices(); window.speechSynthesis?.addEventListener('voiceschanged', showVoices);
  $('#voice-choice').addEventListener('change', event => { try { localStorage.setItem('jarvis.voice.uri', event.target.value); } catch { $('#voice-profile-notice').textContent = 'La preferencia solo se usará en esta sesión.'; } });
  try { const saved = await stored(); if (saved && Array.isArray(saved.clips) && saved.clips.length <= 4 && saved.clips.every(clip => clip.blob instanceof Blob && clip.blob.size <= 512000)) profile = saved; }
  catch { $('#voice-profile-notice').textContent = 'El navegador no permite guardar grabaciones. Puedes usar una voz local instalada.'; }
  show();
  $('#greeting-upload').addEventListener('change', async event => {
    const files = [...event.target.files];
    try {
      if (!files.length || files.length > 4 || files.some(file => !/\.(ogg|mp3|wav|m4a)$/i.test(file.name) || file.size > 512000)) throw new Error('Elige hasta cuatro audios .ogg, .mp3, .wav o .m4a, de hasta 500 KB cada uno. Descomprime el ZIP primero.');
      const next = { clips: files.map(file => ({ id: crypto.randomUUID(), name: file.name, blob: file })), selected: '' };
      await stored(next); profile = next; show(); $('#voice-profile-notice').textContent = 'Muestras guardadas solo en este dispositivo. Puedes escucharlas y elegir una referencia. Para generar frases nuevas con esa voz falta conectar un motor de síntesis compatible. No se suben a GitHub ni al servidor.';
    } catch (error) { $('#voice-profile-notice').textContent = error.message; }
    event.target.value = '';
  });
  $('#greeting-choice').addEventListener('change', async event => {
    const next = { ...profile, selected: event.target.value };
    try { await stored(next); profile = next; } catch { event.target.value = profile.selected; $('#voice-profile-notice').textContent = 'No se pudo guardar la selección.'; }
  });
  $('#greeting-preview').addEventListener('click', async () => {
    if (!profile.selected) { $('#voice-profile-notice').textContent = 'Elige una muestra para escucharla.'; return; }
    $('#voice-profile-notice').textContent = await playGreeting() ? 'Audio reproducido. Esta es una muestra de audio; reproducirla no genera frases nuevas con esa voz.' : 'No se pudo reproducir. Prueba MP3/WAV, permite audio o usa una voz local.';
  });
  $('#greeting-clear').addEventListener('click', async () => {
    stopGreeting(); const empty = { clips: [], selected: '' };
    try { await stored(empty); profile = empty; show(); $('#voice-profile-notice').textContent = 'Grabaciones eliminadas de este dispositivo.'; } catch { $('#voice-profile-notice').textContent = 'No se pudo borrar la configuración.'; }
  });
  $('#create-personal-voice').addEventListener('click', async () => {
    if (!profile.clips.length) { $('#voice-profile-notice').textContent = 'Carga primero las muestras de una misma voz.'; return; }
    $('#create-personal-voice').disabled = true; $('#voice-profile-notice').textContent = 'Enviando muestras a ElevenLabs para crear tu voz… No repitas la operación mientras termina.';
    try {
      const samples = [];
      for (const clip of profile.clips) {
        const bytes = new Uint8Array(await clip.blob.arrayBuffer()); let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        const extension = clip.name.split('.').at(-1).toLowerCase();
        const mime = { ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4' }[extension];
        samples.push({ data: btoa(binary), mime });
      }
      const response = await fetch('/api/voice/clone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('#personal-voice-name').value, samples }), signal: AbortSignal.timeout(90000) });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error((data.error || 'No se pudo crear la voz.') + (data.voiceId ? ` Identificador creado: ${data.voiceId}` : ''));
      try { localStorage.setItem('jarvis.voice.engine', 'external'); } catch {}
      $('#voice-profile-notice').textContent = 'Voz creada y guardada. Se usará para leer frases nuevas cuando actives la lectura o la escucha de JARVIS. La calidad depende de las muestras y del servicio.';
    } catch (error) { $('#voice-profile-notice').textContent = `No se confirmó la creación: ${error.message}. Revisa las voces de tu cuenta antes de reintentar para evitar crear duplicados.`; }
    finally { await refreshEngine(); }
  });
}

export function selectedReference() { return profile.clips.find(clip => clip.id === profile.selected) || null; }
