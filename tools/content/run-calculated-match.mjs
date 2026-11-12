import { mkdirSync,writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { calculatedMatch } from './calculated-match.mjs';
const result=calculatedMatch(
  {country:'KR',calendar:'solar',year:2000,month:6,day:15,hour:9,minute:30},
  {country:'KR',calendar:'solar',year:2000,month:2,day:4,hour:null});
const folder=new URL(`./runs/${randomUUID()}/`,import.meta.url);mkdirSync(folder,{recursive:true});
writeFileSync(new URL('calculated-match.json',folder),JSON.stringify(result,null,2)+'\n');
const md=`# 실제 계산 연결 예시\n\n성인 가상 프로필 2개. 실제 입력 계산이며 AI 호출은 없습니다.\n\n`+
  result.content.cards.map(c=>`## ${c.heading}\n\n${c.body}\n\n근거: ${c.evidenceIds.join(', ')}\n`).join('\n')+
  '\n'+result.content.questions.map((q,i)=>`${i+1}. ${q}`).join('\n')+'\n\n'+result.content.limitations+'\n';
writeFileSync(new URL('result.md',folder),md);
console.log(fileURLToPath(new URL('result.md',folder)));
