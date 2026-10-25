import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from '../server.js';
import { createLibraryDatabase } from '../knowledge/database.js';
import { validateFeedback, exportFeedback } from '../public/feedback-data.js';
import { prepareReviewedData } from '../neural/reviewed-data.js';

const entry = { id: 'test-feedback', text: 'Me gustaría comenzar estudiando código', intent: 'programacion', predictedIntent: 'desconocido', status: 'pending' };
test('exporta solo aprobadas, rechaza etiquetas contradictorias y valida límites', () => {
  assert.throws(() => exportFeedback([entry]), /Aprueba/);
  const exported = exportFeedback([{ ...entry, status: 'approved' }, { ...entry, id: 'rejected', status: 'rejected' }]);
  assert.deepEqual(exported.examples, [{ text: entry.text, intent: 'programacion', reviewed: true }]);
  assert.throws(() => exportFeedback([{ ...entry, status: 'approved' }, { ...entry, id: 'other', intent: 'ayuda', status: 'approved' }]), /distintas/);
  assert.throws(() => validateFeedback([entry, entry]), /duplicado/);
  assert.throws(() => validateFeedback([{ ...entry, status: 'automatic' }]));
  assert.throws(() => validateFeedback([{ ...entry, text: 'a'.repeat(1001) }]));
  assert.throws(() => validateFeedback([entry], ['ayuda']));
});
test('prepara datos sin mutar los originales y protege pruebas, revisión y conflictos', () => {
  const base = [{ id: 'programacion', reply: 'r', examples: ['Aprender a programar'] }, { id: 'ayuda', reply: 'r', examples: ['Necesito ayuda'] }];
  const exported = exportFeedback([{ ...entry, status: 'approved' }]);
  const prepared = prepareReviewedData(base, exported);
  assert.equal(prepared.added, 1); assert.equal(base[0].examples.length, 1);
  assert.equal(prepareReviewedData(prepared.intents, exported).duplicates, 1);
  assert.throws(() => prepareReviewedData(base, exported, [{ text: entry.text }]), /reservada/);
  assert.throws(() => prepareReviewedData(base, { ...exported, examples: [{ ...exported.examples[0], reviewed: false }] }), /aprobado/);
  assert.throws(() => prepareReviewedData(base, { ...exported, examples: [{ ...exported.examples[0], text: 'Necesito ayuda' }] }), /conflicto/);
});
test('CLI prepara un archivo privado y se niega a sobrescribirlo', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-feedback-'));
  try {
    const input = join(directory, 'feedback.json'), output = join(directory, 'intents.json');
    await writeFile(input, JSON.stringify(exportFeedback([{ ...entry, status: 'approved' }])));
    const args = [resolve('scripts/prepare-training.js'), input, '--out', output];
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr);
    const dataset = JSON.parse(await readFile(output, 'utf8'));
    assert.ok(dataset.find(intent => intent.id === 'programacion').examples.includes(entry.text));
    const second = spawnSync(process.execPath, args, { encoding: 'utf8' }); assert.equal(second.status, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('API conserva revisión, rechaza etiquetas ajenas y no afecta a la biblioteca', async t => {
  const database = createLibraryDatabase({ production: false, url: '', path: ':memory:' });
  const server = createServer({ database, apiKey: '', auth: { production: false, password: '' } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await database.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const put = (feedback, expectedRevision, headers = {}) => fetch(base + '/api/feedback', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ feedback, expectedRevision }) });
  const original = await (await fetch(base + '/api/feedback')).json();
  assert.equal(original.feedback.length, 0); assert.equal(original.intents.length, 21);
  assert.equal((await put([entry], original.revision)).status, 200);
  assert.equal((await put([], original.revision)).status, 409);
  assert.equal((await put([{ ...entry, intent: 'inventada' }], 1)).status, 400);
  assert.equal((await put([], 1, { Origin: 'https://other.example' })).status, 403);
  const stored = await (await fetch(base + '/api/feedback')).json();
  assert.equal(stored.feedback[0].status, 'pending');
  assert.equal((await database.read()).library.documents.length, 0);
});
