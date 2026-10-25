import { readFile, writeFile, rename } from 'node:fs/promises';
import { train, predict } from '../neural/network.js';
import { normalize } from '../public/library-data.js';
import { resolve } from 'node:path';
const read = async name => JSON.parse(await readFile(new URL(`../neural/${name}`, import.meta.url), 'utf8'));
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--data', '--hidden-size'].includes(args[i]) || !args[i + 1] || options[args[i]] !== undefined) throw new Error('Uso: npm run train [-- --data archivo.json] [--hidden-size 32|64|128]');
  options[args[i]] = args[i + 1];
}
if (options['--hidden-size'] !== undefined && !['32', '64', '128'].includes(options['--hidden-size'])) throw new Error('El tamaño oculto debe ser 32, 64 o 128.');
const intents = options['--data'] ? JSON.parse(await readFile(resolve(options['--data']), 'utf8')) : await read('intents.json');
const generalizationData = await read('generalization.json');
const reserved = [...await read('evaluation.json'), ...await read('challenge.json'), ...generalizationData.development, ...generalizationData.test];
const forbidden = new Set(reserved.map(item => normalize(item.text)));
if (intents.some(intent => intent.examples.some(text => forbidden.has(normalize(text))))) throw new Error('Los datos incluyen una frase de evaluación reservada. No se entrenó ni reemplazó el modelo.');
let previousModel;
try { previousModel = await read('model.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const model = train(intents, 450, { hiddenSize: Number(options['--hidden-size'] ?? previousModel?.hiddenSize ?? 32) });
const samples = intents.flatMap(i => i.examples.map(text => ({ text, intent: i.id })));
const evaluate = (cases, selected = model) => cases.map(({ text, intent }) => ({ text, expected: intent, predicted: predict(selected, text).intent }));
const count = results => results.filter(row => row.expected === row.predicted).length;
const training = evaluate(samples);
const evaluation = evaluate(await read('evaluation.json'));
const challenge = evaluate(await read('challenge.json'));
const baseline = await read('baseline.json');
const development = evaluate(generalizationData.development);
const test = evaluate(generalizationData.test);
const upgradeBaseline = await read('upgrade-baseline.json');
const previous = previousModel ? { regression: count(evaluate(await read('evaluation.json'), previousModel)), challenge: count(evaluate(await read('challenge.json'), previousModel)), development: count(evaluate(generalizationData.development, previousModel)), test: count(evaluate(generalizationData.test, previousModel)) } : null;
const comparison = evaluate(baseline.results);
const parameters = model.hiddenSize * model.features.length + model.hiddenSize + model.intents.length * model.hiddenSize + model.intents.length;
console.log(`Red v${model.version}: ${model.features.length} entradas, ${model.hiddenSize} neuronas ocultas, ${model.intents.length} salidas y ${parameters} parámetros.`);
console.log(`Entrenamiento: ${count(training)}/${training.length}; pérdida ${model.training.initialLoss.toFixed(4)} → ${model.training.finalLoss.toFixed(4)}.`);
console.log(`Regresión anterior: ${count(evaluation)}/${evaluation.length}. Desafío ampliado: ${count(challenge)}/${challenge.length}.`);
console.log(`Mismos ${comparison.length} casos de comparación: antes ${baseline.results.filter(r => r.before === r.intent).length}, ahora ${count(comparison)}. No mide inteligencia general.`);
console.log(`Frases nuevas: desarrollo ${count(development)}/${development.length}; prueba separada ${count(test)}/${test.length}.`);
const regressed = previous && (count(evaluation) < previous.regression || count(challenge) < previous.challenge || count(development) < previous.development || count(test) < previous.test);
if (count(training) !== training.length || count(evaluation) !== evaluation.length || regressed) {
  console.error('No se reemplaza el modelo: falló el entrenamiento o empeoró alguna evaluación frente a los pesos guardados.');
  process.exitCode = 1;
} else {
  const report = { version: model.version, parameters, development: { correct: count(development), total: development.length, results: development }, test: { correct: count(test), total: test.length, results: test }, previous, upgradeBaseline: { commit: upgradeBaseline.commit, summaries: upgradeBaseline.summaries }, training: { correct: count(training), total: training.length, ...model.training }, regression: { correct: count(evaluation), total: evaluation.length }, challenge: { correct: count(challenge), total: challenge.length, results: challenge }, comparison: { baselineCommit: baseline.commit, total: comparison.length, before: baseline.results.filter(r => r.before === r.intent).length, after: count(comparison) } };
  const target = new URL('../neural/model.json', import.meta.url);
  const temporary = new URL('../neural/model.json.tmp', import.meta.url);
  await writeFile(temporary, JSON.stringify(model, null, 2) + '\n');
  await rename(temporary, target);
  await writeFile(new URL('../neural/report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log('Pesos y reporte guardados. Revisa los errores del desafío en neural/report.json.');
}
