import { searchUrl, safeSource } from '../public/search-data.js';
export function createGoogleSearch({ key = process.env.GOOGLE_SEARCH_API_KEY, engine = process.env.GOOGLE_SEARCH_ENGINE_ID, request = fetch, now = Date.now } = {}) {
  let recent = [];
  return async query => {
    if (typeof query !== 'string' || !query.trim() || query.length > 300) throw new TypeError('Escribe un tema de entre 1 y 300 caracteres.');
    query = query.trim();
    const fallback = { mode: 'search', sources: [{ title: 'Abrir esta búsqueda en Google', url: searchUrl(query) }] };
    if (!key || !engine) return { ...fallback, configured: false, reply: 'La consulta directa de Google no está configurada. Puedes abrir el enlace para buscar. No he leído ni verificado esos resultados.' };
    recent = recent.filter(time => now() - time < 60000);
    if (recent.length >= 10) return { ...fallback, reply: 'Espera un minuto antes de otra consulta de Google. No se realizó esta búsqueda.' };
    recent.push(now());
    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      for (const [name, value] of Object.entries({ key, cx: engine, q: query, num: '3', hl: 'es' })) url.searchParams.set(name, value);
      const signal = AbortSignal.timeout(10000);
      const response = await request(url, { signal, redirect: 'error' });
      if (!response.ok) throw Error('Search unavailable');
      let text = ''; let bytes = 0; const reader = response.body.getReader(); const decoder = new TextDecoder();
      try { for (;;) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 131072 || signal.aborted) throw Error('Response limit'); text += decoder.decode(value, { stream: true }); } text += decoder.decode(); } finally { await reader.cancel().catch(() => {}); }
      const data = JSON.parse(text);const sources = [];
      for (const item of Array.isArray(data.items) ? data.items : []) {
        if (sources.length >= 3) break;
        const source = safeSource({ title: item?.title, url: item?.link });
        if (!source || typeof item?.snippet !== 'string' || !item.snippet.trim()) continue;
        sources.push({ ...source, snippet: item.snippet.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 600) });
      }
      return { mode: 'search', configured: true, sources, reply: sources.length ? 'Esto es lo que muestran los fragmentos de Google:\n\n' + sources.map((s, i) => `${i + 1}. ${s.title}\n${s.snippet}`).join('\n\n') + '\n\nSon extractos del buscador: no he leído las páginas completas, contrastado sus afirmaciones ni confirmado que estén actualizadas.' : 'Google no devolvió fragmentos utilizables. Prueba una búsqueda más concreta.' };
    } catch { return { ...fallback, reply: 'No pude consultar Google. Revisa su configuración, acceso y cuota. Puedes abrir el enlace; no se ha verificado ninguna fuente.' }; }
  };
}
