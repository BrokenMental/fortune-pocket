import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { saveReview } from './review-log.mjs';
import { journalShare } from './journal-share.mjs';

const [oldRun,newRun]=process.argv.slice(2).map(p=>resolve(p));
if(!oldRun||!newRun) throw new Error('Old and new run directories required');
const pairs=[['GIFT_BOOK','42855760-a948-4d7e-8190-d82169d8af3c.json'],
 ['JOURNAL_REVIEW','ab78f3dc-c9ab-4db6-92d0-4fb29bcaeed2.json']];
const links=[];
for(const [productId,previousFile] of pairs) {
  const previous=JSON.parse(readFileSync(resolve(oldRun,'reviews',previousFile),'utf8'));
  const oldBytes=readFileSync(resolve(oldRun,`${productId}.json`));
  if(previous.caseId!==`EDITORIAL-${productId}` || previous.artifactSha256!==createHash('sha256').update(oldBytes).digest('hex')) throw new Error('Old review mismatch');
  const journal=productId==='JOURNAL_REVIEW';
  const result=saveReview(newRun,`EDITORIAL-${productId}`,{
    status:journal?'pass':'reject',reviewer:'Codex — 작성 에이전트 자체 재검토',
    reason:journal?'소유자용 가상 기록 요약으로 한정해 통과. 직접 공유 차단 및 별도 일반 질문 문안을 확인했다.':'별칭 분리 수정은 확인했다. 실제 사주 계산 근거가 없어 개인화 상품 제공은 계속 보류한다.',
    checks:{structure:true,evidence:journal,privacy:true,language:true,usefulness:true,repetition:true},
    changes:[{status:'resolved',description:journal?'소유자 원문 직접 공유를 차단하고 일반 질문 3장으로 분리':'별칭을 display.recipientNickname으로 분리'}],
  });
  links.push({productId,previousReviewId:previous.reviewId,previousArtifactSha256:previous.artifactSha256,
    newReviewId:result.event.reviewId,newArtifactSha256:result.event.artifactSha256,
    previousRun:oldRun,scope:journal?'owner-only-editorial-demo':'nickname-fix-only'});
}
writeFileSync(resolve(newRun,'revision-links.json'),JSON.stringify(links,null,2)+'\n',{flag:'wx'});
writeFileSync(resolve(newRun,'journal-public-copy.json'),JSON.stringify(journalShare(['C1','C2','C3'],{confirmed:true}),null,2)+'\n',{flag:'wx'});
console.log('Saved two revision reviews, links and generic journal public copy');
