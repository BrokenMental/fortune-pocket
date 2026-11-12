import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function assessReadiness({config,cases,evaluations,keyPresent=false}) {
  const products=['MATCH_MINI','MATCH_FULL','GIFT_MINI','GIFT_BOOK','JOURNAL_PROMPT','JOURNAL_REVIEW'];
  const checks=[];
  const add=(id,ok)=>checks.push({id,status:ok?'ready':'blocked'});
  add('synthetic-inputs',Array.isArray(cases)&&cases.length===120&&new Set(cases.map(c=>c.id)).size===120&&
    products.every(p=>cases.filter(c=>c.productId===p&&c.synthetic===true).length===20));
  add('evaluation-index',Array.isArray(evaluations)&&Array.isArray(cases)&&evaluations.length===cases.length&&
    new Set(evaluations.map(e=>e.caseId)).size===evaluations.length&&
    evaluations.every(e=>cases.some(c=>c.id===e.caseId&&c.productId===e.productId)));
  add('execution-disabled',config?.enabled===false);
  add('model-selected',typeof config?.model==='string'&&config.model.trim().length>0);
  add('budget-recorded',Number.isSafeInteger(config?.budgetMicroUsd)&&config.budgetMicroUsd>0&&
    typeof config?.budgetAuthorizationReference==='string'&&config.budgetAuthorizationReference.trim().length>0);
  add('token-caps',Number.isSafeInteger(config?.inputTokenCap)&&config.inputTokenCap>0&&Number.isSafeInteger(config?.outputTokenCap)&&config.outputTokenCap>0);
  add('provider-key-present',keyPresent===true);
  // 실제 어댑터·토큰 계산 구현은 아직 없다. 설정만 바꿔 ready가 되지 않게 한다.
  add('provider-adapter-implemented',false);
  add('provider-token-counter-implemented',false);
  return {scope:'synthetic-api-evaluation-only',networkUsed:false,executionAllowed:false,
    checks,blocked:checks.filter(c=>c.status==='blocked').map(c=>c.id)};
}
export function localReadiness(root=new URL('../',import.meta.url)) {
  const load=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
  return assessReadiness({config:load('evaluation.config.json'),cases:load('tools/content/cases.json'),
    evaluations:load('tools/content/evaluation.json'),keyPresent:Boolean(process.env.FORTUNE_PROVIDER_API_KEY?.trim())});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {console.log(JSON.stringify(localReadiness(),null,2));}
  catch {console.log(JSON.stringify({executionAllowed:false,error:'Local readiness inputs unreadable'}));process.exitCode=1;}
}
