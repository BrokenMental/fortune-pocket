# 운세 한 조각 (가칭)

500원·1,000원으로 궁합, 선물용 사주 카드, 자기 탐색 콘텐츠를 구매하는 모바일 중심 웹서비스.

- 상태: 설계·로컬 계산/콘텐츠 검증 단계. 서비스 구현·배포·결제 계약은 진행하지 않음.
- 작성일: 2026-11-02
- 프로젝트명: `fortune-pocket` (브랜드·상표·도메인은 미확인)
- 전체 설계: [docs/DESIGN.md](docs/DESIGN.md)
- 실제 입력 계산→상품 문안 예시: [docs/CALCULATED_PRODUCT.md](docs/CALCULATED_PRODUCT.md)
- 전통 분류·자기 탐색 해석: [docs/TRADITIONAL_INTERPRETATION.md](docs/TRADITIONAL_INTERPRETATION.md)
- 공통 검증·API 준비 점검: [docs/PROJECT_CHECKS.md](docs/PROJECT_CHECKS.md)
- OpenAI 모의 전송·토큰 계수 계약: [docs/OPENAI_ADAPTER_CONTRACT.md](docs/OPENAI_ADAPTER_CONTRACT.md)
- 모의 공급사·영속 복구 통합: [docs/PROVIDER_PIPELINE.md](docs/PROVIDER_PIPELINE.md)
- 최신 준비 현황·모델 후보·평가 예산안: [docs/EVALUATION_EXECUTION_PLAN.md](docs/EVALUATION_EXECUTION_PLAN.md)
- 로컬 예산·실행 제어기: [docs/BUDGET_CONTROLLER.md](docs/BUDGET_CONTROLLER.md)
- 영속 예산 장부·복구: [docs/FILE_BUDGET_LEDGER.md](docs/FILE_BUDGET_LEDGER.md)
- 호출 식별·사용량 대사: [docs/CALL_RECONCILIATION.md](docs/CALL_RECONCILIATION.md)
- 요청 해시·응답 저장·재개: [docs/RECOVERABLE_EXECUTION.md](docs/RECOVERABLE_EXECUTION.md)
- 복구·타임아웃·콘텐츠 검사 통합: [docs/INTEGRATED_RECOVERY.md](docs/INTEGRATED_RECOVERY.md)
- 상품 샘플 6종: [docs/PRODUCT_SAMPLES.md](docs/PRODUCT_SAMPLES.md)
- 콘텐츠 평가 기준: [docs/CONTENT_EVALUATION.md](docs/CONTENT_EVALUATION.md)
- 콘텐츠 스키마·가상 입력·검증 실행: [docs/CONTENT_CONTRACT.md](docs/CONTENT_CONTRACT.md)
- 샘플 JSON·오류 사례 검증: [docs/CONTENT_SAMPLE_VALIDATION.md](docs/CONTENT_SAMPLE_VALIDATION.md)
- 생성 요청 계약·평가 기록: [docs/GENERATION_REQUEST_AND_EVALUATION.md](docs/GENERATION_REQUEST_AND_EVALUATION.md)
- 샘플 로컬 실행기: [docs/LOCAL_CONTENT_RUNNER.md](docs/LOCAL_CONTENT_RUNNER.md)
- 자체 편집 검토·이력: [docs/EDITORIAL_REVIEW_RESULTS.md](docs/EDITORIAL_REVIEW_RESULTS.md)
- 별칭·회고 공개 문안 수정: [docs/EDITORIAL_REVISION.md](docs/EDITORIAL_REVISION.md)
- 실행 순서와 검증 기준: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- 계산 엔진 조사와 검증 사례: [docs/CALCULATION_RESEARCH.md](docs/CALCULATION_RESEARCH.md)
- 계산 검증 1차 결과·실행 방법: [docs/CALCULATION_VALIDATION.md](docs/CALCULATION_VALIDATION.md)
- 성인 연도 검증·과거 시간대 정책: [docs/HISTORICAL_TIME_POLICY.md](docs/HISTORICAL_TIME_POLICY.md)
- 자료 이용 조건·시주 정책 검증: [docs/DATA_RIGHTS_AND_HOUR_POLICY.md](docs/DATA_RIGHTS_AND_HOUR_POLICY.md)
- 프로젝트 공통 작업 지침: [AGENTS.md](AGENTS.md)
- Codex 작업 방식: [codex.md](codex.md)
- 최신 작업 기록: [todo.md](todo.md)

핵심 원칙: 콘텐츠별 500원/1,000원 직접 결제, 구매한 결과 재열람 무료, 구독·충전 강제 없음. 전통적 해석을 활용한 재미와 자기 탐색 서비스이며 예측 정확도를 상품 가치로 주장하지 않는다.

루트 검증: `npm run check` (준비 점검·계산·콘텐츠 전체). 설정 확인만: `npm run readiness`. 실제 API 호출 없이 실행합니다. 계산 의존성 설치와 자세한 결과는 공통 검증 문서를 참고합니다.

## Git 저장소

2026-11-12 로컬 Git 저장소를 구성하고 https://github.com/BrokenMental/fortune-pocket 에 origin을 연결했습니다. 기본 브랜치는 main입니다. 캐시와 빌드 결과물은 기존 .gitignore 규칙으로 제외합니다.
