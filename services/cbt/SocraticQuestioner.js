const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * SocraticQuestioner - 소크라테스식 질문 생성기
 *
 * 5가지 질문 원칙:
 * 1. 증거 탐색 - "그렇게 생각하는 증거가 있나요?"
 * 2. 대안 탐색 - "다른 가능성은 없을까요?"
 * 3. 결과 예측 - "실제로 그렇게 된다면?"
 * 4. 과거 경험 - "비슷한 상황은 어떻게 해결했나요?"
 * 5. 타인 관점 - "친구라면 뭐라고 할까요?"
 *
 * Gemini API 활용:
 * - 맥락에 맞는 질문 3-5개 생성
 * - 인지 왜곡 유형별 맞춤 질문
 * - 내담자의 말을 반영한 구체적 질문
 */

class SocraticQuestioner {
  constructor() {
    // Gemini API 초기화
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY가 설정되지 않았습니다');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }

    this.temperature = parseFloat(process.env.GEMINI_CBT_TEMPERATURE) || 0.7;

    // 왜곡 유형별 기본 질문 템플릿
    this.questionTemplates = this._initializeTemplates();

    console.log('🤔 SocraticQuestioner 초기화 완료');
  }

  /**
   * 왜곡 유형별 기본 질문 템플릿
   */
  _initializeTemplates() {
    return {
      catastrophizing: [
        "최악의 상황이 실제로 일어날 가능성은 얼마나 될까요?",
        "과거에 비슷한 걱정을 한 적이 있나요? 그때는 어떻게 되었나요?",
        "친구가 같은 걱정을 한다면 뭐라고 조언하시겠어요?",
        "최선의 시나리오와 최악의 시나리오 사이에 어떤 가능성들이 있을까요?",
        "만약 최악이 일어난다면, 대처할 방법은 없을까요?"
      ],
      'all-or-nothing': [
        "완벽하지 않더라도 가치 있는 것은 없을까요?",
        "0점과 100점 사이에는 어떤 점수들이 있을까요?",
        "부분적으로 성공한 경험을 떠올려볼 수 있나요?",
        "다른 사람들도 모든 것을 완벽하게 하나요?",
        "중간 정도의 성과도 의미가 있지 않을까요?"
      ],
      overgeneralization: [
        "이번 한 번의 경험이 항상 그럴 것이라는 증거가 되나요?",
        "과거에 다른 결과가 나온 적은 없었나요?",
        "몇 번의 경험으로 일반화하는 것이 타당할까요?",
        "상황이 달라지면 결과도 달라질 수 있지 않을까요?",
        "예외적인 경우는 없었나요?"
      ],
      'mental-filter': [
        "부정적인 측면만 보고 있는 것은 아닐까요?",
        "잘된 부분은 어떤 것들이 있나요?",
        "다른 사람이 본다면 어떤 긍정적인 면을 발견할까요?",
        "전체 그림을 보면 어떤 모습일까요?",
        "좋았던 점들을 무시하고 있지는 않나요?"
      ],
      'disqualifying-positive': [
        "긍정적인 것을 인정하지 않는 이유가 있나요?",
        "운이 아니라 당신의 노력이 만든 결과는 아닐까요?",
        "다른 사람도 그 일을 쉽게 할 수 있을까요?",
        "당신의 능력과 노력을 인정해도 괜찮지 않을까요?",
        "성공을 폄하하는 것이 도움이 될까요?"
      ],
      'jumping-to-conclusions': [
        "그렇게 생각하는 확실한 증거가 있나요?",
        "다른 해석의 가능성은 없을까요?",
        "실제로 확인해본 적이 있나요?",
        "추측과 사실을 구분할 수 있나요?",
        "다른 이유로도 설명될 수 있지 않을까요?"
      ],
      magnification: [
        "이 문제가 정말 그렇게 큰 문제일까요?",
        "1년 후에 돌아본다면 어떻게 보일까요?",
        "0점부터 10점 척도로 본다면 몇 점일까요?",
        "성공한 부분을 과소평가하고 있지는 않나요?",
        "균형잡힌 시각으로 보면 어떨까요?"
      ],
      'emotional-reasoning': [
        "불안하다는 느낌이 실제 위험을 의미하나요?",
        "감정과 사실을 구분할 수 있나요?",
        "증거를 찾아본다면 어떤 결과가 나올까요?",
        "감정이 가라앉으면 생각이 달라질까요?",
        "느낌이 아닌 사실로 판단한다면 어떨까요?"
      ],
      'should-statements': [
        "반드시 그래야만 하는 이유가 있나요?",
        "그 규칙은 누가 정한 건가요?",
        "완벽하지 않아도 괜찮지 않을까요?",
        "더 유연한 기준을 가질 수는 없을까요?",
        "당위적 사고가 당신에게 도움이 되나요?"
      ],
      labeling: [
        "한 번의 실수가 당신 전체를 정의하나요?",
        "당신의 좋은 면들은 어디로 간 건가요?",
        "친구에게도 그런 꼬리표를 붙일 건가요?",
        "행동과 사람을 분리할 수 있나요?",
        "그 낙인이 사실에 근거한 건가요?"
      ]
    };
  }

