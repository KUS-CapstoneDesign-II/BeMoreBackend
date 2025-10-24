// 이 코드의 기능은 landmarkHandler.js 에 통합됨 (참고용)
const fs = require('fs');
const path = require('path');
const { analyzeExpression, generateDetailedReport } = require("../gemini/gemini");
const { getAccumulatedSpeechText, clearSpeechBuffer, clearAllSpeechBuffer } = require("../memory");

const ACCUMULATION_DURATION_MS = 60 * 1000; // 1분

function setupLandmarkSocket(wss) {
  wss.on("connection", (socket) => {
    console.log("✅ 클라이언트 연결됨");

  let landmarkBuffer = [];
  let analyzing = false;
  let lastAnalysisTime = Date.now();
  // 세션 시작 시간 기록 (종료 시 최소 10초 검사에 사용)
  const sessionStartTime = Date.now();

    // 1분마다 누적된 얼굴+STT 데이터를 분석
    const analysisInterval = setInterval(async () => {
      if ((landmarkBuffer.length === 0) && (Date.now() - lastAnalysisTime < ACCUMULATION_DURATION_MS)) {
        return;
      }

      analyzing = true;

      // Gemini로 보낼 데이터 준비
      const framesToAnalyze = [...landmarkBuffer];
      const sttToAnalyze = getAccumulatedSpeechText(lastAnalysisTime);

      // 다음 주기를 위해 초기화
      landmarkBuffer = [];
      lastAnalysisTime = Date.now();
      clearSpeechBuffer(lastAnalysisTime);

      try {
        console.log(`📦 1분 누적 전송 (frames: ${framesToAnalyze.length}, stt_len: ${sttToAnalyze.length})`);

       console.log(framesToAnalyze);
        
        const emotion = await analyzeExpression(framesToAnalyze, sttToAnalyze);
        console.log(`🎯 Gemini 분석 결과: ${emotion}`);

        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({
            type: "analysis_result",
            emotion,
            timestamp: new Date().toISOString(),
            frames_count: framesToAnalyze.length,
            stt_snippet: sttToAnalyze ? sttToAnalyze.slice(0, 200) : ""
          }));
        }
      } catch (err) {
        console.error("누적 분석 중 에러:", err);
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({
            type: "analysis_error",
            message: "누적 분석 중 오류가 발생했습니다."
          }));
        }
      } finally {
        analyzing = false;
      }
    }, ACCUMULATION_DURATION_MS);

  socket.on("message", async (data) => {
      try {
        // 클라이언트에서 제어 메시지로 JSON 문자열을 보낼 수 있음
        const parsed = JSON.parse(data);

        // 예: { type: 'control', action: 'stop' }
        if (parsed && parsed.type === 'control') {
          if (parsed.action === 'stop') {
            const sessionDuration = Date.now() - sessionStartTime;
            // 세션이 10초 미만이면 종료 거부 (추후 수치 조정 가능)
            if (sessionDuration < 10000) {
              console.log('종료 요청 거부: 세션이 충분히 길지 않음', sessionDuration);
              if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({ type: 'stop_refused', reason: '세션이 충분히 길지 않습니다. 최소 10초 필요합니다.', duration: sessionDuration }));
              }
              return;
            }

            // 즉시 현재 버퍼로 분석을 수행
            try {
              const framesToAnalyze = [...landmarkBuffer];
              const sttToAnalyze = getAccumulatedSpeechText(sessionStartTime);

              console.log('사용자 중지 요청 처리: 즉시 최종 분석 수행', { frames: framesToAnalyze.length, stt_len: sttToAnalyze.length });
              const emotion = await analyzeExpression(framesToAnalyze, sttToAnalyze);

              // 상세 보고서 생성
              const detailed = await generateDetailedReport(framesToAnalyze, sttToAnalyze);

              const result = {
                type: 'final_analysis',
                emotion,
                timestamp: new Date().toISOString(),
                frames_count: framesToAnalyze.length,
                stt_snippet: sttToAnalyze ? sttToAnalyze.slice(0, 1000) : "",
                detailed_report: detailed
              };

              // 클라이언트에 전송
              if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify(result));
              }

              // 결과 저장 (tmp/analyses에 JSON 파일)
              try {
                const outDir = path.join(__dirname, '..', 'tmp', 'analyses');
                fs.mkdirSync(outDir, { recursive: true });
                const outPath = path.join(outDir, `analysis_${Date.now()}.json`);
                fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
                console.log('종합 분석 결과가 파일에 저장되었습니다:', outPath);
              } catch (fsErr) {
                console.warn('분석 결과 저장 실패:', fsErr);
              }
            } catch (err) {
              console.error('종료 시 즉시 분석 실패:', err);
              if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({ type: 'analysis_error', message: '종료 시 즉시 분석에 실패했습니다.' }));
              }
            } finally {
              // 버퍼와 인터벌 정리
              landmarkBuffer = [];
              try { clearSpeechBuffer(Date.now()); } catch (e) { /* noop */ }
              clearInterval(analysisInterval);
            }

            return;
          }
        }

        // 기본: landmarks 배열 수신 처리
        const landmarks = parsed;
        if (Array.isArray(landmarks)) {
          landmarkBuffer.push({
            timestamp: Date.now(),
            landmarks
          });
        }
      } catch (err) {
        console.error("WS 데이터 파싱 오류:", err);
      }
    });

    socket.on("close", () => {
      console.log("❌ 클라이언트 연결 종료");
      clearInterval(analysisInterval);
    });

    socket.on("error", (err) => {
      console.error("WS 소켓 에러:", err);
      clearInterval(analysisInterval);
    });
  });
}

module.exports = { setupLandmarkSocket };
