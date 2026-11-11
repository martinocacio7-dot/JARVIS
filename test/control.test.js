import { test } from 'node:test';
import assert from 'node:assert/strict';
import { controlSnapshot, controlReply } from '../assistant/control.js';
import { parseMemoryConversation, executeMemoryCommand } from '../assistant/memory.js';
import { createServer } from '../server.js';
import { createLibraryDatabase } from '../knowledge/database.js';
const user=content=>({role:'user',content});
test('explicit incomplete memory can be clarified once; other requests cancel it',()=>{
 assert.deepEqual(parseMemoryConversation([user('Recuerda que mi objetivo'),{role:'assistant',content:'Qué valor'},user('es aprender Python')]),{action:'write',label:'objetivo',value:'aprender Python'});
 for(const follow of ['Abre WhatsApp','Lee mis notificaciones','Qué hora es','ya lo hice','Sí','Retomemos','La hora','Noticias de hoy','notificaciones','Crea un recordatorio','Agrega leche a mi lista','Muestra mi agenda','Cambia mi recordatorio'])assert.equal(parseMemoryConversation([user('Recuerda que mi objetivo'),user(follow)]),null);
 assert.equal(parseMemoryConversation([{role:'assistant',content:'Recuerda que mi objetivo'},user('aprender Python')]),null);
 assert.equal(parseMemoryConversation([user('Recuerda que mi objetivo'),user('Hola'),user('aprender Python')]),null);
});
test('control uses actual persistence, preserves unknown status and never writes',async t=>{
 const database=createLibraryDatabase({production:false,url:'',path:':memory:'});t.after(()=>database.close());
 await executeMemoryCommand({action:'write',label:'objetivo',value:'Python'},database);
 await database.writeTasks([{id:'one',kind:'list',text:'platos',dueAt:null,completed:true},{id:'two',kind:'list',text:'leer',dueAt:null,completed:false}],0);
 const snapshot=await controlSnapshot(database);assert.equal(snapshot.memory.items[0].value,'Python');assert.match(controlReply(snapshot),/1 pendientes y 1 tareas marcadas/);assert.match(controlReply(snapshot),/No comprueban/);assert.match(controlReply(snapshot,true),/platos/);assert.doesNotMatch(controlReply(snapshot,true),/• leer/);
 const partial=await controlSnapshot({readTasks:()=>database.readTasks(),readMemories:()=>{throw Error('private-details');}});assert.equal(partial.memory.available,false);assert.equal(partial.tasks.available,true);assert.match(controlReply(partial),/desconocido/);assert.doesNotMatch(JSON.stringify(partial),/private-details/);
});
test('private dashboard endpoint and conversational query read state without executing history',async t=>{
 const database=createLibraryDatabase({production:false,url:'',path:':memory:'});
 const server=createServer({apiKey:'',database,auth:{production:true,username:'test',password:'control-test-password-123'}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));
 const base=`http://127.0.0.1:${server.address().port}`,Authorization='Basic '+Buffer.from('test:control-test-password-123').toString('base64');
 assert.equal((await fetch(base+'/api/control')).status,401);
 const chat=async messages=>(await fetch(base+'/api/chat',{method:'POST',headers:{Authorization,'Content-Type':'application/json'},body:JSON.stringify({messages})})).json();
 await chat([user('Recuerda que mi objetivo'),user('es aprender Python')]);const result=await chat([user('Borra mis recuerdos'),user('Mi centro de control')]);assert.equal(result.openControl,true);assert.match(result.reply,/1 recuerdos/);
 const data=await(await fetch(base+'/api/control',{headers:{Authorization}})).json();assert.equal(data.memory.items[0].value,'aprender Python');assert.equal(data.tasks.items.length,0);
});
