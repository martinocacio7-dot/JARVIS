import { spawn } from 'node:child_process';
import path from 'node:path';
import { normalize } from '../public/library-data.js';

const sites = new Map([
 ['google', ['Google', 'https://www.google.com/']], ['youtube', ['YouTube', 'https://www.youtube.com/']],
 ['you tube', ['YouTube', 'https://www.youtube.com/']], ['whatsapp', ['WhatsApp Web', 'https://web.whatsapp.com/']],
 ['guassa', ['WhatsApp Web', 'https://web.whatsapp.com/']], ['wasap', ['WhatsApp Web', 'https://web.whatsapp.com/']],
 ['noticias', ['Google Noticias', 'https://news.google.com/home?hl=es&gl=EC&ceid=EC:es']]
]);
export function desktopAction(text, platform = process.platform) {
 const key = normalize(text).replace(/^jarvis /, '').replace(/ por favor$/, '');
 const match = key.match(/^(?:abre|abrir|abreme|(?:entra|ingresa|ingrese) (?:a|en|al)) (?:(?:la|mi) (?:aplicacion|app) |el |la )?(.+)$/);
 if (!match) return null;
 const target = match[1];const site = sites.get(target);
 if (site) return { kind: 'site', label: site[0], url: site[1] };
 if (/^(?:calculadora|calculator)$/.test(target)) return { kind: 'app', label: 'Calculadora', app: 'calculator' };
 if (/^(?:bloc de notas|notepad|editor de texto)$/.test(target)) return { kind: 'app', label: 'Editor de texto', app: 'editor' };
 return { kind: 'unsupported', label: target };
}
export function desktopLaunch(action, platform = process.platform, systemRoot = process.env.SystemRoot || 'C:\\Windows') {
 if (action.kind === 'site') {
  // URLs originate only from the fixed map above, never from user-supplied command arguments.
  if (![...sites.values()].some(([,url]) => url === action.url)) throw TypeError('Destino no admitido');
  if (platform === 'win32') return { file: path.win32.join(systemRoot, 'System32', 'rundll32.exe'), args: ['url.dll,FileProtocolHandler', action.url] };
  if (platform === 'darwin') return { file: '/usr/bin/open', args: [action.url] };
  return { file: 'xdg-open', args: [action.url] };
 }
 if (action.kind !== 'app' || !['calculator', 'editor'].includes(action.app)) throw TypeError('Aplicación no admitida');
 if (platform === 'win32') return { file: path.win32.join(systemRoot, 'System32', action.app === 'calculator' ? 'calc.exe' : 'notepad.exe'), args: [] };
 if (platform === 'darwin') return { file: '/usr/bin/open', args: ['-a', action.app === 'calculator' ? 'Calculator' : 'TextEdit'] };
 return { file: action.app === 'calculator' ? 'gnome-calculator' : 'gedit', args: [] };
}
function launch(file, args) {
 return new Promise((resolve, reject) => {
  const child = spawn(file, args, { shell: false, stdio: 'ignore', detached: true });
  child.once('error', reject);child.once('spawn', () => { child.unref();resolve(); });
 });
}
export function createDesktop({ platform = process.platform, execute = launch } = {}) {
 return async text => {
  const action = desktopAction(text, platform);if (!action) return null;
  if (action.kind === 'unsupported') return { mode: 'desktop', reply: 'En este modo puedo abrir Calculadora, Bloc de notas, Google, YouTube, WhatsApp Web o Noticias. ¿Cuál quieres abrir?' };
  try { const command = desktopLaunch(action, platform);await execute(command.file, command.args);return { mode: 'desktop', reply: `Solicité abrir ${action.label} en este computador. No he confirmado que la ventana haya terminado de cargar.` }; }
  catch { return { mode: 'desktop', reply: `No pude solicitar la apertura de ${action.label}. Comprueba que esté disponible en este computador.` }; }
 };
}
