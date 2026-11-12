// 소유자 기록에서 복사하지 않는 편집 공개용 문안. 개인화 회고 결과가 아니다.
export const journalPublicCopy = {
  version:'journal-public-v1',title:'이번 주, 나에게 묻기',
  limitations:'누구나 사용할 수 있는 자기 탐색 질문이에요. 개인 기록의 분석 결과는 포함하지 않았어요.',
  cards:[
    {id:'C1',heading:'남기고 싶은 순간',body:'이번 주에 기억하고 싶은 순간 하나를 마음속으로 골라보세요.'},
    {id:'C2',heading:'나에게 묻는 질문',body:'계속해 보고 싶은 방식과 바꾸고 싶은 방식은 각각 무엇인가요?'},
    {id:'C3',heading:'작게 시작하기',body:'다음 주에 시도할 작은 행동 하나를 골라보세요. 원할 때 다시 바꾸어도 좋아요.'},
  ],
};
export function journalShare(selectedIds,{confirmed=false}={}) {
  if(confirmed!==true) throw new Error('Explicit public copy confirmation required');
  if(!Array.isArray(selectedIds)||!selectedIds.length||new Set(selectedIds).size!==selectedIds.length||
    !selectedIds.every(id=>journalPublicCopy.cards.some(c=>c.id===id))) throw new Error('Invalid selection');
  return structuredClone({...journalPublicCopy,cards:journalPublicCopy.cards.filter(c=>selectedIds.includes(c.id))});
}
