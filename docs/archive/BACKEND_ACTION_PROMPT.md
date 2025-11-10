# 🔧 백엔드 팀 - 감정 분석 시스템 실행 프롬프트

**읽는 시간**: 5분
**실행 시간**: 1-2시간
**긴급도**: ⚠️ 높음 (프론트엔드 팀이 이것을 기다리고 있습니다)

---

## ⚡ 한줄 요약

**지금 바로 하세요**: `DATABASE_URL` 환경변수를 Render에 설정하고, 로그에서 "✅ 데이터베이스 연결 성공" 메시지를 확인하세요.

---

## 📋 체크리스트 (순서대로 진행)

### ✅ Step 1: 코드 배포 (이미 완료됨)
```
✅ 커밋 2d1a20e (감정 분석 파이프라인 수정) - 배포됨
✅ 커밋 2a7758b (데이터베이스 설정 템플릿) - 배포됨
```

### ✅ Step 2: DATABASE_URL 설정 (지금 해야 함!)

#### **Render 콘솔에 접속**
1. https://render.com 접속
2. BeMoreBackend 애플리케이션 선택
3. "Environment" 탭 클릭

#### **DATABASE_URL 환경변수 추가**
```
이름: DATABASE_URL
값: mysql://username:password@host:port/database

예시 (MySQL):
DATABASE_URL=mysql://root:mypassword@db.example.com:3306/bemore_prod

예시 (PostgreSQL):
DATABASE_URL=postgresql://user:password@host:5432/bemore
```

**어디서 얻나요?**
- MySQL/PostgreSQL 서버 호스트, 포트, 사용자명, 비밀번호
- (기존 데이터베이스가 있으면 그것의 정보 사용)

### ✅ Step 3: 배포 재시작
```
Render 콘솔에서:
1. 애플리케이션 선택
2. "Manual Deploy" 클릭
3. "Deploy latest commit" 선택
4. 배포 완료 대기 (2-3분)
```

### ✅ Step 4: 로그 확인 (가장 중요!)

#### **성공했을 때 보이는 메시지들:**
```
✅ 데이터베이스 연결 성공
🎯 感情分析パイプラインが準備完了
[10초 대기]
📤 emotion_update 메시지 전송
  - emotion: "happy"
  - timestamp: 1761464079806
  - frameCount: 189
  - sttSnippet: "오늘 날씨가..."
💾 Emotion saved to database
[10초 대기]
📤 emotion_update 메시지 전송
...
```

#### **실패했을 때 보이는 메시지들:**
```
❌ 데이터베이스 연결 실패: ECONNREFUSED
⚠️ Database is disabled, skipping emotion save (in-memory only)
🔴 Cannot read properties of undefined
```

**→ 이 경우: DATABASE_URL 다시 확인**

### ✅ Step 5: 테스트 세션으로 검증

#### **방법 1: Render 로그에서 보기**
```
1. Render 콘솔 > 애플리케이션 > Logs 탭
2. 새로운 세션 시작 (프론트에서)
3. 다음 메시지 확인:
   ✅ emotion_update (10초마다)
   ✅ database save success
```

#### **방법 2: 프론트엔드 콘솔에서 보기**
```
브라우저 개발자 도구 > Console
필터: "emotion_update"
→ 10초마다 메시지가 나타나야 함
```

---

## 🎯 성공 기준

### ✅ 모두 확인되어야 합니다:

- [ ] Render 로그: "✅ 데이터베이스 연결 성공"
- [ ] 새 세션 시작 후 emotion_update 메시지 수신
- [ ] 10초마다 emotion_update 메시지 전송됨
- [ ] "💾 Emotion saved to database" 메시지 표시
- [ ] 데이터베이스에 실제로 데이터 저장됨 (SQL 쿼리로 확인)

### ❌ 다음 중 하나라도 보이면 실패:
- [ ] "Database is disabled"
- [ ] "Cannot read properties of undefined"
- [ ] emotion_update 메시지가 10초마다 안 옴
- [ ] 데이터베이스 저장 로그가 안 보임

