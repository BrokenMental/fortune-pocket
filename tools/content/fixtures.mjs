import { writeFileSync } from 'node:fs';
import { products } from './content.mjs';

const situations = [
 ['시작','새 프로젝트 첫 질문을 준비한다.'],['휴식','퇴근 후 산책과 휴식 사이에서 고른다.'],
 ['관계','친구에게 가능한 약속 시간 두 개를 보낸다.'],['생활','책상 위 물건을 한 구역씩 정리한다.'],
 ['시작','배우고 싶은 수업의 안내를 비교한다.'],['휴식','주말 일정에 혼자 쉴 시간을 남긴다.'],
 ['관계','답장이 늦을 때 기다릴 시간을 전한다.'],['생활','아침 준비 순서를 바꿔본다.'],
 ['시작','처음 참여하는 모임에서 인사를 건넨다.'],['휴식','음악을 듣고 기분을 기록한다.'],
 ['관계','고민을 들을 때 원하는 도움을 묻는다.'],['생활','외출 전 필요한 물건을 적는다.'],
 ['시작','작은 실험을 해보고 계속할 기준을 정한다.'],['휴식','초대를 정중히 거절하고 쉬기로 한다.'],
 ['관계','서로 다른 식당 선호를 조율한다.'],['생활','한 주의 지출 기록을 정리한다.'],
 ['시작','도움을 요청할 사람과 질문을 고른다.'],['휴식','계획을 줄인 뒤 여유가 생긴다.'],
 ['관계','대화를 멈췄다가 정한 시간에 돌아온다.'],['생활','이번 주에 유지할 습관 하나를 고른다.'],
];
export const cases = Object.keys(products).flatMap(productId=>situations.map(([theme,scenario],i)=>({
  id:`${productId}-${String(i+1).padStart(2,'0')}`,productId,synthetic:true,
  ageBand:[ '20대','30대','40대','50대','60대' ][i%5],theme,scenario,
  birthTime:i%4===0?'unknown':'known',calculationStatus:'not-computed',
  relationship:productId.startsWith('MATCH')?(i%2?'연인':'친구'):null,
  occasion:productId.startsWith('GIFT')?['생일','응원','새해'][i%3]:null,
  message:productId.startsWith('GIFT')?(i%2?'새로운 일에 도전하는 너를 응원해. 다음에 함께 이야기하자.':'생일 축하해!'):null,
  entries:productId==='JOURNAL_REVIEW'?Array.from({length:[1,3,7][i%3]},(_,j)=>({id:`J${j+1}`,body:`${scenario} ${['해보니 편했다.','오늘은 부담스러워 미뤘다.','다음에는 방법을 바꾸고 싶다.'][j%3]}`})):[],
  expectedStatus:'pending-generation',costKrw:null,latencyMs:null,
})));
if (process.argv[1]?.endsWith('fixtures.mjs')) {
  writeFileSync(new URL('./cases.json',import.meta.url),JSON.stringify(cases,null,2)+'\n');
  console.log(`Wrote ${cases.length} synthetic input cases; no outputs generated`);
}
