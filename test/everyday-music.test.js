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
  assert.match((await chat('que significa pley')).reply,/¿Te refieres/);
  assert.match((await chat('que significa guapo')).reply,/atractiva/);
  assert.match((await chat('que significa zqxvpalabra')).reply,/Entendí que buscas el significado/);
  assert.equal((await chat('que significa zqxvpalabra')).musicQuery,undefined);
  await chat('Recuerda que mi música favorita es salsa');assert.equal((await chat('Pon música')).musicQuery,'salsa');
  globalThis.window={JarvisAndroid:{openMusic:query=>'Buscando '+query}};
  try{assert.equal(openAndroidMusic('salsa'),'Buscando salsa');delete window.JarvisAndroid.openMusic;assert.match(openAndroidMusic('salsa'),/actualizar/);}finally{delete globalThis.window;}
});

test('pley pide aclaración y una respuesta ambigua no se toma como confirmación',()=>{
  const ask=(...texts)=>everydayReply(texts.map(user));
  assert.match(ask('que significa pley').reply,/¿Te refieres/);
  assert.match(ask('que significa pley','sí').reply,/Cuál de las dos/);
  assert.match(ask('que significa pley','sí','la palabra').reply,/jugar.*reproducir/);
  assert.match(ask('que significa pley','la tienda').reply,/Play Store/);
  assert.match(ask('que significa pley','Google Play').reply,/Play Store/);
  assert.match(ask('Qué es Play Protect').reply,/seguridad/);
  assert.equal(ask('que significa pley','cancela','la tienda'),null);
  assert.equal(everydayReply([{role:'assistant',content:'que significa pley'},user('la tienda')]),null);
});

test('define guapo con contexto y amplía vocabulario sin interpretar palabras de otro tema',()=>{
  const ask=(...texts)=>everydayReply(texts.map(user));
  assert.match(ask('que significa guapo').reply,/atractiva/);
  assert.match(ask('¿Qué significa la palabra guapa?').reply,/cumplido/);
  for(const word of ['bonito','elegante','carismático','humilde','empatía','respeto','resiliencia'])assert.ok(ask('Qué significa '+word));
  assert.match(ask('Qué significa guapo','Dame un ejemplo').reply,/camisa/);
  assert.equal(ask('Me llamo Guapo'),null);
  assert.equal(ask('Qué significa una variable aleatoria'),null);
});

test('adapta definiciones al turno: ejemplo distinto, resumen y referencia bajo petición',()=>{
 const ask=(...texts)=>everydayReply(texts.map(user)).reply;
 const start='Qué significa guapo';
 const first=ask(start,'Dame un ejemplo');const second=ask(start,'Dame otro ejemplo');
 assert.match(first,/camisa/);assert.match(second,/foto/);assert.notEqual(first,second);
 const full=ask(start),brief=ask(start,'En resumen');assert(brief.length<full.length);assert.match(brief,/atractiva/);
 assert.doesNotMatch(full,/https:\/\//);assert.match(ask(start,'Dame la fuente'),/dle\.rae\.es/);
 assert.match(ask(start,'En resumen','Dame otro ejemplo'),/foto/);
 assert.equal(everydayReply([user(start),user('cancela'),user('En resumen')]),null);
});

test('entiende peticiones corteses sin cambiar el significado solicitado',()=>{
 for(const text of ['¿Puedes decirme qué significa guapo, por favor?','Jarvis explícame qué es guapo','Qué significa ser guapo'])assert.match(everydayReply([user(text)]).reply,/atractiva/);
});