---

## 🔧 문제 해결

### 문제 1: "Database is disabled" 메시지
```
원인: DATABASE_URL이 설정되지 않음
해결:
1. Render 콘솔에서 Environment 탭 확인
2. DATABASE_URL이 정확히 입력되었는지 확인
3. 특수문자(@, :, /) 올바르게 입력되었는지 확인
4. "Deploy latest commit" 클릭해서 재배포
5. 로그 새로고침 (F5)
```

### 문제 2: "Cannot connect to database"
```
원인: 데이터베이스 호스트가 도달 불가능
해결:
1. DATABASE_URL의 호스트/포트 다시 확인
2. 방화벽에서 Render IP 허용되어 있는지 확인
3. 데이터베이스가 실제로 실행 중인지 확인
4. 로컬에서 그 호스트로 연결 가능한지 테스트
   mysql -h <host> -u <user> -p
```

### 문제 3: emotion_update 메시지가 안 옴
```
원인 1: 백엔드 배포가 완료되지 않음
→ Render 로그에서 배포 상태 확인

원인 2: WebSocket 연결이 끊김
→ 프론트 개발자 도구 > Network > WS 필터로 확인

원인 3: 세션이 제대로 시작되지 않음
→ 프론트 콘솔에서 "Session started" 메시지 확인
```

---

## 📞 대기 시간 동안 할 일

배포 대기 중 (2-3분):

- [ ] 기존 코드의 다른 감정 관련 로직 검토
- [ ] 데이터베이스 schema에서 emotionsData 필드 확인
- [ ] 팀과 공유할 로그 스크린샷 준비
- [ ] 프론트엔드 팀에 진행 상황 알림

---

## 💬 프론트엔드 팀에 알릴 메시지

배포 완료되면 프론트엔드 팀에 다음 메시지 보내세요:

```
✅ 백엔드 감정 분석 시스템 준비 완료!

상태:
- DATABASE_URL 설정 완료
- emotion_update 메시지 10초마다 전송 중
- 데이터베이스에 감정 데이터 저장 중

프론트엔드 팀이 이제 Phase 1을 시작할 수 있습니다.

로그: [Render 링크]
```

---

## 📚 참고 문서

**상세 내용이 필요하면:**
- [BeMoreBackend/BACKEND_EMOTION_DEPLOYMENT.md](./BeMoreBackend/BACKEND_EMOTION_DEPLOYMENT.md) ← 전체 가이드
- [README_EMOTION_SYSTEM.md](./README_EMOTION_SYSTEM.md) ← 기술 설명

**이 프롬프트는 빠른 실행을 위한 최소한의 정보만 포함합니다.**

---

## ⏱️ 예상 시간표

| 단계 | 시간 |
|------|------|
| DATABASE_URL 설정 | 5분 |
| 배포 재시작 및 대기 | 5분 |
| 로그 확인 | 5분 |
| 문제 해결 (만약 필요) | 30분 |
| **총 소요** | **1-2시간** |

---

## 🎯 완료 후

백엔드 배포가 완료되면:

1. ✅ 이 체크리스트에 모두 체크
2. ✅ 프론트엔드 팀에 완료 알림
3. ✅ TEAM_ANNOUNCEMENT.md에 진행 상황 업데이트 (선택사항)
4. ✅ 질문 있으면 [README_EMOTION_SYSTEM.md](./README_EMOTION_SYSTEM.md)의 Q&A 섹션 참고

---

**지금 시작하세요! 🚀**

```
Step 1: Render 콘솔 열기
Step 2: DATABASE_URL 설정
Step 3: 배포 재시작
Step 4: 로그에서 "✅ 데이터베이스 연결 성공" 확인
```

**예상 완료**: 오늘 중 (1-2시간 소요)
**긴급도**: ⚠️ 높음 (프론트팀이 대기 중)
