import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { localReadiness } from './readiness.mjs';

const root=new URL('../',import.meta.url);
const suites=[{name:'readiness',cwd:root,args:['--test','tools/readiness.test.mjs']},
  ...['calculation','content'].map(name=>{
    const cwd=new URL(`tools/${name}/`,root);
    const script=JSON.parse(readFileSync(new URL('package.json',cwd))).scripts.test.split(' ');
    if(script[0]!=='node'||script[1]!=='--test'||script.slice(2).some(p=>!/^[-a-z.]+\.mjs$/.test(p))) throw new Error('Unexpected test command');
    return {name,cwd,args:script.slice(1)};
  })];
const results=[];
for(const suite of suites) {
  const result=spawnSync(process.execPath,[...suite.args.slice(0,1),'--test-reporter=tap',...suite.args.slice(1)],{cwd:fileURLToPath(suite.cwd),encoding:'utf8',timeout:60000,windowsHide:true});
  const total=Number(result.stdout?.match(/^# tests (\d+)/m)?.[1]??0);
  const passed=result.status===0&&!result.error&&total>0;
  results.push({suite:suite.name,passed,tests:total});
  console.log(`${suite.name}: ${passed?'PASS':'FAIL'} (${total} tests)`);
  if(!passed) {console.log(result.stdout??'');console.log(result.stderr??'');}
}
console.log(JSON.stringify({suites:results,totalTests:results.reduce((s,r)=>s+r.tests,0),readiness:localReadiness()},null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
