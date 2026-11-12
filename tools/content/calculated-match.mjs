import { convert } from '../calculation/calendar.mjs';
import { validationPillars } from '../calculation/pillars.mjs';
import { buildRequest } from './request.mjs';
import { validateContent } from './content.mjs';
import { requestHash } from './recoverable-call.mjs';
import { daySymbol,elementRelation,relationPrompt,ruleVersion,source } from './traditional-rules.mjs';

export const calculationVersion='research-2000-kst-midnight-v1';
export function calculateProfile(input) {
  const allowed=['calendar','year','month','day','leap','hour','minute','second','country'];
  if(!input||Object.keys(input).some(k=>!allowed.includes(k))||input.country!=='KR'||input.year!==2000) throw new Error('Only Korean adult research year 2000 is supported');
  if(!Object.hasOwn(input,'hour'))throw new Error('Specify hour or null explicitly');
  if(input.calendar==='lunar'&&typeof input.leap!=='boolean')throw new Error('Specify leap month explicitly');
  const dates=convert(input.calendar,input.year,input.month,input.day,input.leap??false);
  if(dates.solar.year!==2000)throw new Error('Converted solar year outside research scope');
  const pillars=validationPillars({...dates.solar,hour:input.hour,minute:input.minute??0,second:input.second??0});
  return {calculationVersion,normalizedDate:dates.solar,pillars};
}

// 계산 사실·전통 분류·자체 편집 질문을 구분한다. 성격·예측 판정은 하지 않는다.
export function calculatedMatch(first,second) {
  const a=calculateProfile(first),b=calculateProfile(second);
  const sa=daySymbol(a.pillars.day),sb=daySymbol(b.pillars.day),relation=elementRelation(sa.element,sb.element);
  const evidence=[
    {id:'A_DAY',text:`첫 번째 사람의 계산 일주는 ${a.pillars.day}이다.`},
    {id:'B_DAY',text:`두 번째 사람의 계산 일주는 ${b.pillars.day}이다.`},
    {id:'MONTHS',text:`월주: 첫 번째 ${a.pillars.month??'미확정'}, 두 번째 ${b.pillars.month??'미확정'}.`},
    {id:'TIME_SCOPE',text:`시주 유무: 첫 번째 ${a.pillars.time===null?'없음':'있음'}, 두 번째 ${b.pillars.time===null?'없음':'있음'}. 절입 불확실성: ${a.pillars.uncertain||b.pillars.uncertain?'있음':'없음'}.`},
    {id:'RULE_STEM_ELEMENT',text:`전통 천간 오행 분류: 첫 번째 일간 ${sa.stem}은 ${sa.element}, 두 번째 ${sb.stem}은 ${sb.element}. 출처 ${source.id}, ${ruleVersion}.`},
    {id:'RULE_RELATION',text:`일간 오행 사이 분류는 ${relation.label}. 전체 원국의 강약·용신·궁합 판정에 사용하지 않는다. 질문은 자체 편집 문안이다.`},
  ];
  const sameDay=a.pillars.day===b.pillars.day;
  const monthUnknown=a.pillars.month===null||b.pillars.month===null;
  const timeUnknown=a.pillars.time===null||b.pillars.time===null;
  const content={schemaVersion:'1.0',productId:'MATCH_MINI',title:'계산에서 대화로 이어지는 우리',
    cards:[
      {id:'C1',heading:sameDay?'같은 일주에서 시작하기':'서로 다른 일주에서 시작하기',
        body:`첫 번째 사람은 ${a.pillars.day}, 두 번째 사람은 ${b.pillars.day} 일주로 계산됐어요. 전통 천간 분류에서 첫 번째 일간 ${sa.stem}은 ${sa.element}, 두 번째 ${sb.stem}은 ${sb.element}에 속해요. ${sameDay?'일주가 같아도 각자의 선호는 다를 수 있어요.':'두 상징을 성격 단정 대신 대화의 출발점으로 써보세요.'} 첫 번째 사람에게: ${sa.question} 두 번째 사람에게: ${sb.question}`,evidenceIds:['A_DAY','B_DAY','RULE_STEM_ELEMENT']},
      {id:'C2',heading:monthUnknown?'출생 시간이 필요한 부분':'월주를 비교해 보기',
        body:monthUnknown?'두 사람 중 월주가 미확정인 입력이 있어요. 절기가 바뀌는 날에 시간을 모르면 월주를 하나로 정할 수 없어요. 이 부분의 비교 해석은 비워둘게요. 대신 다음 약속에서 먼저 정하고 싶은 것과 당일에 골라도 괜찮은 것을 서로 물어보세요.':`월주는 첫 번째 ${a.pillars.month}, 두 번째 ${b.pillars.month}로 계산됐어요. 이 표기만으로 두 사람이 맞는다고 단정하지 않아요. 함께 계획할 때 미리 정할 일 하나와 선택을 남겨둘 일 하나를 나누어 보세요.`,evidenceIds:['MONTHS','TIME_SCOPE']},
      {id:'C3',heading:'해석 범위를 함께 확인하기',
        body:`일간 오행끼리의 전통 분류는 ${relation.label}이에요. ${relationPrompt(relation)} ${timeUnknown?'시간 모름 입력은 시주를 만들지 않았고 시주 해석도 제외했어요.':'이번 버전은 시주를 성향 해석에 사용하지 않아요.'} 이 분류로 관계의 좋고 나쁨을 점수화하지 않아요.`,evidenceIds:['TIME_SCOPE','RULE_STEM_ELEMENT','RULE_RELATION']},
    ],questions:[sa.question,sb.question],
    limitations:'2000년 한국 출생 입력을 실제 계산한 연구용 문안이에요. 전통 오행 분류를 자기 탐색 질문으로 연결했어요. 질문은 자체 편집 문안이며 성격·미래·궁합의 사실 판정이 아니에요. 월령·전체 원국의 강약·용신 해석과 상용 정확도 검증은 남아 있어요.'};
  const request=buildRequest({productId:'MATCH_MINI',mode:'calculated',calculationVersion,evidence},{relationship:'친구 또는 연인'});
  const errors=validateContent(content,request.validationContext);
  if(errors.length)throw new Error(errors.join(', '));
  return {status:'pending-review',method:'calculation-backed-symbolic-rules',contentVersion:'calculated-match-v2',
    interpretation:{ruleVersion,source,symbols:{first:sa,second:sb},relation},
    inputSnapshot:structuredClone({first,second}),inputHash:requestHash({first,second}),
    calculations:{first:a,second:b},evidence,request,content,actualModelCostKrw:null};
}
