import { normalize } from '../public/library-data.js';

const escapeHtml = text => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const styles = `:root{font-family:system-ui,sans-serif;color:#e9efff;background:#101724;color-scheme:dark}*{box-sizing:border-box}body{margin:0;padding:32px 16px}main{max-width:900px;margin:auto}h1{color:#9fc0ff}form,.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}input,button{font:inherit;padding:12px;border:1px solid #456080;border-radius:8px;background:#1b2a40;color:inherit}input{min-width:0;flex:1}button{cursor:pointer;background:#294a7b}button:hover{background:#39649e}button:focus-visible,input:focus-visible{outline:3px solid #a3c8ff;outline-offset:2px}ul{list-style:none;padding:0}li{display:flex;align-items:center;gap:12px;padding:14px;background:#182439;border-radius:8px;margin:10px 0;overflow-wrap:anywhere}li span{flex:1}li.done span{text-decoration:line-through;color:#92a0b7}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #354961;overflow-wrap:anywhere}.table-wrap{overflow-x:auto}#notice{min-height:28px;color:#bcd5ff}footer{color:#91a2bb;font-size:13px;margin-top:28px}output{display:block;font-size:28px;margin-top:20px}label{display:flex;flex-direction:column;gap:8px}#task-form input{flex-basis:200px}#task-form label{flex:1}@media(max-width:600px){form{flex-direction:column}button{min-height:44px}li{flex-wrap:wrap}td button{padding:8px}}`;

const persistence = key => `const key = ${JSON.stringify(key)};
const notice = document.querySelector('#notice');
let records = [];
try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(saved)) records = saved.filter(validRecord);
} catch { notice.textContent = 'No se pudo recuperar el historial de este navegador.'; }
function save(next) {
  try { localStorage.setItem(key, JSON.stringify(next)); records = next; render(); notice.textContent = 'Guardado en este navegador.'; return true; }
  catch { notice.textContent = 'No se pudo guardar. Revisa el espacio o los permisos de almacenamiento.'; return false; }
}
function action(label, handler) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', handler); return button; }
`;

const templates = {
  tareas: {
    title: 'Mis tareas',
    body: `<form id="task-form"><label for="task">Nueva tarea<input id="task" maxlength="200" required autocomplete="off"></label><button>Añadir tarea</button></form><p id="notice" role="status"></p><p id="summary"></p><ul id="tasks" aria-label="Tareas"></ul>`,
    code: `function validRecord(item) { return item && typeof item.id === 'string' && typeof item.text === 'string' && item.text.length <= 200 && typeof item.done === 'boolean'; }
${persistence('jarvis-generated-tasks-v1')}
function render() {
  document.querySelector('#summary').textContent = records.filter(item => !item.done).length + ' tareas pendientes';
  document.querySelector('#tasks').replaceChildren(...records.map(item => {
    const row = document.createElement('li'); row.className = item.done ? 'done' : '';
    const text = document.createElement('span'); text.textContent = item.text;
    row.append(text, action(item.done ? 'Reabrir' : 'Completar', () => save(records.map(record => record.id === item.id ? {...record, done: !record.done} : record))), action('Eliminar', () => save(records.filter(record => record.id !== item.id))));
    return row;
  }));
}
document.querySelector('#task-form').addEventListener('submit', event => {
  event.preventDefault(); const input = document.querySelector('#task'); const text = input.value.trim();
  if (!text) return;
  if (save([...records, {id: crypto.randomUUID(), text, done: false}])) { input.value = ''; input.focus(); }
});
render();`
  },
  inventario: {
    title: 'Mi inventario',
    body: `<form id="product-form"><label for="product">Producto<input id="product" maxlength="120" required></label><label for="quantity">Cantidad<input id="quantity" type="number" min="0" max="1000000" step="1" value="1" required></label><label for="price">Precio unitario<input id="price" type="number" min="0" max="1000000000" step="0.01" value="0" required></label><button>Guardar producto</button></form><p id="notice" role="status"></p><p id="total"></p><div class="table-wrap"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Acciones</th></tr></thead><tbody id="products"></tbody></table></div>`,
    code: `function validRecord(item) { return item && typeof item.id === 'string' && typeof item.name === 'string' && item.name.length <= 120 && Number.isSafeInteger(item.quantity) && item.quantity >= 0 && item.quantity <= 1000000 && Number.isFinite(item.price) && item.price >= 0 && item.price <= 1000000000; }
${persistence('jarvis-generated-inventory-v1')}
let editing = null;
function render() {
  document.querySelector('#total').textContent = 'Valor total: ' + records.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2);
  document.querySelector('#products').replaceChildren(...records.map(item => {
    const row = document.createElement('tr');
    for (const value of [item.name, item.quantity, item.price.toFixed(2)]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
    const controls = document.createElement('td');
    controls.append(action('Editar', () => { editing = item.id; document.querySelector('#product').value = item.name; document.querySelector('#quantity').value = item.quantity; document.querySelector('#price').value = item.price; document.querySelector('#product').focus(); }), action('Eliminar', () => { if (save(records.filter(record => record.id !== item.id)) && editing === item.id) { editing = null; document.querySelector('#product-form').reset(); } }));
    row.append(controls); return row;
  }));
}
document.querySelector('#product-form').addEventListener('submit', event => {
  event.preventDefault();
  const item = {id: editing || crypto.randomUUID(), name: document.querySelector('#product').value.trim(), quantity: Number(document.querySelector('#quantity').value), price: Number(document.querySelector('#price').value)};
  if (!item.name || !validRecord(item)) { notice.textContent = 'Revisa el nombre, la cantidad entera y el precio positivo.'; return; }
  const next = editing ? records.map(record => record.id === editing ? item : record) : [...records, item];
  if (save(next)) { editing = null; event.target.reset(); }
});
render();`
  },
  calculadora: {
    title: 'Calculadora',
    body: `<form id="calculate-form"><label for="first">Primer número<input id="first" type="number" step="any" required></label><label for="second">Segundo número<input id="second" type="number" step="any" required></label><div class="toolbar"><button value="sum">Sumar</button><button value="subtract">Restar</button><button value="multiply">Multiplicar</button><button value="divide">Dividir</button></div></form><p id="notice" role="status"></p><output id="result" aria-live="polite">Introduce dos números.</output>`,
    code: `document.querySelector('#calculate-form').addEventListener('submit', event => {
  event.preventDefault();
  const first = Number(document.querySelector('#first').value); const second = Number(document.querySelector('#second').value);
  const operation = event.submitter?.value || 'sum';
  const result = document.querySelector('#result'); const notice = document.querySelector('#notice');
  notice.textContent = '';
  if (!Number.isFinite(first) || !Number.isFinite(second)) { notice.textContent = 'Introduce números finitos.'; result.textContent = ''; return; }
  if (operation === 'divide' && second === 0) { notice.textContent = 'No se puede dividir entre cero.'; result.textContent = ''; return; }
  const value = operation === 'sum' ? first + second : operation === 'subtract' ? first - second : operation === 'multiply' ? first * second : first / second;
  if (!Number.isFinite(value)) { notice.textContent = 'El resultado está fuera del rango permitido.'; result.textContent = ''; return; }
  result.textContent = String(value);
});`
  }
};

