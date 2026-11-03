import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHistory, updateHistory, newHistoryChat, saveHistory, historyKey } from '../public/chat-history.js';
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
test('migra el historial anterior y conserva dos conversaciones al reabrir',()=>{
 const local=storage();local.setItem('jarvis.messages',JSON.stringify([{role:'user',content:'Mi primera pregunta'},{role:'assistant',content:'Respuesta',project:{title:'Proyecto'}}]));
 const state=loadHistory(local);const original=state.activeId;assert.equal(state.chats[0].title,'Mi primera pregunta');
 newHistoryChat(state);updateHistory(state,[{role:'user',content:'Otra pregunta'}]);saveHistory(local,state);
 const reopened=loadHistory(local);assert.equal(reopened.chats.length,2);assert.equal(reopened.activeId,state.activeId);
 assert.equal(reopened.chats.find(c=>c.id===original).messages[1].project.title,'Proyecto');
 assert.equal(JSON.parse(local.getItem('jarvis.messages')).length,2);
});
test('no conserva resúmenes privados, no borra otros chats al crear y no sobrescribe datos inválidos',()=>{
 const local=storage();const state=loadHistory(local);
 updateHistory(state,[{role:'user',content:'Pregunta normal'},{role:'assistant',content:'notificación privada',deviceOnly:true}]);
 saveHistory(local,state);assert.doesNotMatch(local.getItem(historyKey),/notificación privada/);
 newHistoryChat(state);newHistoryChat(state);assert.equal(state.chats.length,2);
 local.setItem(historyKey,'invalid json');assert.throws(()=>loadHistory(local));assert.equal(local.getItem(historyKey),'invalid json');
});
test('un fallo de capacidad no elimina conversaciones previas',()=>{
 const local=storage(),state=loadHistory(local);
 for(let i=0;i<50;i++){updateHistory(state,[{role:'user',content:'Pregunta '+i}]);if(i<49)newHistoryChat(state);}
 assert.throws(()=>newHistoryChat(state),/50/);assert.equal(state.chats.length,50);assert.equal(state.chats.at(-1).messages[0].content,'Pregunta 0');
});
