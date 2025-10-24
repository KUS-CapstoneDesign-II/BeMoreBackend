const { GoogleGenerativeAI } = require('@google/generative-ai');
const errorHandler = require('../ErrorHandler');

/**
 * ConversationEngine
 *
 * 실시간 AI 대화 시스템
 * - Gemini API를 활용한 자연스러운 대화
 * - 컨텍스트 기반 응답 생성 (감정, VAD, CBT 분석 결과 활용)
 * - 대화 히스토리 관리 및 연속성 유지
 * - TTS 최적화된 응답 생성
 *
 * Phase 5: 실시간 AI 피드백 시스템
 */
class ConversationEngine {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 150  // TTS 최적화: 짧고 자연스러운 응답
      }
    });

    // 대화 히스토리 저장 (sessionId별)
    this.conversationHistory = new Map();
  }

  /**
   * 대화 생성 (컨텍스트 기반)
   *
   * @param {string} sessionId - 세션 ID
   * @param {string} userMessage - 사용자 발화 텍스트
   * @param {Object} context - 분석 컨텍스트
   * @param {string} context.emotion - 현재 감정 (happy, sad, angry 등)
   * @param {Object} context.vad - VAD 메트릭 (speechRatio, pauseRatio 등)
   * @param {Object} context.cbt - CBT 분석 결과 (인지 왜곡 탐지)
   * @returns {Promise<Object>} { response: string, responseType: string, context: Object }
   */
  async generateResponse(sessionId, userMessage, context = {}) {
    try {
      // 대화 히스토리 가져오기 또는 생성
      if (!this.conversationHistory.has(sessionId)) {
        this.conversationHistory.set(sessionId, {
          messages: [],
          sessionStartedAt: Date.now(),
          emotionTimeline: [],
          cbtFlags: []
        });
      }

      const history = this.conversationHistory.get(sessionId);

      // 컨텍스트 분석 및 프롬프트 구성
      const systemPrompt = this._buildSystemPrompt(context, history);
      const userPrompt = this._buildUserPrompt(userMessage, context);

      // Gemini API 호출
      const chat = this.model.startChat({
        history: this._buildChatHistory(history),
        generationConfig: {
          maxOutputTokens: 150,  // 간결한 응답 (TTS 최적화)
        }
      });

      const result = await chat.sendMessage(systemPrompt + '\n\n' + userPrompt);
      const response = result.response.text().trim();

      // 응답 타입 분류
      const responseType = this._classifyResponse(response, context);

      // 히스토리 업데이트
      history.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
        context: {
          emotion: context.emotion,
          vadSummary: context.vad?.summary,
          cbtDetected: context.cbt?.hasDistortions
        }
      });

      history.messages.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        responseType
      });

      // 감정 타임라인 업데이트
      if (context.emotion) {
        history.emotionTimeline.push({
          timestamp: Date.now(),
          emotion: context.emotion
        });
      }

      // CBT 플래그 업데이트
      if (context.cbt?.hasDistortions) {
        history.cbtFlags.push({
          timestamp: Date.now(),
          distortions: context.cbt.detections.map(d => d.type)
        });
      }

      // 히스토리 크기 제한 (최근 20개 메시지만 유지)
      if (history.messages.length > 20) {
        history.messages = history.messages.slice(-20);
      }

      return {
        response,
        responseType,
        context: {
          historyLength: history.messages.length,
          emotionCount: history.emotionTimeline.length,
          cbtFlagCount: history.cbtFlags.length
        }
      };

    } catch (error) {
      errorHandler.handle(error, {
        module: 'conversation-engine',
        level: errorHandler.levels.ERROR,
        metadata: { sessionId, userMessage: userMessage?.slice(0, 50) }
      });

      // 에러 시 기본 응답 반환
      return {
        response: '죄송해요, 잠시 생각이 정리되지 않네요. 다시 한번 말씀해 주시겠어요?',
        responseType: 'error_fallback',
        context: { error: error.message }
      };
    }
  }

  /**
   * 시스템 프롬프트 구성 (컨텍스트 기반)
   */
  _buildSystemPrompt(context, history) {
    let prompt = `당신은 따뜻하고 공감적인 심리 상담사입니다.
사용자와 자연스럽고 편안한 대화를 나누며, 감정을 이해하고 지지해주세요.

**역할**:
- 사용자의 감정을 공감하고 존중하기
- 인지행동치료(CBT) 원리를 활용한 부드러운 질문
- 짧고 자연스러운 대화체 응답 (1-2문장, TTS 최적화)
- 강압적이지 않고 탐색적인 대화 유도

**대화 스타일**:
- 친근하고 따뜻한 말투
- 판단하지 않고 경청하는 태도
- 구체적이고 실용적인 조언
- 사용자의 속도에 맞추기

`;

    // 감정 컨텍스트 추가
    if (context.emotion) {
      const emotionContext = this._getEmotionContext(context.emotion);
      prompt += `\n**현재 사용자 감정**: ${emotionContext}\n`;
    }

    // VAD 컨텍스트 추가
    if (context.vad) {
      const vadContext = this._getVADContext(context.vad);
      prompt += `**목소리 분석**: ${vadContext}\n`;
    }

    // CBT 컨텍스트 추가
    if (context.cbt?.hasDistortions) {
      const cbtContext = this._getCBTContext(context.cbt);
      prompt += `**인지 패턴**: ${cbtContext}\n`;
    }

    // 대화 히스토리 요약
    if (history.messages.length > 0) {
      const recentEmotions = history.emotionTimeline.slice(-3).map(e => e.emotion).join(', ');
      prompt += `\n**최근 감정 흐름**: ${recentEmotions || '데이터 없음'}\n`;
    }

    return prompt;
  }

  /**
   * 사용자 프롬프트 구성
   */
  _buildUserPrompt(userMessage, context) {
    let prompt = `사용자: "${userMessage}"\n\n`;

    if (context.cbt?.needsIntervention && context.cbt?.intervention) {
      prompt += `(참고: 인지 왜곡 "${context.cbt.intervention.distortionName}"이 감지되었습니다. 부드럽게 탐색해주세요.)\n\n`;
    }

    prompt += `위 발화에 대해 1-2문장으로 자연스럽게 응답해주세요. TTS로 읽힐 것이므로 간결하고 대화체로 작성해주세요.`;

    return prompt;
  }

  /**
   * 감정 컨텍스트 생성
   */
  _getEmotionContext(emotion) {
    const emotionMap = {
      'happy': '기쁨 또는 긍정적',
      'sad': '슬픔 또는 우울',
      'angry': '분노 또는 짜증',
      'anxious': '불안 또는 긴장',
      'neutral': '중립적',
      'surprised': '놀람',
      'disgusted': '혐오 또는 불쾌',
      'fearful': '두려움'
    };

    return emotionMap[emotion] || emotion;
  }

  /**
   * VAD 컨텍스트 생성
   */
  _getVADContext(vad) {
    const contexts = [];

    if (vad.speechRatio > 0.7) {
      contexts.push('많이 말하고 있음');
    } else if (vad.speechRatio < 0.3) {
      contexts.push('말이 적음');
    }

    if (vad.pauseRatio > 0.5) {
      contexts.push('자주 멈춤');
    }

    if (vad.averagePauseDuration > 2000) {
      contexts.push('긴 침묵');
    }

    return contexts.length > 0 ? contexts.join(', ') : '정상적';
  }

  /**
   * CBT 컨텍스트 생성
   */
  _getCBTContext(cbt) {
    if (!cbt.hasDistortions) return '건강한 사고';

    const distortionNames = cbt.detections
      .slice(0, 2)  // 최대 2개만
      .map(d => d.name_ko)
      .join(', ');

    return `${distortionNames} 패턴 감지`;
  }

  /**
   * Gemini Chat History 형식으로 변환
   */
  _buildChatHistory(history) {
    return history.messages.slice(-10).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  /**
   * 응답 타입 분류
   */
  _classifyResponse(response, context) {
    // CBT 개입이 필요한 경우
    if (context.cbt?.needsIntervention) {
      return 'cbt_intervention';
    }

    // 강한 부정 감정인 경우
    if (['sad', 'angry', 'anxious', 'fearful'].includes(context.emotion)) {
      return 'empathy_support';
    }

    // 긍정 감정인 경우
    if (context.emotion === 'happy') {
      return 'positive_reinforcement';
    }

    // 일반 대화
    return 'general_conversation';
  }

  /**
   * 대화 히스토리 조회
   */
  getConversationHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || null;
  }

  /**
   * 대화 히스토리 초기화
   */
  clearConversationHistory(sessionId) {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * 모든 대화 히스토리 초기화
   */
  clearAllConversations() {
    this.conversationHistory.clear();
  }
}

module.exports = ConversationEngine;
