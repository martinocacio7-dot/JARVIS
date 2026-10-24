// Red neuronal de una capa: bolsa de palabras → neuronas softmax.
// Los pesos se aprenden por descenso de gradiente con entropía cruzada.
export const tokenize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]+/g) || [];
function features(text, vocabulary) {
  const words = new Set(tokenize(text));
  return vocabulary.map(word => words.has(word) ? 1 : 0);
}
function probabilities(vector, weights) {
  const scores = weights.map(row => row.at(-1) + vector.reduce((sum, x, i) => sum + x * row[i], 0));
  const exp = scores.map(score => Math.exp(score - Math.max(...scores)));
  const total = exp.reduce((a, b) => a + b, 0);
  return exp.map(value => value / total);
}
export function train(intents, epochs = 600) {
  if (!Array.isArray(intents) || intents.length < 2 || intents.some(i => !i.id || !i.reply || !Array.isArray(i.examples) || !i.examples.length || i.examples.some(e => typeof e !== 'string' || !tokenize(e).length)) || new Set(intents.map(i => i.id)).size !== intents.length) throw new Error('Se requieren intenciones únicas con ejemplos y respuestas.');
  const vocabulary = [...new Set(intents.flatMap(intent => intent.examples.flatMap(tokenize)))].sort();
  const weights = intents.map(() => Array(vocabulary.length + 1).fill(0));
  const samples = intents.flatMap((intent, label) => intent.examples.map(text => ({ vector: features(text, vocabulary), label })));
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const { vector, label } of samples) {
      const prediction = probabilities(vector, weights);
      weights.forEach((row, k) => {
        const error = prediction[k] - Number(k === label);
        vector.forEach((value, j) => { row[j] -= 0.08 * error * value; });
        row[vocabulary.length] -= 0.08 * error;
      });
    }
  }
  return { version: 1, architecture: 'bag-of-words-softmax', epochs, vocabulary, weights, intents: intents.map(({ id, reply }) => ({ id, reply })) };
}
export function predict(model, text) {
  const vector = features(text, model.vocabulary);
  const tokens = tokenize(text);
  const coverage = tokens.length ? tokens.filter(t => model.vocabulary.includes(t)).length / tokens.length : 0;
  const scores = probabilities(vector, model.weights);
  const best = scores.indexOf(Math.max(...scores));
  const recognized = coverage >= 0.5 && scores[best] >= 0.75;
  return { intent: recognized ? model.intents[best].id : 'desconocido', confidence: scores[best], reply: recognized ? model.intents[best].reply : 'Mi red local todavía no sabe responder a eso. Reconozco intenciones básicas como saludos, ayuda e identidad. Puedes ampliar mis ejemplos de entrenamiento o conectar un modelo de lenguaje.' };
}
