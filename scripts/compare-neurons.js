import {readFile,writeFile} from 'node:fs/promises';
import { normalize } from '../public/library-data.js';
import {train,predict} from '../neural/network.js';
const read=async name=>JSON.parse(await readFile(new URL('../neural/'+name,import.meta.url),'utf8'));
const data=await read('intents.json'), split=await read('generalization.json');
const sets={training:data.flatMap(i=>i.examples.map(text=>({text,intent:i.id}))),regression:await read('evaluation.json'),challenge:await read('challenge.json'),development:split.development};
const score=(model,rows)=>({correct:rows.filter(r=>predict(model,r.text).intent===r.intent).length,total:rows.length});
const reserved = new Set([...sets.regression, ...sets.challenge, ...split.development, ...split.test].map(row => normalize(row.text)));
if (data.some(intent => intent.examples.some(text => reserved.has(normalize(text))))) throw new Error('Los datos incluyen una frase de evaluación reservada.');
const baseline=await read('model.json');
const report={note:'Architecture selected using development, training and regression only. Existing test withheld until after selection. These are small, previously used project benchmarks, not a fresh independent measure of intelligence.',baseline:{hiddenSize:baseline.hiddenSize,scores:Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,score(baseline,v)]))},candidates:[]};
let selected=null;
for(const hiddenSize of [32,64,128]){
 const started=performance.now(),model=train(data,450,{hiddenSize});
 const scores=Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,score(model,v)]));
 const eligible=scores.training.correct===scores.training.total&&scores.regression.correct===scores.regression.total&&scores.challenge.correct>=report.baseline.scores.challenge.correct;
 const result={hiddenSize,epochs:450,seconds:(performance.now()-started)/1000,eligible,scores};
 report.candidates.push(result);console.log(JSON.stringify(result));

 if(eligible&&hiddenSize>=64&&scores.development.correct>=report.baseline.scores.development.correct&&(!selected||scores.development.correct>selected.score))selected={hiddenSize,score:scores.development.correct};
}
if(selected && selected.score < report.candidates[0].scores.development.correct) selected=null;
report.selectionRule='For the requested width expansion: choose the eligible 64/128 model with best development score, ties prefer smaller width; it must not score below either the saved baseline or the retrained 32-neuron control. Test is not used for this selection.';
report.selection=selected;
await writeFile(new URL('../neural/width-comparison.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log('SELECTED',JSON.stringify(selected));
