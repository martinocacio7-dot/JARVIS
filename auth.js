import { createHash, timingSafeEqual } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest();

// HTTP Basic exige HTTPS al publicarlo. Render proporciona TLS en su dominio.
// Sin contraseña se permite únicamente el flujo local de desarrollo.
export function createAuth({ password = process.env.JARVIS_PASSWORD, username = process.env.JARVIS_USER || 'jarvis', production = process.env.NODE_ENV === 'production', now = Date.now } = {}) {
  if (!password) {
    if (production) throw new Error('Configura JARVIS_PASSWORD antes de publicar JARVIS.');
    return () => true;
  }
  if (password.length < 16) throw new Error('JARVIS_PASSWORD debe tener al menos 16 caracteres.');
  if (!username || username.includes(':')) throw new Error('JARVIS_USER debe ser válido y no contener dos puntos.');
  const expected = digest(`${username}:${password}`);
  // Límite global para una aplicación de un solo usuario; no confiamos en
  // cabeceras X-Forwarded-For enviadas por clientes para eludir el límite.
  let failures = 0;
  let windowStart = now();
  return (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (now() - windowStart >= 60000) { failures = 0; windowStart = now(); }
    if (failures >= 10) {
      res.writeHead(429, { 'Retry-After': String(Math.max(1, Math.ceil((60000 - (now() - windowStart)) / 1000))), 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Demasiados intentos. Espera un minuto antes de volver a entrar.');
      return false;
    }
    const header = req.headers.authorization || '';
    const match = header.length <= 2048 && header.match(/^Basic ([A-Za-z0-9+/]+={0,2})$/i);
    if (match && timingSafeEqual(digest(Buffer.from(match[1], 'base64').toString('utf8')), expected)) return true;
    // Abrir la página sin credenciales muestra el diálogo del navegador; no
    // cuenta como un intento de contraseña incorrecta.
    if (header) failures++;
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="JARVIS privado", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('JARVIS es privado. Introduce tu usuario y contraseña.');
    return false;
  };
}
