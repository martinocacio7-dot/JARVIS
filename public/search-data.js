export function searchCommand(text) {
  const key = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().replace(/^jarvis /, '').replace(/ por favor$/, '');
  if (/^(?:(?:abre|muestra|dime|lee) )?(?:las )?noticias(?: de hoy)?$/.test(key)) return { query: 'noticias Ecuador hoy' };
  const news = key.match(/^(?:(?:busca|muestra|dime|lee) )?(?:las )?noticias (?:sobre|de) (.+)$/);
  if (news) return { query: 'noticias ' + news[1] };
  if (/ (?:musica|canciones)(?: .*)?$/.test(key)) return null;
  const match = key.match(/^(?:busca|buscar|investiga|consulta|buscame)(?: (?:en google|en internet|en la web))?(?: sobre)? (.+)$/);
  if (!match) return null;
  let query = match[1].replace(/ (?:en google|en internet|en la web)$/, '');
  if (/^en (?:google|internet|la web)$/.test(query)) query = '';
  return { query };
}
export function searchUrl(query) { const url = new URL('https://www.google.com/search'); url.searchParams.set('q', query); url.searchParams.set('hl', 'es'); return url.href; }
export function safeSource(source) {
  if (!source || typeof source.title !== 'string' || typeof source.url !== 'string') return null;
  try { const url = new URL(source.url); if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2000) return null; return { title: source.title.slice(0, 160), url: url.href }; } catch { return null; }
}
