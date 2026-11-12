import { openSync,closeSync,readFileSync,writeSync,fsyncSync,unlinkSync } from 'node:fs';
import { Budget,tokenCost } from './budget.mjs';

function metadataValid(m) {
  if(!m||!['callId','requestId','provider','model','priceVersion'].every(k=>typeof m[k]==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(m[k]))) throw new Error('Invalid call metadata');
  if(!Number.isSafeInteger(m.inputCap)||m.inputCap<0||!Number.isSafeInteger(m.outputCap)||m.outputCap<1) throw new Error('Invalid token caps');
  tokenCost(m.inputCap,m.outputCap,m.rates);
}
function applyReconciliation(budget,event) {
  const entry=budget.snapshot().entries.find(e=>e.id===event.id),m=entry?.metadata;
  if(!m||event.callId!==m.callId||event.model!==m.model||event.provider!==m.provider||
    typeof event.responseId!=='string'||!/^[A-Za-z0-9._:-]{1,128}$/.test(event.responseId)) throw new Error('Call mismatch');
  budget.settle(event.id,tokenCost(event.usage.inputTokens,event.usage.outputTokens,m.rates));
  if(event.usage.inputTokens>m.inputCap||event.usage.outputTokens>m.outputCap) budget.halt();
}

function replay(events) {
  if(events[0]?.type!=='init') throw new Error('Missing ledger header');
  const budget=new Budget(events[0].limit);
  for(let i=1;i<events.length;i++) {
    const e=events[i];
    if(e.seq!==i) throw new Error('Invalid sequence');
    if(e.type==='reserve') {
      if(e.metadata) {
        metadataValid(e.metadata);
        if(budget.snapshot().entries.some(x=>x.metadata?.callId===e.metadata.callId)) throw new Error('Duplicate call');
        if(e.amount!==tokenCost(e.metadata.inputCap,e.metadata.outputCap,e.metadata.rates)) throw new Error('Reservation mismatch');
      }
      if(budget.reserve(e.amount,e.metadata)!==e.id) throw new Error('Invalid ID');
    }
    else if(e.type==='unknown') budget.unknown(e.id);
    else if(e.type==='settle') budget.settle(e.id,e.actual);
    else if(e.type==='reconcile') {
      if(events.slice(1,i).some(x=>x.type==='reconcile'&&x.provider===e.provider&&x.responseId===e.responseId)) throw new Error('Duplicate response');
      applyReconciliation(budget,e);
    }
    else if(e.type==='halt') budget.halt();
    else throw new Error('Unknown event');
  }
  return budget;
}

// 단일 로컬 파일 장부. 락 파일이 남으면 자동 해제하지 않는다.
export class FileBudget {
  #path; #lock; #fd; #events; #budget; #failed=false; #closed=false; #sync;
  constructor(path,limit,{sync=fsyncSync}={}) {
    this.#sync=sync;
    this.#path=path;this.#lock=path+'.lock';
    const lock=openSync(this.#lock,'wx');closeSync(lock);
    try {
      let raw;
      try { raw=readFileSync(path,'utf8'); }
      catch(error) {
        if(error.code!=='ENOENT') throw error;
        new Budget(limit);
        const fd=openSync(path,'wx');
        try { writeSync(fd,JSON.stringify({type:'init',limit})+'\n');fsyncSync(fd); } finally {closeSync(fd);}
        raw=readFileSync(path,'utf8');
      }
      if(!raw.endsWith('\n')) throw new Error('Truncated ledger');
      this.#events=raw.trimEnd().split('\n').map(line=>JSON.parse(line));
      this.#budget=replay(this.#events);
      if(this.#budget.snapshot().limit!==limit) throw new Error('Limit mismatch');
      this.#fd=openSync(path,'a');
      // 이전 프로세스의 예약은 실행 여부를 알 수 없으므로 미확인으로 복구한다.
      for(const entry of this.#budget.snapshot().entries) if(entry.status==='reserved') this.unknown(entry.id);
    } catch(error) {
      if(this.#fd!==undefined) closeSync(this.#fd);
      unlinkSync(this.#lock);throw error;
    }
  }
  #append(event) {
    if(this.#closed||this.#failed) throw new Error('Ledger unavailable');
    const next=[...this.#events,{...event,seq:this.#events.length}];
    const budget=replay(next); // 검증 실패는 파일에 쓰지 않는다.
    try {
      const buffer=Buffer.from(JSON.stringify(next.at(-1))+'\n');
      let offset=0;
      while(offset<buffer.length) { const n=writeSync(this.#fd,buffer,offset);if(n===0)throw new Error('Short write');offset+=n; }
      this.#sync(this.#fd);
    } catch(error) {this.#failed=true;throw error;}
    this.#events=next;this.#budget=budget;
  }
  snapshot() {return {...this.#budget.snapshot(),storageFailed:this.#failed};}
  reserve(amount) {
    const id=this.#budget.snapshot().entries.length+1;
    this.#append({type:'reserve',id,amount});return id;
  }
  reserveCall(metadata) {
    metadataValid(metadata);
    const id=this.#budget.snapshot().entries.length+1;
    this.#append({type:'reserve',id,amount:tokenCost(metadata.inputCap,metadata.outputCap,metadata.rates),metadata:structuredClone(metadata)});
    return id;
  }
  reconcile({callId,provider,model,responseId,usage}) {
    const entry=this.#budget.snapshot().entries.find(e=>e.metadata?.callId===callId);
    if(!entry) throw new Error('Unknown call');
    const event={type:'reconcile',id:entry.id,callId,provider,model,responseId,usage:{inputTokens:usage?.inputTokens,outputTokens:usage?.outputTokens}};
    const previous=this.#events.find(e=>e.type==='reconcile'&&e.id===entry.id);
    if(previous) {
      const {seq,...old}=previous;
      if(JSON.stringify(old)!==JSON.stringify(event)) throw new Error('Conflicting reconciliation');
      return {id:entry.id,duplicate:true};
    }
    this.#append(event);return {id:entry.id,duplicate:false};
  }
  unknown(id) {this.#append({type:'unknown',id});}
  settle(id,actual) {this.#append({type:'settle',id,actual});}
  halt() {this.#append({type:'halt'});}
  close() {
    if(this.#closed)return;
    closeSync(this.#fd);this.#closed=true;unlinkSync(this.#lock);
  }
}
