import { saveReview } from './review-log.mjs';

const directory=process.argv[2];
if(!directory) throw new Error('Usage: node editorial-review.mjs <run-directory>');
const reasons={
 MATCH_MINI:'대화 문안은 완결되지만 DEMO_SCENARIO만 연결돼 실제 계산 기반 관계 해석의 근거가 없다. 시연 문안으로만 보존한다.',
 MATCH_FULL:'대화 단계와 질문은 구체적이다. 실제 계산 근거 없이 사주 궁합의 개인화 결과로 제공할 수 없어 보류한다.',
 GIFT_MINI:'응원 문안과 메시지는 구분된다. 실제 사주 근거 연결 전에는 유료 사주 해석 카드로 제공하지 않는다.',
 GIFT_BOOK:'4페이지가 완결되지만 생성 출력 제목에 수신 별칭 솔이 포함돼 별칭을 앱에서 삽입한다는 계약과 다르다. 일반 제목으로 바꿔야 한다.',
 JOURNAL_PROMPT:'질문 5개는 시작 주제에 맞지만 사주 기반 개인화의 근거가 없다. 일반 주제 샘플로만 보존한다.',
 JOURNAL_REVIEW:'J1~J3의 요약과 행동 제안은 부합한다. 공유 카드에 회의·퇴근·친구 약속의 비공개 기록 세부가 남아 있어 공개용 요약을 따로 검토해야 한다.',
};
for(const [productId,reason] of Object.entries(reasons)) {
  const result=saveReview(directory,`EDITORIAL-${productId}`,{
    status:'reject',reviewer:'Codex — 작성 에이전트 자체 편집 검토',reason,
    checks:{structure:true,evidence:productId==='JOURNAL_REVIEW',
      privacy:!['GIFT_BOOK','JOURNAL_REVIEW'].includes(productId),language:true,usefulness:true,repetition:true},
    changes:[{status:'requested',description:reason}],
  });
  console.log(result.file);
}
