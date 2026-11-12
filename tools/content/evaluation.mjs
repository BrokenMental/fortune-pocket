import { writeFileSync } from 'node:fs';
import { cases } from './fixtures.mjs';

export function evaluationRow(input) {
  return {caseId:input.id,productId:input.productId,status:'pending',requestVersion:'1.0',
    calculationVersion:null,contentVersion:null,model:null,outputPath:null,
    checks:{structure:null,evidence:null,privacy:null,language:null,usefulness:null,repetition:null},
    measurement:{inputTokens:null,outputTokens:null,retries:null,costKrw:null,latencyMs:null},
    reviewer:null,reason:null};
}
export function recordReview(row, decision) {
  if (!['pass','reject'].includes(decision.status) || !decision.reviewer?.trim() ||
    !decision.reason?.trim() || !row.outputPath || !row.contentVersion) throw new Error('Incomplete review');
  const names=Object.keys(row.checks);
  if (!decision.checks || names.some(k=>typeof decision.checks[k]!=='boolean') ||
    (decision.status==='pass' && names.some(k=>!decision.checks[k]))) throw new Error('Incomplete checks');
  return {...structuredClone(row),status:decision.status,checks:{...decision.checks},
    reviewer:decision.reviewer,reason:decision.reason};
}
if(process.argv[1]?.endsWith('evaluation.mjs')) {
  writeFileSync(new URL('./evaluation.json',import.meta.url),JSON.stringify(cases.map(evaluationRow),null,2)+'\n');
  console.log('Created 120 pending evaluation rows, no generation or measurements');
}
