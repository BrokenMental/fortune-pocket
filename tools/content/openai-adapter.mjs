import { products } from './content.mjs';
import { requestHash } from './recoverable-call.mjs';

const string=max=>({type:'string',maxLength:max});
function schema(productId) {
  const spec=products[productId];
  if(!Object.hasOwn(products,productId))throw new Error('Invalid product');
  return {type:'object',additionalProperties:false,required:['schemaVersion','productId','title','cards','questions','limitations'],properties:{
    schemaVersion:{type:'string',enum:['1.0']},productId:{type:'string',enum:[productId]},title:string(60),limitations:string(400),
    questions:{type:'array',minItems:spec.questions,maxItems:spec.questions,items:string(160)},
    cards:{type:'array',minItems:spec.cards,maxItems:spec.cards,items:{type:'object',additionalProperties:false,
      required:['id','heading','body','evidenceIds'],properties:{id:string(40),heading:string(60),body:string(600),
        evidenceIds:{type:'array',minItems:1,items:{type:'string'}}}}}}};
}
export function responsePayload(request,{model,maxOutputTokens}) {
  if(typeof model!=='string'||!model.trim()||!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<1)throw new Error('Invalid model or token limit');
  if(request.requestVersion!=='1.0'||typeof request.system!=='string')throw new Error('Invalid request');
  return {model,instructions:request.system,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(request.data)}]}],
    max_output_tokens:maxOutputTokens,store:false,
    text:{format:{type:'json_schema',name:'fortune_content',strict:true,schema:schema(request.productId)}}};
}
export function decodeResponse(raw) {
  const usage=raw?.usage;
  if(typeof raw?.id!=='string'||typeof raw?.model!=='string'||!Number.isSafeInteger(usage?.input_tokens)||usage.input_tokens<0||
    !Number.isSafeInteger(usage?.output_tokens)||usage.output_tokens<0)throw new Error('Missing response identity or usage');
  let output=null;
  if(raw.status==='completed') {
    const messages=Array.isArray(raw.output)?raw.output.filter(i=>i.type==='message'):[];
    const parts=messages.flatMap(i=>Array.isArray(i.content)?i.content:[]);
    if(parts.length===1&&parts[0].type==='output_text'&&typeof parts[0].text==='string') {
      try{output=JSON.parse(parts[0].text);}catch{/* 사용량은 보존하고 문안 구조 검사에서 거절 */}
    }
  }
  return {provider:'openai',model:raw.model,responseId:raw.id,
    usage:{inputTokens:usage.input_tokens,outputTokens:usage.output_tokens},output};
}

// 네트워크 전송 구현은 포함하지 않는다. 테스트/향후 승인된 전송기를 명시적으로 주입한다.
export function createAdapter({transport}) {
  if(typeof transport!=='function')throw new Error('Transport required');
  return {
    async count(payload,{signal}={}) {
      const snapshot=structuredClone(payload),payloadHash=requestHash(snapshot);
      const body={model:snapshot.model,instructions:snapshot.instructions,input:snapshot.input,text:snapshot.text};
      const result=await transport({path:'/v1/responses/input_tokens',body:structuredClone(body),signal});
      if(result?.object!=='response.input_tokens'||!Number.isSafeInteger(result.input_tokens)||result.input_tokens<0)throw new Error('Invalid token count');
      return {inputTokens:result.input_tokens,payloadHash};
    },
    async generate(payload,counted,{signal,inputCap}={}) {
      if(counted?.payloadHash!==requestHash(payload)||!Number.isSafeInteger(counted?.inputTokens)||counted.inputTokens<0||
        !Number.isSafeInteger(inputCap)||counted.inputTokens>inputCap)throw new Error('Uncounted or oversized payload');
      return decodeResponse(await transport({path:'/v1/responses',body:structuredClone(payload),signal}));
    },
  };
}
