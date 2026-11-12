import { readFileSync, writeFileSync } from 'node:fs';
import { validateContent } from './content.mjs';

const source = readFileSync(new URL('../../docs/PRODUCT_SAMPLES.md',import.meta.url),'utf8');
export const samples = [...source.matchAll(/^## (MATCH_MINI|MATCH_FULL|GIFT_MINI|GIFT_BOOK|JOURNAL_PROMPT|JOURNAL_REVIEW) —[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map(([,productId,section])=>{
  const context={productId,allowedEvidenceIds:productId==='JOURNAL_REVIEW'?['J1','J2','J3']:['DEMO_SCENARIO'],selectedEntryCount:productId==='JOURNAL_REVIEW'?3:undefined};
  let cards=[...section.matchAll(/^### (?:카드|해석 카드|페이지) \d+ — ([^\n]+)\n\n([^\n]+)/gm)]
    .map(([,heading,body],i)=>({id:`C${i+1}`,heading,body:body.replace(/ \[근거: [^\]]+\]/g,''),
      evidenceIds:productId==='JOURNAL_REVIEW'?(['J1·J2·J3','J1·J2','J3'][i].split('·')):['DEMO_SCENARIO']}));
  let questions=[...section.matchAll(/^\d+\. (.+)$/gm)].map(m=>m[1]);
  if(productId==='JOURNAL_PROMPT') cards=[{id:'C1',heading:'시작을 준비하는 방법',body:section.match(/^짧은 해석: (.+)$/m)[1],evidenceIds:['DEMO_SCENARIO']}];
  if(productId==='JOURNAL_REVIEW') {
    questions=[cards[1].body.split('?')[0]+'?'];
    cards[1].body=cards[1].body.slice(questions[0].length).trim();
  }
  const content={schemaVersion:'1.0',productId,title:section.match(/^제목: (.+)$/m)?.[1]??cards[0].heading,
    cards,questions,limitations:section.match(/^읽는 기준: (.+)$/m)[1]};
  const errors=validateContent(content,context);
  if(errors.length) throw new Error(`${productId}: ${errors.join(', ')}`);
  return {demoOnly:true,calculationStatus:'not-computed',context,content,
    display:productId==='GIFT_BOOK'?{recipientNickname:'솔'}:productId==='GIFT_MINI'?{recipientNickname:'여울'}:null,
    userMessage:section.match(/^> (.+)$/m)?.[1]??null};
});
if(process.argv[1]?.endsWith('samples.mjs')) {
  if(samples.length!==6) throw new Error('Expected six samples');
  writeFileSync(new URL('./samples.json',import.meta.url),JSON.stringify(samples,null,2)+'\n');
  console.log('Converted and validated six editorial samples');
}