export function isDevelopmentRequest(prompt) {
  const text = normalize(prompt);
  return /^(jarvis )?(crea(me)?|haz(me)?|desarrolla(me)?|genera(me)?|construye(me)?)\b/.test(text) && /\b(codigo|app|aplicacion|programa|calculadora|inventario|tareas|html|web|sistema|pagina)\b/.test(text);
}

export function develop(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000) throw new Error('Describe el proyecto con hasta 8000 caracteres.');
  const text = normalize(prompt);
  const kinds = Object.keys(templates).filter(kind => new RegExp(`\\b${kind}\\b`).test(text));
  const unsupported = /\b(python|java|react|angular|vue|php|sql|postgresql|mysql|mongodb|backend|servidor|login|autenticacion|usuarios|pagos|api|android|ios)\b/.test(text);
  if (kinds.length !== 1 || unsupported) return {
    mode: 'development', project: null,
    reply: 'Mi generador propio todavía crea tres prototipos web: tareas, inventario o calculadora, con HTML, CSS y JavaScript. No implementa bases de datos, usuarios, pagos ni otros lenguajes. Prueba «Desarrolla un inventario en HTML». Si necesitas funciones adicionales, todavía no puedo generarlas automáticamente.'
  };
  const kind = kinds[0];
  const template = templates[kind];
  const titleMatch = prompt.match(/(?:titulad[oa]|llamad[oa]|titulo)\s+["“]([^"”\r\n]{1,80})["”]/iu);
  const title = titleMatch?.[1] || template.title;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>${styles}</style></head>
<body><main><h1>${escapeHtml(title)}</h1>${template.body}<footer>Creado por el generador local de JARVIS. Prototipo sin servidor, cuentas ni base de datos; los datos se guardan solo en este navegador cuando corresponde.</footer></main><script>${template.code}</script></body></html>\n`;
  return {
    mode: 'development',
    reply: `Preparé un prototipo de ${kind} con mi generador local, sin consultar otras IA. Descarga el archivo HTML y ábrelo en tu navegador. Puedes revisar y copiar el código aquí.\n\nIncluye solo las funciones del prototipo; no incorpora automáticamente todos los requisitos de una petición libre. No usa la base de datos de JARVIS, no tiene cuentas y no se publica por sí solo.`,
    project: { kind, title, filename: `jarvis-${kind}.html`, code: html }
  };
}
