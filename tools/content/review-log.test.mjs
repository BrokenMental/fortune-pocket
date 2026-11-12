import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveReview } from './review-log.mjs';
import { evaluationRow } from './evaluation.mjs';
const decision={status:'reject',reviewer:'test',reason:'Test finding',
  checks:{structure:true,evidence:false,privacy:true,language:true,usefulness:true,repetition:true}};
function run(outputPath='output.json') {
  const folder=mkdtempSync(join(tmpdir(),'fortune-review-'));
  const row={...evaluationRow({id:'A',productId:'MATCH_MINI'}),status:'pending-review',outputPath,contentVersion:'demo-v1'};
  writeFileSync(join(folder,'report.json'),JSON.stringify({results:[{row}]}));
  writeFileSync(join(folder,'output.json'),JSON.stringify({productId:'MATCH_MINI'}));
  return folder;
}
test('review and followup preserve original report and previous event',()=>{
  const folder=run(), original=readFileSync(join(folder,'report.json'),'utf8');
  const first=saveReview(folder,'A',decision);
  const old=readFileSync(first.file,'utf8');
  const second=saveReview(folder,'A',{...decision,reason:'Followup'},first.event.reviewId+'.json');
  assert.equal(second.event.previousReview,first.event.reviewId+'.json');
  assert.equal(readFileSync(first.file,'utf8'),old);
  assert.equal(readFileSync(join(folder,'report.json'),'utf8'),original);
});
test('reject missing case, traversal, invalid previous event and changed artifact',()=>{
  const folder=run();assert.throws(()=>saveReview(folder,'missing',decision));
  assert.throws(()=>saveReview(run('../outside.json'),'A',decision));
  assert.throws(()=>saveReview(folder,'A',decision,'../previous.json'));
  const first=saveReview(folder,'A',decision);
  writeFileSync(join(folder,'output.json'),JSON.stringify({productId:'MATCH_MINI',changed:true}));
  assert.throws(()=>saveReview(folder,'A',decision,first.event.reviewId+'.json'));
});
