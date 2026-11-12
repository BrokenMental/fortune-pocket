const integer = v => Number.isSafeInteger(v) && v >= 0;

// 금액 단위: micro-USD. 실제 공급사·환율·세금은 호출자가 별도로 확정한다.
export class Budget {
  #limit; #entries=[]; #halted=false;
  constructor(limit) {
    if(!integer(limit)||limit===0) throw new Error('Invalid limit');
    this.#limit=limit;
  }
  snapshot() {
    return {limit:this.#limit,halted:this.#halted,entries:structuredClone(this.#entries),
      committed:this.#entries.reduce((sum,e)=>sum+(e.actual??e.reserved),0)};
  }
  halt() { this.#halted=true; }
  reserve(amount,metadata=null) {
    if(!integer(amount)||amount===0) throw new Error('Invalid reservation');
    const state=this.snapshot();
    if(this.#halted||this.#entries.some(e=>e.status==='unknown')||amount>this.#limit-state.committed) throw new Error('Budget blocked');
    const entry={id:this.#entries.length+1,reserved:amount,actual:null,status:'reserved',...(metadata?{metadata:structuredClone(metadata)}:{})};
    this.#entries.push(entry);return entry.id;
  }
  unknown(id) {
    const entry=this.#entries.find(e=>e.id===id);
    if(!entry||entry.status!=='reserved') throw new Error('Invalid reservation');
    entry.status='unknown';
  }
  settle(id,actual) {
    const entry=this.#entries.find(e=>e.id===id);
    if(!entry||entry.status==='settled'||!integer(actual)) throw new Error('Invalid settlement');
    entry.actual=actual;entry.status='settled';
    if(actual>entry.reserved||this.snapshot().committed>this.#limit) this.#halted=true;
  }
}

export function tokenCost(input,output,rates) {
  if(!integer(input)||!integer(output)||!integer(rates.input)||!integer(rates.output)) throw new Error('Invalid usage or rates');
  // rates: micro-USD per million tokens. 부동소수 누적 대신 매 시도 올림.
  const numerator=BigInt(input)*BigInt(rates.input)+BigInt(output)*BigInt(rates.output);
  const value=Number((numerator+999999n)/1000000n);
  if(!integer(value)) throw new Error('Cost overflow');
  return value;
}

export async function controlledCall({budget,request,provider,inputTokens,maxOutputTokens,rates,timeoutMs=1000,accept=()=>true,maxRetries=1,callMetadata=null}) {
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000||![0,1].includes(maxRetries)||
    !integer(inputTokens)||!integer(maxOutputTokens)||maxOutputTokens===0) throw new Error('Invalid execution bounds');
  const reserved=tokenCost(inputTokens,maxOutputTokens,rates),attempts=[];
  for(let i=0;i<=maxRetries;i++) {
    const metadata=callMetadata?{...callMetadata,callId:`${callMetadata.callId}:${i+1}`,rates,inputCap:inputTokens,outputCap:maxOutputTokens}:null;
    let id;
    try { id=metadata?budget.reserveCall(metadata):budget.reserve(reserved); } catch { return {status:'budget-blocked',attempts}; }
    const controller=new AbortController();let timer;
    const started=performance.now();
    try {
      const result=await Promise.race([
        Promise.resolve().then(()=>provider(request,{signal:controller.signal,maxOutputTokens,callId:metadata?.callId,requestId:metadata?.requestId})),
        new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Timeout'));},timeoutMs);}),
      ]);
      const usage=result?.usage;
      if(!usage||!integer(usage.inputTokens)||!integer(usage.outputTokens)) throw new Error('Unknown usage');
      const cost=tokenCost(usage.inputTokens,usage.outputTokens,rates);
      if(metadata) budget.reconcile({callId:metadata.callId,provider:result.provider,model:result.model,responseId:result.responseId,usage});
      else budget.settle(id,cost);
      attempts.push({reservationId:id,cost,usage,latencyMs:performance.now()-started});
      if(usage.inputTokens>inputTokens||usage.outputTokens>maxOutputTokens||budget.snapshot().halted) {
        budget.halt();return {status:'bounds-exceeded',attempts};
      }
      let valid=false;
      try { valid=accept(result.output)===true; } catch { /* 유효하지 않은 응답도 사용량 정산은 유지 */ }
      if(valid) return {status:'completed',attempts,output:result.output};
    } catch {
      try { budget.unknown(id); } catch {
        return {status:'storage-failed',attempts:[...attempts,{reservationId:id,cost:null,usage:null}]};
      }
      attempts.push({reservationId:id,cost:null,usage:null,latencyMs:performance.now()-started});
      return {status:'usage-unknown',attempts};
    } finally { clearTimeout(timer); }
  }
  return {status:'output-rejected',attempts};
}
