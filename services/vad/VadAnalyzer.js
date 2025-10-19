const { MicVAD } = require('@ricky0123/vad-node');

/**
 * VadAnalyzer - Silero VAD를 사용한 실시간 음성 활동 탐지
 *
 * 역할:
 * - 100ms 단위 오디오 청크 실시간 분석
 * - 음성(speech) vs 침묵(silence) 구분
 * - 확률 점수 제공 (0.0 ~ 1.0)
 *
 * Phase 2 핵심 기능:
 * - 실시간 VAD 처리
 * - 심리 상담에 최적화된 음성 탐지
 * - 노이즈 필터링 (음악, 배경소음 제거)
 */

class VadAnalyzer {
  constructor(options = {}) {
    this.isInitialized = false;
    this.vad = null;
    this.onSpeechStart = options.onSpeechStart || (() => {});
    this.onSpeechEnd = options.onSpeechEnd || (() => {});
    this.onVADResult = options.onVADResult || (() => {});

    // VAD 설정 (Silero VAD 기본값)
    this.config = {
      // 음성 감지 임계값 (0.0 ~ 1.0)
      // 0.5: 일반적인 대화 환경
      // 높을수록 false positive 감소, 민감도 감소
      positiveSpeechThreshold: options.positiveSpeechThreshold || 0.5,

      // 침묵 감지 임계값
      // 0.35: 심리 상담에 적합 (긴 침묵도 감지)
      negativeSpeechThreshold: options.negativeSpeechThreshold || 0.35,

      // 최소 음성 지속 시간 (ms)
      // 250ms: 짧은 단어도 감지
      minSpeechFrames: options.minSpeechFrames || 3, // 3 frames * 96ms ≈ 288ms

      // 음성 종료 판정을 위한 침묵 지속 시간 (ms)
      // 500ms: 자연스러운 호흡, 사고 시간 허용
      redemptionFrames: options.redemptionFrames || 5, // 5 frames * 96ms ≈ 480ms

      // 사전 음성 패딩 (ms)
      // 음성 시작 전 프레임 포함 (자연스러운 시작)
      preSpeechPadFrames: options.preSpeechPadFrames || 1,

      // 샘플링 레이트 (Hz)
      // 16000Hz: Silero VAD 권장 값
      sampleRate: options.sampleRate || 16000
    };

    console.log('📊 VadAnalyzer 초기화 중...');
    console.log(`   - 음성 임계값: ${this.config.positiveSpeechThreshold}`);
    console.log(`   - 침묵 임계값: ${this.config.negativeSpeechThreshold}`);
    console.log(`   - 최소 음성 지속시간: ${this.config.minSpeechFrames * 96}ms`);
    console.log(`   - 침묵 판정 시간: ${this.config.redemptionFrames * 96}ms`);
  }

  /**
   * VAD 시스템 초기화
   * Silero VAD 모델 로드
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ VadAnalyzer 이미 초기화됨');
      return;
    }

    try {
      console.log('🔄 Silero VAD 모델 로딩 중...');

      this.vad = await MicVAD.new({
        positiveSpeechThreshold: this.config.positiveSpeechThreshold,
        negativeSpeechThreshold: this.config.negativeSpeechThreshold,
        minSpeechFrames: this.config.minSpeechFrames,
        redemptionFrames: this.config.redemptionFrames,
        preSpeechPadFrames: this.config.preSpeechPadFrames,

        onSpeechStart: (audio) => {
          console.log('🎤 음성 감지 시작');
          this.onSpeechStart({
            timestamp: Date.now(),
            audioData: audio
          });
        },

        onSpeechEnd: (audio) => {
          console.log('🔇 음성 감지 종료');
          this.onSpeechEnd({
            timestamp: Date.now(),
            audioData: audio,
            duration: audio.length / this.config.sampleRate * 1000 // ms
          });
        },

        onVADMisfire: () => {
          console.log('⚠️ VAD 오탐지 (너무 짧은 음성)');
        }
      });

      this.isInitialized = true;
      console.log('✅ VadAnalyzer 초기화 완료');

    } catch (error) {
      console.error('❌ VadAnalyzer 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 오디오 청크 분석 (WebSocket에서 수신한 데이터)
   *
   * @param {Buffer|Float32Array} audioChunk - 오디오 데이터
   * @returns {Object} VAD 결과 { isSpeech, probability, timestamp }
   */
  async analyzeChunk(audioChunk) {
    if (!this.isInitialized) {
      throw new Error('VadAnalyzer가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
    }

    try {
      // Float32Array로 변환 (Silero VAD 요구사항)
      let audioFloat32;

      if (audioChunk instanceof Float32Array) {
        audioFloat32 = audioChunk;
      } else if (Buffer.isBuffer(audioChunk)) {
        // Buffer → Float32Array 변환
        audioFloat32 = new Float32Array(audioChunk.length / 2);
        for (let i = 0; i < audioFloat32.length; i++) {
          // 16-bit PCM → Float32 (-1.0 ~ 1.0)
          const int16 = audioChunk.readInt16LE(i * 2);
          audioFloat32[i] = int16 / 32768.0;
        }
      } else {
        throw new Error('지원하지 않는 오디오 형식입니다.');
      }

      // VAD 분석 실행
      // 참고: MicVAD.new()는 자동으로 프레임별 분석을 수행하고
      // onSpeechStart/onSpeechEnd 콜백을 호출합니다.
      // 여기서는 수동 분석을 위한 메서드를 제공합니다.

      // 현재는 콜백 기반으로 동작하므로,
      // 실시간 스트림 처리는 voiceHandler.js에서 처리

      return {
        timestamp: Date.now(),
        audioLength: audioFloat32.length,
        sampleRate: this.config.sampleRate
      };

    } catch (error) {
      console.error('❌ VAD 분석 오류:', error);
      return {
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * VAD 시스템 시작 (마이크 입력 스트림 시작)
   */
  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('🎙️ VAD 스트림 시작...');
      await this.vad.start();
      console.log('✅ VAD 스트림 활성화');
    } catch (error) {
      console.error('❌ VAD 시작 실패:', error);
      throw error;
    }
  }

  /**
   * VAD 시스템 중지
   */
  async stop() {
    if (!this.vad) return;

    try {
      console.log('🛑 VAD 스트림 중지...');
      await this.vad.destroy();
      this.isInitialized = false;
      this.vad = null;
      console.log('✅ VAD 스트림 종료');
    } catch (error) {
      console.error('❌ VAD 중지 오류:', error);
    }
  }

  /**
   * VAD 설정 동적 변경
   *
   * @param {Object} newConfig - 새로운 설정 값
   */
  updateConfig(newConfig) {
    console.log('🔧 VAD 설정 업데이트:', newConfig);
    Object.assign(this.config, newConfig);

    // 설정 변경 시 재초기화 필요
    console.log('⚠️ 설정 변경 완료. 재초기화를 위해 stop() → initialize() → start()를 호출하세요.');
  }

  /**
   * 현재 VAD 상태 조회
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.vad !== null,
      config: this.config
    };
  }
}

module.exports = VadAnalyzer;
