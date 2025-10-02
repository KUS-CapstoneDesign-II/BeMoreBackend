# Emotion Detection Backend (FastAPI + ML)

이 레포지토리는 얼굴 랜드마크 데이터를 기반으로 감정을 예측하는 **백엔드 서버**입니다.  
`얼굴 표정 인식`, `목소리 변화 인식`, `상담 내용 분석 ` 을 통해 사용자의 심리 상태를 예측할 수 있는 서비스

---

## 🚀 기능
- `ws` 및 `MediaPipe` 를 이용 실시간 `Face Landmarks` 정보 추출 
- `gemini-2.5-flash-lite` 모델에 프롬포트를 통해 얼굴 표정 예측 (정확도 낮음)



## 👉 추가 필요 기능
- 목소리 데이터 추출 기능 필요
- 상담 내용 텍스트 수집 기능 필요
- 표정, 목소리, 내용 을 통합하여 사용자 심리 상태 예측 분석 모델 개발 필요
- 최적화 


---

## 📂 디렉토리 구조 (구조 상 변경 가능)
```
project-root/
├── app.js                   # 메인 서버 진입점 (Express 서버 실행)
├── package.json             # Node.js 프로젝트 설정 및 의존성
├── package-lock.json        # 의존성 잠금 파일
├── .env                     # 환경변수 (API 키 등)
├── .gitignore               # Git 무시 파일 규칙
├── README.md                # 프로젝트 문서
│
├── public/                  # 정적 파일(HTML, CSS, JS) 제공
│   └── index.html           # 얼굴 인식 테스트를 위한 웹 페이지 
│
├── node_modules/            # npm 설치된 패키지들 (gitignore 처리됨)
│
├── face_detector/        # 감정 분석 모듈 관련 코드
│   └── landmarkSocket.js    # Mediapipe로 얻은 랜드마크 데이터를 소켓으로 처리
│
└── gemini/                  # Gemini API 관련 로직
    └── gemini.js            # Gemini 프롬포트 입력 후 표정 예측 모듈
```
---
## 🛠️ 설치 및 실행


### 로컬 실행
```bash
# 의존성 설치 (package.json)
npm i

# 프로그램 실행 (dev) 
npm run dev 

# 접속 주소
localhost:8000
```