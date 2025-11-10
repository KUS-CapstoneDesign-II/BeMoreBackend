# Frontend 협업 문서

**작성일**: 2025-01-10
**대상**: BeMore Frontend 팀

---

## 📋 개요

Backend와 Frontend 팀 간의 협업을 위한 문서 모음입니다.

**주요 내용**:
- API 통합 가이드
- 인증 시스템 연동
- User Preferences 최적화
- VAD 데이터 통합

---

## 📁 문서 구조

### 인증 관련 (Phase 0-1.5)

| 문서 | 설명 |
|------|------|
| [FRONTEND_AUTH_INTEGRATION.md](./FRONTEND_AUTH_INTEGRATION.md) | 인증 시스템 통합 가이드 |
| [FRONTEND_AUTH_QUICK_REFERENCE.md](./FRONTEND_AUTH_QUICK_REFERENCE.md) | 인증 API 빠른 참조 |
| [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md) | 프론트엔드 개발 빠른 시작 |

### User Preferences 최적화

| 문서 | 설명 |
|------|------|
| [FRONTEND_PREFERENCES_GUIDE.md](./FRONTEND_PREFERENCES_GUIDE.md) | ⭐ User Preferences API 최적화 가이드 |

**핵심 내용**:
- 조건부 API 호출 전략
- 로컬 우선 + 백엔드 동기화 패턴
- 60% API 호출 감소, 95% 로드 속도 향상

### 통합 및 호환성

| 문서 | 설명 |
|------|------|
| [FRONTEND_BACKEND_INTEGRATION_CHECK.md](./FRONTEND_BACKEND_INTEGRATION_CHECK.md) | Backend-Frontend 통합 체크리스트 |
| [FRONTEND_BACKEND_INTEGRATION_REPORT.md](./FRONTEND_BACKEND_INTEGRATION_REPORT.md) | 통합 리포트 |
| [FRONTEND_COMPATIBILITY_REPORT.md](./FRONTEND_COMPATIBILITY_REPORT.md) | 호환성 분석 리포트 |
| [FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md](./FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md) | VAD 통합 리포트 |

### 협업 메시지

| 문서 | 설명 |
|------|------|
| [FRONTEND_COLLABORATION_MESSAGE_2025-11-04.md](./FRONTEND_COLLABORATION_MESSAGE_2025-11-04.md) | Frontend 팀 협력 메시지 |
| [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md) | Frontend 인수인계 문서 |
| [FRONTEND_INTEGRATION_HANDOFF.md](./FRONTEND_INTEGRATION_HANDOFF.md) | 통합 인수인계 문서 |
| [FRONTEND_REQUIREMENTS_2025-11-05.md](./FRONTEND_REQUIREMENTS_2025-11-05.md) | Frontend 요구사항 |

---

## 🚀 권장 읽기 순서

### 1. 신규 Frontend 개발자
1. [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md)
2. [FRONTEND_AUTH_INTEGRATION.md](./FRONTEND_AUTH_INTEGRATION.md)
3. [FRONTEND_PREFERENCES_GUIDE.md](./FRONTEND_PREFERENCES_GUIDE.md)

### 2. 인증 시스템 통합
1. [FRONTEND_AUTH_QUICK_REFERENCE.md](./FRONTEND_AUTH_QUICK_REFERENCE.md)
2. [FRONTEND_AUTH_INTEGRATION.md](./FRONTEND_AUTH_INTEGRATION.md)

### 3. User Preferences 최적화
1. [FRONTEND_PREFERENCES_GUIDE.md](./FRONTEND_PREFERENCES_GUIDE.md) ⭐ **필독**

---

## 🔗 관련 링크

- [메인 README](../../README.md)
- [Phase 0-1.5 문서](../phase-0-1.5/)
- [API 엔드포인트 레퍼런스](../guides/API_ENDPOINT_REFERENCE.md)
- [배포 가이드](../deployment/)
