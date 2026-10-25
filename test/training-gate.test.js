import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

test('el CLI no reemplaza pesos cuando una candidata empeora o memoriza frases reservadas', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jarvis-training-gate-'));
  try {
    for (const folder of ['scripts', 'neural', 'public']) await mkdir(join(root, folder));
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    for (const name of ['scripts/train.js', 'neural/network.js', 'public/library-data.js', ...['evaluation.json', 'challenge.json', 'generalization.json', 'upgrade-baseline.json', 'baseline.json', 'model.json'].map(name => 'neural/' + name)]) await copyFile(resolve(name), join(root, name));
    const data = [{ id: 'hola', reply: 'Hola', examples: ['hola amigo', 'saludos personales'] }, { id: 'adios', reply: 'Adiós', examples: ['hasta nunca', 'adios amigo'] }];
    const path = join(root, 'small.json'); await writeFile(path, JSON.stringify(data));
    const original = await readFile(join(root, 'neural/model.json'), 'utf8');
    const run = () => spawnSync(process.execPath, [join(root, 'scripts/train.js'), '--data', path], { cwd: root, encoding: 'utf8' });
    const regression = run();
    assert.equal(regression.status, 1);
    assert.match(regression.stderr, /No se reemplaza el modelo/);
    assert.equal(await readFile(join(root, 'neural/model.json'), 'utf8'), original);
    const reserved = JSON.parse(await readFile(join(root, 'neural/generalization.json'), 'utf8')).test[0];
    data[0].examples.push(reserved.text); await writeFile(path, JSON.stringify(data));
    const contamination = run();
    assert.equal(contamination.status, 1);
    assert.match(contamination.stderr, /evaluación reservada/);
    assert.equal(await readFile(join(root, 'neural/model.json'), 'utf8'), original);
  } finally { await rm(root, { recursive: true, force: true }); }
});
