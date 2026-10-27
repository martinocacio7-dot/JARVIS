// Small, deterministic tools: never execute input as JavaScript or trust an
// assistant message as a numeric result. Reconstruct context from user turns.
const plain = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!]/g, '').trim();
const number = '-?\\d+(?:[.,]\\d+)?';
const numeric = text => Number(text.replace(',', '.'));
const format = value => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 10, useGrouping: false }).format(Object.is(value, -0) ? 0 : value);
const units = {
  mm: ['length', .001, 'milímetros'], milimetro: ['length', .001, 'milímetros'],
  cm: ['length', .01, 'centímetros'], centimetro: ['length', .01, 'centímetros'],
  m: ['length', 1, 'metros'], metro: ['length', 1, 'metros'],
  km: ['length', 1000, 'kilómetros'], kilometro: ['length', 1000, 'kilómetros'],
  g: ['mass', .001, 'gramos'], gramo: ['mass', .001, 'gramos'],
  kg: ['mass', 1, 'kilogramos'], kilogramo: ['mass', 1, 'kilogramos'], kilo: ['mass', 1, 'kilogramos'],
  mg: ['mass', .000001, 'miligramos'], miligramo: ['mass', .000001, 'miligramos'],
  segundo: ['time', 1, 'segundos'], minuto: ['time', 60, 'minutos'], hora: ['time', 3600, 'horas'],
  ml: ['volume', .001, 'mililitros'], mililitro: ['volume', .001, 'mililitros'],
  l: ['volume', 1, 'litros'], litro: ['volume', 1, 'litros']
};
const unit = name => units[name] || units[name.replace(/s$/, '')];
function checked(value) {
  if (!Number.isFinite(value) || Math.abs(value) > 1e15) throw Error('Ese cálculo excede el rango admitido. Usa valores cuyo resultado no supere 10¹⁵.');
  return value;
}

export function arithmetic(expression) {
  if (expression.length > 250) throw Error('Divide el cálculo en expresiones de hasta 250 caracteres.');
  const tokens = expression.match(/\d+(?:\.\d+)?|[()+*/^−-]/g) || [];
  if (!tokens.length || tokens.join('') !== expression.replace(/\s/g, '')) return null;
  if (tokens.length > 100) throw Error('Divide el cálculo en pasos más pequeños.');
  let pos = 0, depth = 0;
  const take = () => tokens[pos++];
  function atom() {
    if (++depth > 20) throw Error('Hay demasiados paréntesis o signos anidados.');
    let value, t = take();
    if (t === '(') { value = sum(); if (take() !== ')') throw Error('Revisa los paréntesis del cálculo.'); }
    else if (t && /^\d/.test(t)) value = Number(t);
    else throw Error('Falta un número o hay un signo fuera de lugar.');
    depth--; return checked(value);
  }
  function power() {
    let left = atom();
    if (tokens[pos] === '^') {
      take(); const exponent = unary();
      if (!Number.isInteger(exponent) || Math.abs(exponent) > 12) throw Error('Admito exponentes enteros entre −12 y 12.');
      left = checked(left ** exponent);
    }
    return left;
  }
  function unary() {
    if(tokens[pos] === '+' || tokens[pos] === '-') { const sign = take(); return (sign === '-' ? -1 : 1) * unary(); }
    return power();
  }
  function product() {
    let left = unary();
    while (tokens[pos] === '*' || tokens[pos] === '/') {
      const op = take(), right = unary();
      if (op === '/' && right === 0) throw Error('No se puede dividir entre cero.');
      left = checked(op === '*' ? left * right : left / right);
    }
    return left;
  }
  function sum() {
    let left = product();
    while (tokens[pos] === '+' || tokens[pos] === '-') { const op = take(), right = product(); left = checked(op === '+' ? left + right : left - right); }
    return left;
  }
  const value = sum();
  if (pos !== tokens.length) throw Error('Revisa los signos y los paréntesis del cálculo.');
  return value;
}

function solve(text, previous) {
  let phrase = plain(text).replace(/^jarvis[, ]+/, '').replace(/ por favor$/, '');
  let match = phrase.match(new RegExp(`^(?:convierte|convertir|pasa) (${number}) ([a-z]+) (?:a|en) ([a-z]+)$`));
  if (match) {
    const from = unit(match[2]), to = unit(match[3]);
    if (!from || !to) return { reply: 'Todavía no convierto esas unidades. Admito longitud métrica, masa, duración y litros/mililitros; dime la cantidad y las dos unidades.' };
    if (from[0] !== to[0]) return { reply: 'Esas unidades miden cosas distintas. No puedo convertirlas sin más datos.' };
    const value = checked(numeric(match[1]) * from[1] / to[1]);
    return { value, reply: `${match[1]} ${match[2]} equivalen a ${format(value)} ${to[2]}.` };
  }
  match = phrase.match(new RegExp(`^(?:cuanto es |calcula |dime )?(?:el )?(${number})\\s*(?:%|por ciento) (?:de|sobre) (${number})$`));
  if (match) {
    const value = checked(numeric(match[1]) * numeric(match[2]) / 100);
    return { value, reply: `El ${match[1]} % de ${match[2]} es ${format(value)}. Se calcula multiplicando ${match[2]} por ${match[1]} y dividiendo entre 100.` };
  }
  const continuation = phrase.match(/^y (?:eso |el resultado )?(?:(sumale|restale|multiplicalo|dividelo) |(mas|menos|por|entre) )(.+)$/);
  if (continuation) {
    if (previous === null) return { reply: '¿Qué número o resultado quieres usar? Dime primero el cálculo completo.' };
    const op = ({ sumale: '+', restale: '-', multiplicalo: '*', dividelo: '/', mas: '+', menos: '-', por: '*', entre: '/' })[continuation[1] || continuation[2]];
    phrase = `(${previous}) ${op} (${continuation[3].replace(/^(?:por|entre) /, '')})`;
  } else phrase = phrase.replace(/^(?:cuanto es|cuanto da|calcula|resuelve|calcular) /, '');
  const expression = phrase.replace(/,/g, '.').replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
    .replace(/multiplicado por/g, '*').replace(/dividido (?:por|entre)/g, '/').replace(/elevado a/g, '^')
    .replace(/\bmas\b/g, '+').replace(/\bmenos\b/g, '-').replace(/\bpor\b/g, '*').replace(/\bentre\b/g, '/');
  // Avoid intercepting ordinary messages or bare numbers used as reminder replies.
  if (!/[+*/^()-]/.test(expression) || !/^[\d\s.+*/^()-]+$/.test(expression)) return null;
  const value = arithmetic(expression);
  return value === null ? null : { value, reply: `${expression.trim()} = ${format(value)}. Respeto paréntesis, potencias, multiplicación/división y después suma/resta.` };
}

export function reasoningReply(messages) {
  let previous = null, result = null;
  for (const message of messages) {
    if (message.role !== 'user') continue;
    if (message.content.length > 8000) { previous = null; result = null; continue; }
    try { result = solve(message.content, previous); }
    catch (error) { result = { reply: error.message }; }
    previous = typeof result?.value === 'number' ? result.value : null;
  }
  return result ? { mode: 'assistant', intent: 'calculo_local', reply: result.reply } : null;
}
