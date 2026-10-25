// MLP propio: palabras, pares de palabras y trigramas → tanh → softmax.
// Entrenamiento determinista por retropropagación, sin bibliotecas de IA.
export const tokenize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]+/g) || [];
const commonWords = new Set('a al con de del el la las los un una unos unas que como en es mi tu me te se y o por para su lo le quiero puedes favor jarvis'.split(' '));
const cache = new WeakMap();
const unknownReply = 'Todavía no sé responder a eso con mi red local. Puedo guiarte en programación, proyectos, organización o conceptos de inteligencia artificial. También puedo explicar mi memoria, biblioteca y entrenamiento.';

function randomSource(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
function softmax(scores) {
  const max = Math.max(...scores);
  const exp = scores.map(value => Math.exp(value - max));
  const total = exp.reduce((a, b) => a + b, 0);
  return exp.map(value => value / total);
}
function nearWord(a, b) {
  if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}
function context(model) {
  if (!cache.has(model)) cache.set(model, { featureIndex: new Map(model.features.map((key, i) => [key, i])), vocabulary: new Set(model.vocabulary), corrections: new Map() });
  return cache.get(model);
}
function prepare(model, text) {
  const state = context(model);
  const tokens = tokenize(text).map(token => {
    if (state.vocabulary.has(token)) return token;
    if (state.corrections.has(token)) return state.corrections.get(token);
    const matches = model.vocabulary.filter(word => nearWord(token, word));
    const corrected = matches.length === 1 ? matches[0] : token;
    if (state.corrections.size < 2000) state.corrections.set(token, corrected);
    return corrected;
  });
  const active = new Map();
  const add = (key, value) => { const index = state.featureIndex.get(key); if (index !== undefined) active.set(index, value); };
  tokens.forEach((word, i) => {
    add(`w:${word}`, 1);
    if (i) add(`b:${tokens[i - 1]} ${word}`, 0.7);
    const marked = `^${word}$`;
    for (let j = 0; j < marked.length - 2; j++) {
      let hash = 0;
      for (let k = j; k < j + 3; k++) hash = (hash * 31 + marked.charCodeAt(k)) >>> 0;
      add(`c:${hash % 128}`, 0.15);
    }
  });
  const contentTokens = tokens.filter(token => !commonWords.has(token));
  const informative = contentTokens.length ? contentTokens : tokens;
  const coverage = informative.length ? informative.filter(token => state.vocabulary.has(token)).length / informative.length : 0;
  return { active: [...active], coverage };
}
function forward(model, active) {
  const hidden = model.inputWeights.map((row, h) => {
    let sum = model.hiddenBias[h];
    for (const [index, value] of active) sum += row[index] * value;
    return Math.tanh(sum);
  });
  const scores = model.outputWeights.map((row, k) => {
    let sum = model.outputBias[k];
    for (let h = 0; h < hidden.length; h++) sum += row[h] * hidden[h];
    return sum;
  });
  return { hidden, probabilities: softmax(scores) };
}
export function train(intents, epochs = 450) {
  if (!Number.isInteger(epochs) || epochs < 1 || epochs > 3000) throw new Error('Las épocas deben estar entre 1 y 3000.');
  if (!Array.isArray(intents) || intents.length < 2 || intents.some(i => !i || !i.id || !i.reply || !Array.isArray(i.examples) || !i.examples.length || i.examples.some(e => typeof e !== 'string' || !tokenize(e).length)) || new Set(intents.map(i => i.id)).size !== intents.length) throw new Error('Se requieren intenciones únicas con ejemplos y respuestas.');
  const vocabulary = [...new Set(intents.flatMap(intent => intent.examples.flatMap(tokenize)))].sort();
  const bigrams = [...new Set(intents.flatMap(intent => intent.examples.flatMap(text => { const tokens = tokenize(text); return tokens.slice(1).map((word, i) => `${tokens[i]} ${word}`); })))].sort();
  const features = [...vocabulary.map(word => `w:${word}`), ...bigrams.map(pair => `b:${pair}`), ...Array.from({ length: 128 }, (_, i) => `c:${i}`)];
  const random = randomSource(20261025);
  const hiddenSize = 32;
  const weights = (rows, columns) => Array.from({ length: rows }, () => Array.from({ length: columns }, () => (random() * 2 - 1) * Math.sqrt(6 / (rows + columns))));
  const model = {
    version: 2, architecture: 'word-bigram-char-mlp', epochs, hiddenSize, vocabulary, features,
    inputWeights: weights(hiddenSize, features.length), hiddenBias: Array(hiddenSize).fill(0),
    outputWeights: weights(intents.length, hiddenSize), outputBias: Array(intents.length).fill(0),
    intents: intents.map(({ id, reply, examples }) => ({ id, reply, example: examples[0] }))
  };
  const samples = intents.flatMap((intent, label) => intent.examples.map(text => ({ active: prepare(model, text).active, label })));
  const initialLoss = samples.reduce((sum, sample) => sum - Math.log(Math.max(1e-12, forward(model, sample.active).probabilities[sample.label])), 0) / samples.length;
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = samples.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [samples[i], samples[j]] = [samples[j], samples[i]]; }
    const rate = 0.045 * (1 - 0.7 * epoch / epochs);
    for (const { active, label } of samples) {
      const { hidden, probabilities } = forward(model, active);
      const error = probabilities.map((value, k) => value - (k === label ? 0.98 : 0.02 / (intents.length - 1)));
      const hiddenError = hidden.map((value, h) => (1 - value * value) * error.reduce((sum, delta, k) => sum + delta * model.outputWeights[k][h], 0));
      for (let k = 0; k < intents.length; k++) {
        for (let h = 0; h < hiddenSize; h++) model.outputWeights[k][h] -= rate * error[k] * hidden[h];
        model.outputBias[k] -= rate * error[k];
      }
      for (let h = 0; h < hiddenSize; h++) {
        for (const [index, value] of active) model.inputWeights[h][index] -= rate * hiddenError[h] * value;
        model.hiddenBias[h] -= rate * hiddenError[h];
      }
    }
  }
  const finalLoss = samples.reduce((sum, sample) => sum - Math.log(Math.max(1e-12, forward(model, sample.active).probabilities[sample.label])), 0) / samples.length;
  model.training = { examples: samples.length, initialLoss, finalLoss, seed: 20261025 };
  return model;
}
export function predict(model, text) {
  if (model.version !== 2) throw new Error('Ejecuta npm run train para actualizar el modelo a la versión 2.');
  const { active, coverage } = prepare(model, text);
  const { probabilities } = forward(model, active);
  const order = probabilities.map((confidence, index) => ({ confidence, index })).sort((a, b) => b.confidence - a.confidence);
  const best = order[0];
  const recognized = coverage >= 0.6 && best.confidence >= 0.75 && best.confidence - order[1].confidence >= 0.2;
  const suggestions = !recognized && coverage >= 0.6 ? order.slice(0, 2).filter(item => item.confidence >= 0.15).map(item => model.intents[item.index].example) : [];
  return {
    intent: recognized ? model.intents[best.index].id : 'desconocido', confidence: best.confidence,
    reply: recognized ? model.intents[best.index].reply : suggestions.length ? 'No estoy seguro de lo que necesitas. Puedes elegir una de estas opciones o explicarlo de otra manera.' : unknownReply,
    ...(suggestions.length ? { suggestions } : {})
  };
}
