const voiceIdValid = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id);
export function validateVoice(value) {
  if (!value || (value.voiceId !== null && !voiceIdValid(value.voiceId)) || typeof value.name !== 'string' || value.name.length > 100) throw new Error('La configuración de voz no es válida.');
  return { voiceId: value.voiceId, name: value.name };
}
export function createVoiceService({ apiKey = process.env.ELEVENLABS_API_KEY, voiceId = process.env.ELEVENLABS_VOICE_ID, request = fetch } = {}) {
  if (voiceId && !voiceIdValid(voiceId)) throw new Error('ELEVENLABS_VOICE_ID no es válido.');
  return {
    configured: Boolean(apiKey), fallbackVoiceId: voiceId || null,
    async clone(input) {
      if (!apiKey) throw new Error('Configura ELEVENLABS_API_KEY en Render.');
      if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80 || /[\u0000-\u001F]/.test(input.name) || !Array.isArray(input.samples) || !input.samples.length || input.samples.length > 4) throw new TypeError('Añade un nombre y entre una y cuatro muestras de audio.');
      const body = new FormData(); body.append('name', input.name.trim()); body.append('description', 'Voz personal para el asistente JARVIS');
      for (const [index, sample] of input.samples.entries()) {
        if (!sample || typeof sample.data !== 'string' || sample.data.length > 683000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(sample.data) || !['audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4'].includes(sample.mime)) throw new TypeError('La muestra de voz no tiene un formato admitido o es demasiado grande.');
        const bytes = Buffer.from(sample.data, 'base64');
        if (!bytes.length || bytes.length > 512000 || bytes.toString('base64') !== sample.data) throw new TypeError('La muestra no es base64 válida o supera 500 KB.');
        const extension = { 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mp4': 'm4a' }[sample.mime];
        body.append('files', new Blob([bytes], { type: sample.mime }), `muestra-${index + 1}.${extension}`);
      }
      const result = await request('https://api.elevenlabs.io/v1/voices/add', { method: 'POST', headers: { 'xi-api-key': apiKey }, body, signal: AbortSignal.timeout(60000) });
      if (!result.ok) throw new Error('ElevenLabs no pudo crear la voz. Revisa la clave, los requisitos de clonación y el plan de tu cuenta. No se reintenta automáticamente.');
      const output = await result.json();
      if (!voiceIdValid(output.voice_id)) throw new Error('El proveedor no devolvió un identificador de voz válido. Revisa tu cuenta antes de reintentar.');
      return { voiceId: output.voice_id, name: input.name.trim() };
    },
    async synthesize(text, id) {
      if (!apiKey || !voiceIdValid(id)) throw new Error('Falta configurar una voz personal y ELEVENLABS_API_KEY.');
      if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw new TypeError('La lectura admite hasta 4000 caracteres.');
      const response = await request(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }), signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error('El proveedor de voz no respondió. Revisa la clave, la voz seleccionada y tu cuota.');
      const type = response.headers.get('content-type')?.split(';')[0] || '';
      if (!['audio/mpeg', 'audio/wav', 'audio/ogg'].includes(type)) throw new Error('El proveedor no devolvió audio compatible.');
      const chunks = []; let bytes = 0;
      for await (const chunk of response.body) { bytes += chunk.length; if (bytes > 10000000) { throw new Error('El audio generado supera el límite.'); } chunks.push(chunk); }
      if (!bytes) throw new Error('El proveedor devolvió audio vacío.');
      return { buffer: Buffer.concat(chunks), type };
    }
  };
}
