export const ruleVersion='five-elements-symbolic-v1';
export const source={id:'LEI-JJH',title:'전정훈 명리심리상담사 강의교안',
  url:'https://www.lei.or.kr/upfiledata/board/명리심리상담사_전정훈_교안모음.pdf',
  checkedAt:'2026-11-03',sections:['인쇄 11쪽 표2','인쇄 28쪽 상생·상극'],scope:'전통 분류와 상징만 참고; 성격·예측 타당성 근거 아님'};
const stems='甲乙丙丁戊己庚辛壬癸';
const elements=['목','화','토','금','수'];
const questions={
  목:'새로 시작하거나 함께 키워보고 싶은 일은 무엇인가요?',
  화:'마음을 전할 때 어떤 말과 표현이 편한가요?',
  토:'함께 지키면 든든할 작은 일상은 무엇인가요?',
  금:'함께 결정할 때 중요하게 보는 기준은 무엇인가요?',
  수:'생각을 정리하거나 쉬어갈 때 어떤 시간이 필요한가요?',
};
export function daySymbol(dayPillar) {
  const index=typeof dayPillar==='string'?stems.indexOf(dayPillar[0]):-1;
  if(index<0||dayPillar.length!==2)throw new Error('Invalid day pillar');
  const element=elements[Math.floor(index/2)];
  return {stem:dayPillar[0],element,question:questions[element],ruleId:'RULE_STEM_ELEMENT'};
}
export function elementRelation(a,b) {
  const x=elements.indexOf(a),y=elements.indexOf(b);
  if(x<0||y<0)throw new Error('Invalid element');
  if(x===y)return {kind:'same',label:'같은 오행',ruleId:'RULE_RELATION'};
  if((x+1)%5===y)return {kind:'generates',label:`${a}생${b}`,ruleId:'RULE_RELATION'};
  if((y+1)%5===x)return {kind:'generated-by',label:`${b}생${a}`,ruleId:'RULE_RELATION'};
  if((x+2)%5===y)return {kind:'controls',label:`${a}극${b}`,ruleId:'RULE_RELATION'};
  return {kind:'controlled-by',label:`${b}극${a}`,ruleId:'RULE_RELATION'};
}
export function relationPrompt(relation) {
  if(relation.kind==='same')return '같은 상징을 출발점으로 삼아도 원하는 방식은 다를 수 있어요. 각자 편한 방식을 한 가지씩 말해보세요.';
  if(['generates','generated-by'].includes(relation.kind))return '전통의 상생 관계를 도움을 주고받는 대화의 소재로 써보세요. 서로에게 받고 싶은 도움 하나와 해줄 수 있는 도움 하나를 나눠보면 어떨까요?';
  return '전통의 상극 관계를 서로의 경계를 묻는 대화의 소재로 써보세요. 함께 정할 기준과 각자 선택할 부분을 하나씩 나눠보면 어떨까요?';
}
