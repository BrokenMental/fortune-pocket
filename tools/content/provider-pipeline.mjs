import { existsSync,readFileSync,writeFileSync,openSync,closeSync,fsyncSync,unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { buildRequest } from './request.mjs';
import { responsePayload,createAdapter } from './openai-adapter.mjs';
import { requestHash } from './recoverable-call.mjs';
import { recoverableContent } from './recoverable-content.mjs';

// 합성 데이터/주입 전송기 전용. 실제 HTTP·인증·실행 승인 처리는 없다.
export async function providerPipeline({directory,budget,input,metadata,transport,timeoutMs=1000,afterResponseSaved}) {
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(metadata.requestId)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000) throw new Error('Invalid pipeline options');
  const lock=join(directory,metadata.requestId+'.pipeline.lock');
  const fd=openSync(lock,'wx');closeSync(fd);
  try {
    const request=buildRequest(input.trusted,input.userData);
    const payload=responsePayload(request,{model:metadata.model,maxOutputTokens:metadata.outputCap});
    const identity=requestHash({payload,metadata});
    const path=join(directory,metadata.requestId+'.count.json');
    const adapter=createAdapter({transport});
    let plan;
    if(existsSync(path)) {
      plan=JSON.parse(readFileSync(path,'utf8'));
      if(plan.identity!==identity||plan.counted?.payloadHash!==requestHash(payload)||
        !Number.isSafeInteger(plan.counted.inputTokens)||plan.counted.inputTokens<0) throw new Error('Count plan conflict');
    } else {
      const controller=new AbortController();let timer;
      try {
        const counted=await Promise.race([adapter.count(payload,{signal:controller.signal}),
          new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Count timeout'));},timeoutMs);})]);
        plan={version:'1.0',identity,counted};
        const out=openSync(path,'wx');
        try {writeFileSync(out,JSON.stringify(plan)+'\n');fsyncSync(out);}finally {closeSync(out);}
      } finally {clearTimeout(timer);}
    }
    if(plan.counted.inputTokens>metadata.inputCap) return {status:'input-cap-exceeded'};
    // 재개 식별을 위해 원래 상한과 계수 해시도 예약 메타데이터에 고정한다.
    const result=await recoverableContent({directory,budget,input,timeoutMs,afterResponseSaved,
      metadata:{...metadata,provider:'openai',inputCap:plan.counted.inputTokens,countHash:requestHash(plan.counted)},
      provider:async (_,options)=>adapter.generate(payload,plan.counted,{signal:options.signal,inputCap:metadata.inputCap}),
    });
    return {status:result.row.status,countedInputTokens:plan.counted.inputTokens,...result};
  } finally {unlinkSync(lock);}
}
