# Backend Architecture Refactoring Plan

본 문서는 “단계별 검증 → 사실만 요약 → 개선 제안” 순서로, 감정 배제·불확실 명시·근거 제시 원칙을 따릅니다.

## 1) 단계별 검증

### A. 데이터 모델 관련 주장

- “관계형·집계/조인 중심이면 Supabase(Postgres)가 유리”
  - 사실. Supabase는 Postgres를 제공하며 RLS/SQL/조인/집계를 그대로 활용 가능. [Supabase](https://supabase.com)

- “문서형/실시간 동기·오프라인 퍼스트면 Firebase가 유리”
  - 사실. Firestore는 실시간 리스너/오프라인 퍼시스턴스를 공식 지원. [Firebase](https://firebase.google.com)

### B. 백엔드 작업(WS/PDF/onnx 등) 관련 주장

- “WebSocket·장시간 처리·고유 런타임 필요 시 Node 컨테이너(Cloud Run 등) 유지가 안정”
  - 대체로 사실. Cloud Run은 WebSocket 공식 지원, 요청 타임아웃 최대 60분. Functions(2nd gen)은 구조상 장시간 연결에 부적합. [Google Cloud](https://cloud.google.com/run), (참고 질의) [Stack Overflow](https://stackoverflow.com)

- onnxruntime-node, pdfkit 등 네이티브/헤드리스 패키지는 컨테이너 기반 배포(Cloud Run/EC2/Railway)가 일반적으로 예측 가능함.
  - 일반적 실무 관찰. 단일 공식 출처는 없음(불확실).

### C. “짧은 API·웹훅·DB 트리거 → Functions/Edge” 주장

- 사실. Firebase Functions(2nd gen), Supabase Edge Functions(Deno)는 경량 API·웹훅·근접 연산 용도. [Firebase](https://firebase.google.com), [Supabase](https://supabase.com/docs/guides/functions)

### D. 부가 기능 비교

- “인증/푸시/호스팅/애널리틱스 → Firebase 강점”
  - 사실. Firebase Auth/FCM/Hosting/GA4 패키지화. [Firebase](https://firebase.google.com)

- “SQL/BI, RLS, 스키마 마이그레이션 → Supabase 강점”
  - 사실(핵심: Postgres·RLS). [Supabase](https://supabase.com)

### E. 아키텍처 권장안의 타당성

- “Node 백엔드(WS/PDF/onnx) + 프론트(Vercel) 유지, 인증/푸시만 Firebase 보완”
  - 요구사항(WS/장시간 처리/노드 런타임) 기준 합리적. Cloud Run이 WS/타임아웃 측면에서 적합. [Google Cloud](https://cloud.google.com/run)

- “Firebase 중심 전환 시에도 WS/긴 작업은 Cloud Run에 배치”
  - 사실. Cloud Run 사용 권고는 공식 가이드와 합치. [Google Cloud](https://cloud.google.com/run)

- “Supabase 중심 유지 시, 경량 로직은 Edge Functions에 분리”
  - 사실. Edge Functions는 웹훅/경량 서버 로직 용도. [Supabase](https://supabase.com/docs/guides/functions)

### F. 변경 포인트(CORS/Origins/Env)

- 사실 범주. 배포 타깃 변경 시 CORS/Origin/ENV 재설정 필요(일반 원칙, 단일 공식 출처 없음 → 불확실).

### G. 누락/유의사항 확인

- Cloud Run 요청 타임아웃(최대 60분) 존재 → 아주 긴 동기 처리는 부적합. 대안: 비동기 분해(Cloud Tasks/Workflows/Jobs). [Google Cloud](https://cloud.google.com/run)
- Functions(2nd gen)의 트리거/제약은 1st gen과 상이 → 마이그레이션·트리거 범위 점검 필요. [Firebase](https://firebase.google.com)
- FCM 웹 푸시는 브라우저 권한·서비스워커 구성 필요. [Firebase](https://firebase.google.com/docs/cloud-messaging)

---

## 2) 사실만 간결 요약(검증 반영)

- 데이터 모델:
  - SQL/집계/조인 핵심 → Supabase(Postgres+RLS) 적합. [Supabase](https://supabase.com)
  - 문서형/실시간/오프라인 → Firebase(Firestore) 적합. [Firebase](https://firebase.google.com)

- 실행 환경:
  - WS/장시간 스트리밍/맞춤 런타임(onnx/pdfkit) → Cloud Run 등 컨테이너형 Node 권장(WS, 타임아웃 최대 60분). [Google Cloud](https://cloud.google.com/run)
  - 경량 API·웹훅/근접 연산 → Firebase Functions(2nd gen) 또는 Supabase Edge Functions. [Firebase](https://firebase.google.com), [Supabase](https://supabase.com/docs/guides/functions)

- 부가 기능:
  - 인증·푸시·호스팅·GA4 → Firebase 강점. [Firebase](https://firebase.google.com)
  - SQL 생태계·RLS·스키마 → Supabase 강점. [Supabase](https://supabase.com)

- 권장 아키텍처(현 요구 기준):
  - Node(Cloud Run) 유지(WS/PDF/onnx) + 프론트(Vercel), 필요 시 Auth/FCM만 Firebase로 보완. [Google Cloud](https://cloud.google.com/run)

- 주의점:
  - Cloud Run 60분 타임아웃 → 초과 작업 비동기화. [Google Cloud](https://cloud.google.com/run)
  - Functions(2nd gen) 제약은 1st gen과 상이. [Firebase](https://firebase.google.com)

---

## 3) 개선·보완 제안(구체)

### A. 의사결정 체크리스트(최소)
- 리포트/집계 복잡도·조인 빈도 ↑ → Supabase 우선. [Supabase](https://supabase.com)
- 다수 클라이언트 실시간 UI + 오프라인 퍼스트 ↑ → Firestore 우선. [Firebase](https://firebase.google.com)
- WS/스트리밍/네이티브 모듈(onnx/pdfkit) ↑ → Cloud Run 배치. [Google Cloud](https://cloud.google.com/run)
- 경량 이벤트/웹훅 ↑ → Functions(2nd gen)/Edge Functions. [Firebase](https://firebase.google.com), [Supabase](https://supabase.com/docs/guides/functions)
- 웹 푸시 필요 → FCM(서비스워커·권한 모델 포함) 설계. [Firebase](https://firebase.google.com/docs/cloud-messaging)

### B. 운영 설계(안전장치)
- 장시간 처리: 60분 초과 가능성 있는 동기 작업은 비동기 파이프라인(Cloud Run Jobs/Workflows/Tasks + 상태 폴링 or 콜백)로 분해. [Google Cloud](https://cloud.google.com/run)
- CORS/Origin/토큰 경계: 프론트 도메인 혼용 시 허용 Origin·헤더·세션 전략 재검토(서비스/정책 별 상이 → 불확실).
- 릴리즈 전략: 기능 단위로 “Node/Cloud Run ↔ Functions/Edge” 분리 배포, SLA·콜드스타트·비용 실측(트래픽 패턴 따라 비용 역전 가능 → 추측).

### C. 대안 비교에서 빠진 항목(보완 권고)
- 비용·쿼터: 동시 연결/호출당 과금/스토리지·IO 비용을 표로 정리(최신 과금은 변동 → 불확실).
- 락인/이식성:
  - Firebase 보안 규칙/클라이언트 SDK 중심 설계는 락인 위험.
  - Supabase는 Postgres 표준 기반이라 이식성 장점. [Supabase](https://supabase.com)
- 분석/BI 연계: Postgres(SQL) 기반은 외부 BI 연계가 용이(Supabase 유리). [Supabase](https://supabase.com)

---

## 최종 결론(간결)

주어진 요구(WS·PDF·onnx 등 Node 런타임 + 프론트 분리)를 전제로 할 때,

1) Node(Cloud Run 등 컨테이너) 유지 + Firebase(인증/FCM만) 보완 전략이 실용적입니다. Cloud Run은 WS 공식 지원 및 요청 최대 60분으로 긴 연결/작업에 적합합니다. [Google Cloud](https://cloud.google.com/run)

2) 데이터 선택은 “업무 쿼리 성격”으로 이원화:
   - SQL/집계/조인 중심 → Supabase(Postgres+RLS),
   - 문서형/실시간/오프라인 중심 → Firebase(Firestore).

3) 필요시, 위 체크리스트에 따라 기능별로 Cloud Run / Functions(2nd gen) / Supabase Edge를 혼용하는 하이브리드가 안전합니다. [Google Cloud](https://cloud.google.com/run) · [Firebase](https://firebase.google.com) · [Supabase](https://supabase.com/docs/guides/functions)

불확실/주의: onnx/pdf 빌드 세부 이미지, CORS/세션 구성, 최신 과금·쿼터는 프로젝트·시점별로 다릅니다(확실하지 않음).


