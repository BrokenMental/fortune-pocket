import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildRequest } from './request.mjs';
import { validateContent } from './content.mjs';
import { reviewSignals } from './review.mjs';
import { evaluationRow } from './evaluation.mjs';
import { samples } from './samples.mjs';

// 외부 모델을 호출하지 않는 고정 응답 실행기. 임의 실제 사용자 데이터 저장용이 아니다.
export async function runCase({caseId,trusted,userData,response,privateTexts=[]},provider=async()=>structuredClone(response)) {
  const row=evaluationRow({id:caseId,productId:trusted.productId});
  let request;
  try { request=buildRequest(trusted,userData); }
  catch { return {row:{...row,status:'request-rejected'},errors:['Invalid request'],signals:[]}; }
  let output;
  try { output=await provider(request); }
  catch { return {row:{...row,status:'provider-failed'},errors:['Local provider failed'],signals:[]}; }
  let errors;
  try { errors=validateContent(output,request.validationContext); }
  catch { errors=['Malformed output']; }
  if(errors.length) return {row:{...row,status:'structure-rejected',checks:{...row.checks,structure:false}},errors,signals:[]};
  const signals=reviewSignals(output,privateTexts);
  return {row:{...row,status:signals.length?'privacy-blocked':'pending-review',contentVersion:'editorial-demo-v1',
    checks:{...row.checks,structure:true,privacy:signals.length?false:null}},
    errors:[],signals,output:signals.length?undefined:output};
}

export function demoInput(sample) {
  const journal=sample.content.productId==='JOURNAL_REVIEW';
  // 문안의 실제 가상 기록만 사용. 계산 사실로 오인할 근거를 만들지 않는다.
  const records=journal?[...readFileSync(new URL('../../docs/PRODUCT_SAMPLES.md',import.meta.url),'utf8')
    .matchAll(/^\| (J[123]) \| (.+) \|$/gm)].map(([,id,text])=>({id,text})):[];
  return {caseId:`EDITORIAL-${sample.content.productId}`,trusted:{productId:sample.content.productId,
    mode:journal?'journal':'demo',evidence:journal?records:[{id:'DEMO_SCENARIO',text:'실제 사주 계산을 사용하지 않은 편집 가상 샘플'}]},
    userData:{scenario:'기존 편집 샘플을 고정 응답으로 재생한다.'},response:sample.content};
}

export async function runLocal() {
  const folder=new URL(`./runs/${randomUUID()}/`,import.meta.url);
  mkdirSync(folder,{recursive:true});
  const results=[];
  for(const sample of samples) {
    const result=await runCase(demoInput(sample));
    if(result.output) {
      const name=`${sample.content.productId}.json`;
      writeFileSync(new URL(name,folder),JSON.stringify(result.output,null,2)+'\n',{flag:'wx'});
      result.row.outputPath=name;
    }
    const {output,...record}=result;results.push(record);
  }
  const report={runVersion:'1.0',mode:'editorial-replay',generatedByModel:false,results};
  writeFileSync(new URL('report.json',folder),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(fileURLToPath(new URL('report.json',folder)));
  return report;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await runLocal();
