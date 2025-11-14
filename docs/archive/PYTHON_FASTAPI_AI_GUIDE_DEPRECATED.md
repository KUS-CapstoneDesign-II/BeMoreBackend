# ⚠️ DEPRECATED: Python FastAPI AI 음성 상담 가이드

**작성일**: 2025-01-14
**상태**: ❌ **사용 중단** (Node.js로 이미 구현됨)
**현재 구현**: Node.js + Express.js + Gemini API
**참고**: [BACKEND_AI_VOICE_CHAT_GUIDE.md](../guides/BACKEND_AI_VOICE_CHAT_GUIDE.md)

---

## 📌 중단 사유

이 문서는 Python + FastAPI로 AI 음성 상담 기능을 구현하기 위해 작성되었으나,
**실제로는 Node.js 백엔드에 이미 완전히 구현되어 있음**을 발견했습니다.

**기존 구현 위치**:
- Gemini API: `services/gemini/gemini.js`
- WebSocket Handler: `services/socket/sessionHandler.js`
- Database: `schema/03_conversations.sql`, `models/Conversation.js`

따라서 이 가이드는 더 이상 사용되지 않으며, 아카이브 목적으로만 보관됩니다.

---

## 원본 내용 (참고용)

# 🤖 BeMore AI 음성 상담 백엔드 구현 - Claude 실행 프롬프트

**작성일**: 2025-01-14
**대상**: 백엔드 개발자 (FastAPI + Python)
**목적**: Claude Code에 복사-붙여넣기하여 AI 음성 상담 기능 즉시 구현

---

## 📋 복사하여 Claude Code에 붙여넣기

```
당신은 FastAPI 백엔드 개발자입니다. BeMore AI 심리 상담 시스템의 실시간 AI 음성 상담 기능을 구현해야 합니다.

## 프로젝트 컨텍스트

BeMore는 실시간 얼굴 감정 인식 + AI 음성 상담을 제공하는 웹 애플리케이션입니다.
- **프론트엔드**: React + TypeScript (이미 완료)
- **백엔드**: FastAPI + Python (AI 응답 기능만 필요)
- **데이터베이스**: PostgreSQL (Supabase)
- **AI**: Gemini 1.5 Pro (Google)

**현재 상황**:
✅ 프론트엔드는 완전히 구현됨
✅ WebSocket 연결 설정됨
✅ 사용자 음성 → 텍스트 변환 완료
❌ AI 응답 생성 기능만 없음 (이 작업이 필요)

[... 나머지 원본 내용 생략 ...]
```

---

## 📚 대체 문서

Node.js 구현에 대한 정확한 가이드는 다음 문서를 참조하세요:
- [Node.js AI Voice Chat Guide](../guides/BACKEND_AI_VOICE_CHAT_GUIDE.md)
- [WebSocket Session Handler](../../services/socket/sessionHandler.js)
- [Gemini Integration](../../services/gemini/gemini.js)

---

**최종 업데이트**: 2025-01-14
**작성자**: Backend Team
