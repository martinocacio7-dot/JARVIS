import { readFile, writeFile, rename } from 'node:fs/promises';
import { train, predict } from '../neural/network.js';
import { resolve } from 'node:path';
const read = async name => JSON.parse(await readFile(new URL(`../neural/${name}`, import.meta.url), 'utf8'));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--data' || !args[1])) throw new Error('Uso: npm run train [-- --data archivo.json]');
const intents = args.length ? JSON.parse(await readFile(resolve(args[1]), 'utf8')) : await read('intents.json');
const model = train(intents);
const samples = intents.flatMap(i => i.examples.map(text => ({ text, intent: i.id })));
const evaluate = cases => cases.map(({ text, intent }) => ({ text, expected: intent, predicted: predict(model, text).intent }));
const count = results => results.filter(row => row.expected === row.predicted).length;
const training = evaluate(samples);
const evaluation = evaluate(await read('evaluation.json'));
const challenge = evaluate(await read('challenge.json'));
const baseline = await read('baseline.json');
const comparison = evaluate(baseline.results);
const parameters = model.hiddenSize * model.features.length + model.hiddenSize + model.intents.length * model.hiddenSize + model.intents.length;
console.log(`Red v2: ${model.features.length} entradas, ${model.hiddenSize} neuronas ocultas, ${model.intents.length} salidas y ${parameters} parámetros.`);
console.log(`Entrenamiento: ${count(training)}/${training.length}; pérdida ${model.training.initialLoss.toFixed(4)} → ${model.training.finalLoss.toFixed(4)}.`);
console.log(`Regresión anterior: ${count(evaluation)}/${evaluation.length}. Desafío ampliado: ${count(challenge)}/${challenge.length}.`);
console.log(`Mismos ${comparison.length} casos de comparación: antes ${baseline.results.filter(r => r.before === r.intent).length}, ahora ${count(comparison)}. No mide inteligencia general.`);
if (count(training) !== training.length || count(evaluation) !== evaluation.length) {
  console.error('No se reemplaza el modelo: falló el entrenamiento o la evaluación de regresión.');
  process.exitCode = 1;
} else {
  const report = { version: 2, parameters, training: { correct: count(training), total: training.length, ...model.training }, regression: { correct: count(evaluation), total: evaluation.length }, challenge: { correct: count(challenge), total: challenge.length, results: challenge }, comparison: { baselineCommit: baseline.commit, total: comparison.length, before: baseline.results.filter(r => r.before === r.intent).length, after: count(comparison) } };
  const target = new URL('../neural/model.json', import.meta.url);
  const temporary = new URL('../neural/model.json.tmp', import.meta.url);
  await writeFile(temporary, JSON.stringify(model, null, 2) + '\n');
  await rename(temporary, target);
  await writeFile(new URL('../neural/report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log('Pesos y reporte guardados. Revisa los errores del desafío en neural/report.json.');
}
