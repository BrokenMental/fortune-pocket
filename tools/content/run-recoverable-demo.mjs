import { mkdirSync,writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FileBudget } from './file-budget.mjs';
import { recoverableContent } from './recoverable-content.mjs';
import { samples } from './samples.mjs';
import { demoInput } from './run-local.mjs';

const directory=fileURLToPath(new URL(`./runs/${randomUUID()}/`,import.meta.url));
mkdirSync(directory,{recursive:true});
const budget=new FileBudget(directory+'/ledger.jsonl',1000);
const results=[];
try {
  for(const sample of samples) {
    const productId=sample.content.productId;
    const options={directory,budget,input:demoInput(sample),
      metadata:{callId:`mock-${productId}`,requestId:productId,provider:'mock',model:'mock-v1',priceVersion:'synthetic-v1',inputCap:10,outputCap:10,rates:{input:1000000,output:1000000}},
      provider:async()=>({provider:'mock',model:'mock-v1',responseId:`resp-${productId}`,usage:{inputTokens:2,outputTokens:3},output:sample.content})};
    const result=await recoverableContent(options);
    const replay=await recoverableContent({...options,provider:async()=>{throw new Error('Replay must not call');}});
    const {output,...record}=result;
    results.push({...record,replayStatus:replay.row.status});
  }
  writeFileSync(directory+'/integrated-report.json',JSON.stringify({mode:'synthetic-only',actualCostKrw:null,results,syntheticBudget:budget.snapshot()},null,2)+'\n');
} finally {budget.close();}
console.log(directory+'/integrated-report.json');
