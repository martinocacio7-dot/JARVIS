import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLibraryDatabase, RevisionConflict } from '../knowledge/database.js';

async function exercise(options) {
  const first = createLibraryDatabase(options);
  const saved = { version: 1, documents: [{ id: 'a', title: 'Privado', content: 'Datos guardados por el usuario.' }], corrections: [{ question: '¿Qué estudio?', answer: 'Informática' }] };
  const feedback = [{ id: 'db-feedback', text: 'Quiero comenzar a estudiar código', intent: 'programacion', predictedIntent: 'desconocido', status: 'pending' }];
  const tasks = [{ id: 'db-task', text: 'Pendiente persistente', kind: 'list', dueAt: null, completed: false }];
  const voice = { voiceId: 'voice_test_123', name: 'Voz de prueba' };
  try {
    const initial = await first.read();
    const written = await first.write(saved, initial.revision);
    assert.equal(written.revision, initial.revision + 1);
    await assert.rejects(first.write({ ...saved, corrections: [] }, initial.revision), RevisionConflict);
    const previous = await first.readFeedback();
    await first.writeFeedback(feedback, previous.revision);
    await assert.rejects(first.writeFeedback([], previous.revision), RevisionConflict);
    const beforeTasks = await first.readTasks(); await first.writeTasks(tasks, beforeTasks.revision);
    await assert.rejects(first.writeTasks([], beforeTasks.revision), RevisionConflict);
    const beforeVoice = await first.readVoice(); await first.writeVoice(voice, beforeVoice.revision);
    await assert.rejects(first.writeVoice({ voiceId: null, name: '' }, beforeVoice.revision), RevisionConflict);
  } finally { await first.close(); }
  const second = createLibraryDatabase(options);
  try {
    assert.deepEqual((await second.read()).library, saved);
    assert.deepEqual((await second.readFeedback()).feedback, feedback);
    assert.deepEqual((await second.readTasks()).items, tasks);
    assert.deepEqual((await second.readVoice()).voice, voice);
    const revision = (await second.read()).revision;
    const writes = await Promise.allSettled([second.write({ ...saved, corrections: [] }, revision), second.write({ ...saved, documents: [] }, revision)]);
    assert.equal(writes.filter(r => r.status === 'fulfilled').length, 1);
    assert.ok(writes.find(r => r.status === 'rejected').reason instanceof RevisionConflict);
  } finally { await second.close(); }
}

test('SQLite conserva documentos y correcciones al reabrir y evita sobrescrituras concurrentes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'jarvis-db-'));
  try { await exercise({ url: '', production: false, path: join(directory, 'library.sqlite') }); }
  finally { await rm(directory, { recursive: true, force: true }); }
});
test('producción sin DATABASE_URL no usa un archivo temporal como falsa persistencia', async () => {
  const database = createLibraryDatabase({ production: true, url: '' });
  assert.equal(database.kind, 'unconfigured');
  await assert.rejects(database.read(), /DATABASE_URL/);
  await database.close();
});
test('PostgreSQL real persiste al reconectar y protege revisiones concurrentes', { skip: !process.env.JARVIS_TEST_DATABASE_URL }, async () => {
  // Usar solo una base de datos exclusiva para pruebas: cambia su biblioteca.
  await exercise({ production: true, url: process.env.JARVIS_TEST_DATABASE_URL });
});
