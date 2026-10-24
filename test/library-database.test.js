import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLibraryDatabase, RevisionConflict } from '../knowledge/database.js';

async function exercise(options) {
  const first = createLibraryDatabase(options);
  const saved = { version: 1, documents: [{ id: 'a', title: 'Privado', content: 'Datos guardados por el usuario.' }], corrections: [{ question: '¿Qué estudio?', answer: 'Informática' }] };
  try {
    const initial = await first.read();
    const written = await first.write(saved, initial.revision);
    assert.equal(written.revision, initial.revision + 1);
    await assert.rejects(first.write({ ...saved, corrections: [] }, initial.revision), RevisionConflict);
  } finally { await first.close(); }
  const second = createLibraryDatabase(options);
  try {
    assert.deepEqual((await second.read()).library, saved);
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
