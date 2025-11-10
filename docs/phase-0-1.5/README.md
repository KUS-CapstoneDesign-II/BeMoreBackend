# Phase 0-1.5 인증 시스템 문서

**작성일**: 2025-01-10
**버전**: v1.1.0

---

## 📋 개요

Phase 0-1.5는 BeMore Backend의 JWT 기반 인증 시스템 구현 단계입니다.

**주요 기능**:
- JWT 기반 인증 (Access Token 15분 + Refresh Token 7일)
- 회원가입/로그인/토큰 갱신/로그아웃 API
- bcrypt 비밀번호 해싱
- Zod 스키마 유효성 검증
- 사용자 프로필 관리

---

## 📁 문서 구조

| 문서 | 설명 |
|------|------|
| [PHASE_0-1.5_UPDATE.md](./PHASE_0-1.5_UPDATE.md) | 인증 API 가이드 및 전체 개요 |
| [PHASE_0-1.5_TEST_GUIDE.md](./PHASE_0-1.5_TEST_GUIDE.md) | 상세 테스트 가이드 및 명령어 |
| [PHASE_0-1_IMPLEMENTATION.md](./PHASE_0-1_IMPLEMENTATION.md) | 구현 세부사항 |
| [PHASE_0-1_QUICK_START.md](./PHASE_0-1_QUICK_START.md) | 빠른 시작 가이드 |
| [PHASE_0-1_STATUS.md](./PHASE_0-1_STATUS.md) | 구현 상태 및 체크리스트 |

---

## 🚀 빠른 시작

### 1. 환경 변수 설정

```bash
# .env 파일
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

### 2. API 테스트

```bash
# 회원가입
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'

# 로그인
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

---

## 🔗 관련 링크

- [메인 README](../../README.md)
- [스키마 관리 가이드](../../schema/README.md)
- [Frontend 협업 문서](../frontend/)
