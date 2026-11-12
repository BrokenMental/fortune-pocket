import { createHash } from 'node:crypto';
import { openSync,closeSync,writeFileSync,readFileSync,fsyncSync,renameSync,existsSync,unlinkSync } from 'node:fs';
import { join } from 'node:path';

function canonical(v) {
  if(v===null||typeof v==='boolean'||typeof v==='string') return JSON.stringify(v);
  if(typeof v==='number'&&Number.isFinite(v)) return JSON.stringify(v);
  if(Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
  if(v&&Object.getPrototypeOf(v)===Object.prototype) return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  throw new Error('Non JSON request');
}
export const requestHash=value=>createHash('sha256').update(canonical(value)).digest('hex');
function save(path,value) {
  const temp=path+'.tmp',fd=openSync(temp,'wx');
  try {writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fsyncSync(fd);} finally {closeSync(fd);}
  renameSync(temp,path);
}

// 로컬 합성 데이터 전용. provider는 테스트용으로 주입하며 자동 재전송하지 않는다.
export async function recoverableCall({directory,budget,metadata,request,provider,timeoutMs=1000,afterResponseSaved=()=>{}}) {
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000) throw new Error('Invalid timeout');
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(metadata.requestId)) throw new Error('Invalid request ID');
  const path=join(directory,metadata.requestId+'.json'),lock=path+'.lock';
  const lockFd=openSync(lock,'wx');closeSync(lockFd);
  try {
    const identity=requestHash({request,metadata});
    let state;
    if(existsSync(path)) {
      state=JSON.parse(readFileSync(path,'utf8'));
      if(state.identity!==identity||state.version!=='1.0') throw new Error('Request identity conflict');
      if(state.status==='started') return {status:'usage-unknown',requestHash:identity};
      if(!['response-saved','completed','bounds-exceeded'].includes(state.status)||
        state.responseHash!==requestHash(state.response)) throw new Error('Corrupt execution state');
    } else {
      // 장부 예약과 파일 저장 사이 중단도 중복 callId 예약으로 재전송을 막는다.
      const id=budget.reserveCall({...metadata,requestHash:identity});
      state={version:'1.0',identity,status:'started',reservationId:id};
      save(path,state);
      let response;
      const controller=new AbortController();let timer;
      try {response=await Promise.race([
        Promise.resolve().then(()=>provider(structuredClone(request),{callId:metadata.callId,requestId:metadata.requestId,signal:controller.signal,maxOutputTokens:metadata.outputCap})),
        new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Timeout'));},timeoutMs);}),
      ]);}
      catch {
        budget.unknown(id);return {status:'usage-unknown',requestHash:identity};
      } finally {clearTimeout(timer);}
      state={...state,status:'response-saved',response,responseHash:requestHash(response)};
      save(path,state);
      await afterResponseSaved(); // 저장 후 중단 복구 시험 지점
    }
    budget.reconcile({callId:metadata.callId,provider:state.response.provider,model:state.response.model,
      responseId:state.response.responseId,usage:state.response.usage});
    state={...state,status:budget.snapshot().halted?'bounds-exceeded':'completed'};
    save(path,state);
    return {status:state.status,requestHash:identity,...(state.status==='completed'?{output:state.response.output}:{})};
  } finally {unlinkSync(lock);}
}
