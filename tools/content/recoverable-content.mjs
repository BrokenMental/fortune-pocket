import { runCase } from './run-local.mjs';
import { recoverableCall } from './recoverable-call.mjs';

// 검증은 재개할 때도 다시 수행한다. completed를 문안 통과로 해석하지 않는다.
export async function recoverableContent({input,...options}) {
  let execution=null;
  const content=await runCase(input,async request=>{
    execution=await recoverableCall({...options,request});
    if(execution.status!=='completed') throw new Error('Execution incomplete');
    return execution.output;
  });
  const summary=execution?{status:execution.status,requestHash:execution.requestHash}:null;
  return {execution:summary,...content};
}