  /**
   * 소크라테스식 질문 생성
   *
   * @param {Object} distortion - 탐지된 인지 왜곡
   * @param {string} distortion.type - 왜곡 유형
   * @param {string} distortion.text - 내담자가 말한 텍스트
   * @param {Object} context - 추가 컨텍스트 (감정, VAD 등)
   * @returns {Promise<Array>} 생성된 질문 목록
   */
  async generateQuestions(distortion, context = {}) {
    const { type, text } = distortion;

    // 1. 기본 템플릿 질문 가져오기
    const templateQuestions = this.questionTemplates[type] || [];

    // 2. Gemini API 사용 가능 시, 맥락 맞춤 질문 생성
    if (this.genAI) {
      try {
        const aiQuestions = await this._generateWithGemini(distortion, context);

        // AI 생성 질문 + 템플릿 질문 조합 (최대 5개)
        const combinedQuestions = [
          ...aiQuestions.slice(0, 3),
          ...templateQuestions.slice(0, 2)
        ];

        console.log(`✅ 소크라테스식 질문 생성: ${combinedQuestions.length}개`);
        return combinedQuestions;

      } catch (error) {
        console.warn('⚠️ Gemini API 질문 생성 실패, 템플릿 사용:', error.message);
        return templateQuestions.slice(0, 5);
      }
    }

    // 3. Gemini API 없으면 템플릿만 사용
    console.log(`✅ 템플릿 질문 사용: ${templateQuestions.slice(0, 5).length}개`);
    return templateQuestions.slice(0, 5);
  }

  /**
   * Gemini API로 맥락 맞춤 질문 생성
   */
  async _generateWithGemini(distortion, context) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: 500
      }
    });

    const prompt = `
당신은 인지행동치료(CBT) 전문가입니다.
내담자가 다음과 같은 인지 왜곡을 보이고 있습니다:

왜곡 유형: ${distortion.name_ko} (${distortion.name_en})
왜곡 설명: ${distortion.description}
내담자의 말: "${distortion.text}"

소크라테스식 질문법을 사용하여 내담자가 스스로 생각을 재평가할 수 있도록 돕는 질문 3개를 생성하세요.

질문 원칙:
1. 판단하지 말고 호기심을 가지고 질문
2. 증거를 탐색하도록 유도
3. 대안적 관점을 고려하게 함
4. 구체적이고 명확하게
5. 한국어로 작성

질문 형식:
1. [질문 1]
2. [질문 2]
3. [질문 3]
`.trim();

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // 응답에서 질문 추출
    const questions = response
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 0);

    return questions.slice(0, 3);
  }

  /**
   * 질문 유형별 분류
   */
  categorizeQuestion(question) {
    if (question.includes('증거') || question.includes('확실')) {
      return 'evidence'; // 증거 탐색
    } else if (question.includes('다른') || question.includes('가능성')) {
      return 'alternative'; // 대안 탐색
    } else if (question.includes('만약') || question.includes('그렇게')) {
      return 'consequence'; // 결과 예측
    } else if (question.includes('과거') || question.includes('경험')) {
      return 'experience'; // 과거 경험
    } else if (question.includes('친구') || question.includes('다른 사람')) {
      return 'perspective'; // 타인 관점
    }
    return 'general';
  }
}

module.exports = SocraticQuestioner;
