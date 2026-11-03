import { test } from 'node:test';
import assert from 'node:assert/strict';
import { everydayReply } from '../assistant/everyday.js';
import { musicReply } from '../assistant/music.js';
import { createServer } from '../server.js';
import { createLibraryDatabase } from '../knowledge/database.js';
import { openAndroidMusic } from '../public/android-device.js';
const user=content=>({ role:'user',content });
test('explica aesthetic y variantes, conserva tema y no pretende saber cualquier concepto',()=>{
  for(const word of ['aesthetic','astetic','aestetic'])assert.match(everydayReply([user('Qué es '+word)]).reply,/estético/);
  assert.match(everydayReply([user('Qué es aesthetic'),user('Dame un ejemplo')]).reply,/habitación/);
  assert.equal(everydayReply([user('Qué es aesthetic'),user('otro tema'),user('Por qué')]),null);
  assert.equal(everydayReply([{role:'assistant',content:'Qué es aesthetic'},user('Por qué')]),null);
  assert.equal(everydayReply([user('Qué es un quásar')]),null);
});
test('música pregunta gustos, usa memoria explícita y no ejecuta solicitudes antiguas',async()=>{
  const empty={readMemories:async()=>({items:[]})};
  assert.match((await musicReply([user('Pon música')],empty)).reply,/Qué artista/);
  assert.equal((await musicReply([user('Pon música'),user('de salsa')],empty)).musicQuery,'salsa');
  const preferences={readMemories:async()=>({items:[{label:'música favorita',value:'rock'}]})};
  assert.equal((await musicReply([user('Pon música según mis gustos')],preferences)).musicQuery,'rock');
  assert.equal((await musicReply([user('Pon música de jazz')],preferences)).musicQuery,'jazz');
  assert.equal(await musicReply([user('Pon música de jazz'),user('qué día es hoy')],preferences),null);
  assert.equal(await musicReply([{role:'assistant',content:'Pon música de jazz'},user('de salsa')],empty),null);
  assert.equal((await musicReply([user('Pon música de '+'a'.repeat(141))],empty)).musicQuery,undefined);
});
test('API usa conceptos y memoria musical sin llamadas externas; puente pide actualización si falta',async t=>{
  const database=createLibraryDatabase({production:false,url:'',path:':memory:'});
  const server=createServer({database,auth:{production:false,password:''},request:()=>{throw Error('No usar proveedor');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});await database.close();});
  const chat=async content=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[user(content)]})});assert.equal(r.status,200);return r.json();};
  assert.match((await chat('Qué es astetic')).reply,/estético/);
  await chat('Recuerda que mi música favorita es salsa');assert.equal((await chat('Pon música')).musicQuery,'salsa');
  globalThis.window={JarvisAndroid:{openMusic:query=>'Buscando '+query}};
  try{assert.equal(openAndroidMusic('salsa'),'Buscando salsa');delete window.JarvisAndroid.openMusic;assert.match(openAndroidMusic('salsa'),/actualizar/);}finally{delete globalThis.window;}
});
