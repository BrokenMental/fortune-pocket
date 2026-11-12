# OpenAI 요청·응답·토큰 계수 어댑터

작성·공식 자료 확인: 2026-11-03. 구현은 `tools/content/openai-adapter.mjs`. 네트워크 전송기를 주입받는 계약 코드이며 실제 HTTP/SDK·인증키 처리는 없다.

## 공식 근거

- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): Responses의 text.format에 json_schema와 strict 형식을 지정하는 구조를 확인했다.
- [Counting tokens](https://developers.openai.com/api/docs/guides/token-counting): POST /v1/responses/input_tokens와 input_tokens 정수 응답을 확인했다. 출력 사용량은 보이는 텍스트만으로 추정하지 않고 공급사 보고 output_tokens를 사용한다.

모델별 스키마 지원과 실제 계정 접근은 실제 연결 전에 확인한다. 문서 형식에 맞춘 모의 검사이며 API 서버가 요청을 수락한 실증은 아니다.

## 구현

responsePayload는 내부 요청의 system을 instructions로, 근거/사용자 데이터를 user 입력의 JSON 텍스트로 옮긴다. 상품별 카드·질문 수와 문자열 상한을 가진 JSON Schema를 지정한다. store=false, 명시적 출력 토큰 상한을 사용하고 API 키·원본 앱 식별정보는 넣지 않는다. store=false가 모든 공급사 로그 보관을 없앤다는 뜻은 아니다.

count는 생성에 사용할 모델·지시문·입력·출력 형식을 토큰 계수 경로에 전달하고 생성 페이로드의 해시를 기록한다. 계수 도중 외부 객체가 바뀌어도 이전 스냅샷의 해시만 반환한다. generate는 해시와 입력 토큰 상한을 확인한 후에만 전송기를 호출한다. 토큰 계수 결과를 문자 수로 대신하지 않는다.

decodeResponse는 응답 ID·모델·입력/출력 사용량을 공통 대사 형식으로 옮긴다. 완료 응답의 단일 output_text만 JSON으로 해석한다. 거절·불완전 상태·잘못된 JSON은 output=null로 반환하되 확인된 사용량을 보존해 구조 검사에서 거절할 수 있게 한다. 사용량이나 식별이 없으면 오류로 처리해 미확인 예약 경로를 사용해야 한다.

실제 모델 응답의 model은 요청 별칭과 다를 수 있다. 현재 장부는 정확한 모델 일치를 요구하므로 실제 연결 전 스냅샷을 고정하거나 명시적으로 허용한 모델 매핑을 설계해야 한다. 임의 모델명을 수락하도록 완화하지 않았다.

## 검증과 준비 상태

신규 4개 포함 콘텐츠 54개, 계산 97개, 준비 점검 4개: 전체 155개 통과. 상품 6종 스키마, 모의 계수/생성 경로·사용량 변환, 계수 후 변경/상한 초과 시 미전송, 거절/불완전/JSON 오류의 비용 보존을 확인했다.

readiness의 어댑터·토큰 계산 미구현 항목은 현재 **실제 전송 및 실제 계수 미연결**을 뜻하며 계속 blocked로 유지한다. 이번 구현은 모의 계약 연결까지다. 키 확인·실제 토큰 수·품질·가격·지연은 검증하지 않았다. SDK 의존성도 추가하지 않았다.

다음은 이 어댑터를 영속 예산·복구·콘텐츠 검증과 모의 전송으로 연결하고, 거절/불완전 응답에도 정산이 보존되는 전체 흐름을 확인하는 것이다. 실제 네트워크 연결은 별도 실행 조건을 충족한 후 진행한다.
