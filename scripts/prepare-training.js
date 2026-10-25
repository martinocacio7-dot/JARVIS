import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { prepareReviewedData } from '../neural/reviewed-data.js';

const args = process.argv.slice(2);
if (!args[0] || (args.length > 1 && (args.length !== 3 || args[1] !== '--out' || !args[2]))) {
  console.error('Uso: npm run prepare-training -- archivo-exportado.json [--out data/reviewed-intents.json]');
  process.exitCode = 1;
} else {
  try {
    const input = JSON.parse(await readFile(resolve(args[0]), 'utf8'));
    const base = JSON.parse(await readFile(new URL('../neural/intents.json', import.meta.url), 'utf8'));
    const reserved = [];
    for (const name of ['evaluation.json', 'challenge.json']) reserved.push(...JSON.parse(await readFile(new URL(`../neural/${name}`, import.meta.url), 'utf8')));
    const generalization = JSON.parse(await readFile(new URL('../neural/generalization.json', import.meta.url), 'utf8'));
    reserved.push(...generalization.development, ...generalization.test);
    const result = prepareReviewedData(base, input, reserved);
    const output = resolve(args[2] || 'data/reviewed-intents.json');
    // No sobrescribir archivos existentes ni introducir datos privados en Git.
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(result.intents, null, 2) + '\n', { flag: 'wx' });
    console.log(`Preparados ${result.added} ejemplos nuevos; ${result.duplicates} duplicados omitidos. Archivo: ${output}`);
    console.log('No se entrenó la red. Revisa el archivo antes de ejecutar npm run train -- --data <archivo>. No subas datos privados a GitHub.');
  } catch (error) { console.error(`No se prepararon los datos: ${error.message}`); process.exitCode = 1; }
}
