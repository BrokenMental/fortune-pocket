import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { createHash,randomUUID } from 'node:crypto';
import { resolve,relative,dirname,isAbsolute,basename } from 'node:path';
import { recordReview } from './evaluation.mjs';

export function saveReview(runDirectory,caseId,decision,previousReview=null) {
  const root=resolve(runDirectory);
  const report=JSON.parse(readFileSync(resolve(root,'report.json'),'utf8'));
  const row=report.results.find(r=>r.row.caseId===caseId)?.row;
  if(!row || row.status!=='pending-review' || !row.outputPath) throw new Error('Case is not reviewable');
  const path=resolve(root,row.outputPath),rel=relative(root,path);
  if(isAbsolute(rel)||rel==='..'||rel.startsWith('..\\')||rel.startsWith('../')) throw new Error('Artifact outside run');
  const bytes=readFileSync(path);
  const output=JSON.parse(bytes);
  if(output.productId!==row.productId) throw new Error('Artifact mismatch');
  const hash=createHash('sha256').update(bytes).digest('hex');
  let previous=null;
  if(previousReview!==null) {
    if(basename(previousReview)!==previousReview) throw new Error('Invalid previous review');
    previous=JSON.parse(readFileSync(resolve(root,'reviews',previousReview),'utf8'));
    if(previous.caseId!==caseId || previous.artifactSha256!==hash) throw new Error('Previous review mismatch');
  }
  const reviewed=recordReview(row,decision);
  const event={reviewId:randomUUID(),createdAt:new Date().toISOString(),caseId,
    scope:'editorial-demo-only',artifactSha256:hash,previousReview,
    changes:decision.changes??[],row:reviewed};
  const folder=resolve(root,'reviews');mkdirSync(folder,{recursive:true});
  const file=resolve(folder,`${event.reviewId}.json`);
  writeFileSync(file,JSON.stringify(event,null,2)+'\n',{flag:'wx'});
  return {file,event};
}
