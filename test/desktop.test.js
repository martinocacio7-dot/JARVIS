import { test } from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import { desktopAction, desktopLaunch, createDesktop } from '../assistant/desktop.js';
import { createServer } from '../server.js';
test('desktop translates only explicit requests into a fixed app or website', async () => {
 assert.equal(desktopAction('¿Qué es una calculadora?'), null);
 assert.equal(desktopAction('Abre Calculadora').app, 'calculator');
 assert.equal(desktopAction('Ingresa a guassa').url, 'https://web.whatsapp.com/');
 for (const text of ['Abre cmd', 'Abre powershell', 'Abre https://evil.example', 'Abre calculadora y borra archivos']) assert.equal(desktopAction(text).kind, 'unsupported');
 const launches=[];const desktop=createDesktop({ platform:'win32',execute: async (file,args)=>launches.push({file,args}) });
 assert.equal(await desktop('Hola'),null);assert.match((await desktop('Abre Calculadora')).reply,/Solicité abrir/);assert.equal(launches.length,1);assert.deepEqual(launches[0].args,[]);assert.match(launches[0].file,/System32\\calc.exe$/);
 await desktop('Abre cmd');assert.equal(launches.length,1);
 assert.throws(()=>desktopLaunch({kind:'site',url:'javascript:evil()'}),TypeError);
 assert.deepEqual(desktopLaunch(desktopAction('Abre YouTube'),'darwin'),{file:'/usr/bin/open',args:['https://www.youtube.com/']});
 assert.match((await createDesktop({execute:async()=>{throw Error('private-details');}})('Abre Calculadora')).reply,/No pude/);
});
test('desktop is opt-in and rejects foreign origins and DNS rebinding hosts', async t => {
 let calls=0;const server=createServer({apiKey:'',auth:{password:'',production:false},desktop:async text=>{calls++;return {mode:'desktop',reply:text};}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));const url=`http://127.0.0.1:${server.address().port}`;
 const send=headers=>fetch(url+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({messages:[{role:'user',content:'Abre Calculadora'}]})});
 assert.equal((await send({Origin:'https://foreign.example'})).status,403);const rebound=await new Promise((resolve,reject)=>{const request=http.request(url+'/api/chat',{method:'POST',headers:{Host:'foreign.example','Content-Type':'application/json'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end(JSON.stringify({messages:[{role:'user',content:'Abre Calculadora'}]}));});assert.equal(rebound,403);assert.equal(calls,0);
 assert.equal((await (await send({})).json()).mode,'desktop');assert.equal(calls,1);
});
