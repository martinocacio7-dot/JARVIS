import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceReply, syncAndroidReminders } from '../public/android-device.js';
import { parseTaskCommand, executeTaskCommand } from '../assistant/commands.js';
import { createLibraryDatabase } from '../knowledge/database.js';

test('Android consulta hora local y notificaciones sin consultar al servidor', () => {
  let reads = 0, synchronized;
  globalThis.window = { JarvisAndroid: { notifications: () => { reads++; return 'Notificación privada de prueba'; }, syncReminders: json => { synchronized = JSON.parse(json); return 'Aviso programado'; } } };
  try {
    assert.match(deviceReply('Jarvis qué hora es', new Date('2026-10-25T15:45Z')), /^Son las /);
    assert.equal(reads, 0);
    assert.equal(deviceReply('Qué notificaciones tengo'), 'Notificación privada de prueba');
    assert.equal(reads, 1); assert.equal(deviceReply('Haz un proyecto'), null);
    assert.equal(syncAndroidReminders([]), 'Aviso programado'); assert.deepEqual(synchronized, []);
    delete window.JarvisAndroid; assert.equal(deviceReply('Qué hora es'), null);
  } finally { delete globalThis.window; }
});
test('recordatorios por voz admiten descripción tras la hora y próxima ocurrencia explícita', async t => {
  const now = new Date('2026-10-25T02:30Z'); // 21:30 UTC−5.
  const a = parseTaskCommand('Hazme un recordatorio a las nueve de la mañana sobre tomar la medicina', now);
  assert.equal(a.draft.text, 'tomar la medicina'); assert.equal(a.draft.dueAt, '2026-10-25T14:00:00.000Z');
  assert.equal(parseTaskCommand('Hazme un recordatorio mañana a las 10 pm sobre revisar el informe', now).draft.dueAt, '2026-10-26T03:00:00.000Z');
  assert.equal(parseTaskCommand('Recuérdame estudiar a las 23', now).draft.dueAt, '2026-10-25T04:00:00.000Z');
  assert.equal(parseTaskCommand('Hasme un recordatorio para estudiar mañana', now).draft.dueAt, null);
  const database = createLibraryDatabase({ url: '', production: false, path: ':memory:' });t.after(()=>database.close());
  const saved = await executeTaskCommand(a,database,now); assert.match(saved.reply,/Guardé/);
  assert.equal((await database.readTasks()).items[0].text,'tomar la medicina');
});
