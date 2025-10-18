/**
 * BehavioralTaskRecommender - 행동 과제 추천 시스템
 *
 * 행동 과제 원칙:
 * 1. 구체적 - 측정 가능하고 실행 가능
 * 2. 점진적 - 작은 단계부터 시작
 * 3. 안전함 - 내담자에게 부담 없는 수준
 * 4. 일상적 - 일상에서 실천 가능
 * 5. 기록 - 과제 수행 후 기록 권장
 *
 * Phase 3 핵심 기능:
 * - 인지 왜곡 유형별 맞춤 과제
 * - 난이도 조절 (easy/medium/hard)
 * - 실천 가능한 구체적 행동
 */

class BehavioralTaskRecommender {
  constructor() {
    // 왜곡 유형별 행동 과제 데이터베이스
    this.taskDatabase = this._initializeTaskDatabase();

    console.log('📋 BehavioralTaskRecommender 초기화 완료');
    console.log(`   - 과제 카테고리: ${Object.keys(this.taskDatabase).length}개`);
  }

  /**
   * 왜곡 유형별 행동 과제 데이터베이스
   */
  _initializeTaskDatabase() {
    return {
      catastrophizing: [
        {
          title: "최악 vs 현실 비교하기",
          description: "걱정되는 상황의 '최악의 결과'와 '현실적으로 일어날 결과'를 종이에 적어보세요.",
          difficulty: "easy",
          duration: "10분",
          expectedEffect: "과도한 걱정과 현실의 차이 인식",
          instructions: [
            "걱정되는 상황을 구체적으로 적기",
            "최악의 시나리오 적기",
            "실제로 일어날 가능성 있는 결과 적기",
            "두 가지를 비교하고 차이점 발견하기"
          ]
        },
        {
          title: "과거 걱정 회고하기",
          description: "과거에 크게 걱정했던 일들이 실제로 어떻게 되었는지 기록해보세요.",
          difficulty: "easy",
          duration: "15분",
          expectedEffect: "걱정의 비현실성 경험적 학습",
          instructions: [
            "최근 6개월간 크게 걱정했던 일 3가지 적기",
            "각 걱정이 실제로 어떻게 되었는지 적기",
            "예상과 현실의 차이 비교하기"
          ]
        }
      ],
      'all-or-nothing': [
        {
          title: "중간 지대 찾기",
          description: "완벽과 실패 사이의 중간 단계들을 찾아보세요.",
          difficulty: "medium",
          duration: "15분",
          expectedEffect: "흑백논리 극복, 연속선상 사고 연습",
          instructions: [
            "평가하고 싶은 상황이나 과제 정하기",
            "0점(완전 실패)부터 100점(완벽) 척도 그리기",
            "20점, 40점, 60점, 80점에 해당하는 구체적 상황 적기",
            "자신의 현재 위치 표시하기"
          ]
        },
        {
          title: "부분 성공 인정하기",
          description: "오늘 하루 동안 부분적으로 성공한 일 3가지를 찾아보세요.",
          difficulty: "easy",
          duration: "10분",
          expectedEffect: "완벽하지 않아도 가치 있음을 인식",
          instructions: [
            "오늘 한 일들 나열하기",
            "각 일에서 잘한 부분 찾기",
            "부족한 부분도 인정하되, 잘한 부분에 집중하기"
          ]
        }
      ],
      overgeneralization: [
        {
          title: "반례 찾기",
          description: "'항상', '절대'라는 생각에 반대되는 예시를 찾아보세요.",
          difficulty: "easy",
          duration: "10분",
          expectedEffect: "과잉일반화 인식 및 수정",
          instructions: [
            "'항상 실패한다' 같은 일반화 문장 적기",
            "그 반대의 경험 최소 3가지 찾기",
            "예외가 존재함을 인정하기"
          ]
        },
        {
          title: "정확한 표현 연습",
          description: "'항상', '절대' 대신 구체적 빈도로 표현하는 연습을 해보세요.",
          difficulty: "medium",
          duration: "15분",
          expectedEffect: "정확한 언어 사용 습관 형성",
          instructions: [
            "자주 사용하는 과잉일반화 표현 적기",
            "실제 빈도 계산하기 (10번 중 몇 번?)",
            "정확한 표현으로 다시 쓰기"
          ]
        }
      ],
      'mental-filter': [
        {
          title: "긍정 일기 쓰기",
          description: "오늘 하루 중 좋았던 일 3가지를 기록하세요.",
          difficulty: "easy",
          duration: "10분",
          expectedEffect: "긍정적 측면에 주의 기울이기",
          instructions: [
            "아무리 작은 일이라도 좋았던 일 찾기",
            "왜 좋았는지 구체적으로 적기",
            "매일 저녁 실천하기"
          ]
        },
        {
          title: "전체 그림 그리기",
          description: "한 상황의 긍정적/부정적 측면을 균형있게 나열해보세요.",
          difficulty: "medium",
          duration: "20분",
          expectedEffect: "균형잡힌 시각 연습",
          instructions: [
            "분석할 상황 선택하기",
            "긍정적 측면 최소 5가지 적기",
            "부정적 측면 최소 5가지 적기",
            "전체적으로 봤을 때의 평가 적기"
          ]
        }
      ],
      'disqualifying-positive': [
        {
          title: "성공 인정 연습",
          description: "자신의 성공을 인정하고 그 이유를 분석해보세요.",
          difficulty: "medium",
          duration: "15분",
          expectedEffect: "긍정적 경험의 의미 재평가",
          instructions: [
            "최근 잘한 일 하나 선택하기",
            "운이 아닌 내 노력과 능력으로 가능했던 부분 찾기",
            "구체적으로 어떤 능력이 사용되었는지 적기"
          ]
        },
        {
          title: "칭찬 받아들이기",
          description: "다른 사람의 칭찬을 부정하지 않고 받아들이는 연습을 하세요.",
          difficulty: "easy",
          duration: "일상 중",
          expectedEffect: "긍정적 피드백 수용 능력 향상",
          instructions: [
            "칭찬을 들으면 '감사합니다'라고 답하기",
            "부정하거나 축소하지 않기",
            "칭찬의 내용을 기록하기"
          ]
        }
      ],
      'jumping-to-conclusions': [
        {
          title: "증거 수집하기",
          description: "추측하기 전에 실제 증거를 찾아보는 연습을 하세요.",
          difficulty: "medium",
          duration: "20분",
          expectedEffect: "사실과 추측 구분 능력 향상",
          instructions: [
            "걱정되는 추측 하나 정하기",
            "그 추측을 뒷받침하는 증거 찾기",
            "반대되는 증거도 찾기",
            "증거를 바탕으로 재평가하기"
          ]
        },
        {
          title: "확인하기 연습",
          description: "상대방의 생각을 추측하는 대신 직접 물어보세요.",
          difficulty: "hard",
          duration: "일상 중",
          expectedEffect: "독심술 오류 극복",
          instructions: [
            "상대의 생각을 추측하게 되면 인식하기",
            "가능하면 직접 물어보기",
            "추측과 실제의 차이 기록하기"
          ]
        }
      ],
      magnification: [
        {
          title: "척도화 연습",
          description: "문제의 크기를 0-10 척도로 평가해보세요.",
          difficulty: "easy",
          duration: "10분",
          expectedEffect: "문제의 실제 크기 객관화",
          instructions: [
            "크게 느껴지는 문제 선택하기",
            "0점(전혀 문제 아님) ~ 10점(인생 최대 위기) 척도에 표시",
            "1년 후 이 문제는 몇 점일지 예상하기",
            "실제 크기 재평가하기"
          ]
        },
        {
          title: "성공 확대하기",
          description: "성공한 일을 축소하지 말고 적절히 인정하는 연습을 하세요.",
          difficulty: "medium",
          duration: "15분",
          expectedEffect: "균형잡힌 자기 평가",
          instructions: [
            "최근 성공한 일 하나 선택하기",
            "그 성공이 가져온 긍정적 영향 나열하기",
            "축소하려는 경향 인식하고 멈추기"
          ]
        }
      ],
      'emotional-reasoning': [
        {
          title: "감정 vs 사실 구분하기",
          description: "느낌과 실제 사실을 분리해서 기록해보세요.",
          difficulty: "medium",
          duration: "15분",
          expectedEffect: "감정과 현실 구분 능력 향상",
          instructions: [
            "강한 감정이 든 상황 선택하기",
            "'내 느낌' 란에 감정 적기",
            "'실제 사실' 란에 객관적 증거 적기",
            "두 가지의 차이 비교하기"
          ]
        },
        {
          title: "감정 온도계",
          description: "감정의 강도를 측정하고 시간에 따른 변화를 관찰하세요.",
          difficulty: "easy",
          duration: "10분",
          expectedEffect: "감정의 일시성 인식",
          instructions: [
            "현재 감정을 0-10 척도로 표시",
            "1시간 후 다시 측정",
            "감정이 변했음을 관찰하기"
          ]
        }
      ],
      'should-statements': [
        {
          title: "'해야 한다' → '~하고 싶다' 바꾸기",
          description: "당위적 표현을 선호 표현으로 바꿔보세요.",
          difficulty: "medium",
          duration: "15분",
          expectedEffect: "유연한 사고방식 연습",
          instructions: [
            "자주 쓰는 '~해야 한다' 문장 3개 적기",
            "각각을 '~하고 싶다', '~하면 좋겠다'로 바꾸기",
            "느낌의 차이 관찰하기"
          ]
        },
        {
          title: "현실적 기대 설정하기",
          description: "완벽한 기준 대신 현실적인 기준을 세워보세요.",
          difficulty: "hard",
          duration: "20분",
          expectedEffect: "유연한 자기 기준 형성",
          instructions: [
            "자신에게 부과한 '해야만 하는 것' 나열하기",
            "각각이 정말 필수인지 검토하기",
            "더 현실적인 기준으로 수정하기"
          ]
        }
      ],
      labeling: [
        {
          title: "행동과 사람 분리하기",
          description: "실수한 행동과 자신을 분리해서 표현해보세요.",
          difficulty: "medium",
          duration: "15분",
          expectedEffect: "자아와 행동 구분 연습",
          instructions: [
            "'나는 실패자야' 같은 낙인 적기",
            "'나는 이번에 실수했다'로 바꾸기",
            "행동과 사람이 다름을 인식하기"
          ]
        },
        {
          title: "강점 목록 만들기",
          description: "자신의 긍정적 특성과 강점을 나열해보세요.",
          difficulty: "easy",
          duration: "15분",
          expectedEffect: "균형잡힌 자기 인식",
          instructions: [
            "자신의 좋은 점, 강점 최소 10가지 적기",
            "각 강점의 구체적 예시 떠올리기",
            "부정적 낙인과 비교하기"
          ]
        }
      ]
    };
  }

  /**
   * 인지 왜곡에 맞는 행동 과제 추천
   *
   * @param {Object} distortion - 탐지된 인지 왜곡
   * @param {string} difficulty - 난이도 필터 (easy/medium/hard)
   * @returns {Array} 추천 과제 목록
   */
  recommendTasks(distortion, difficulty = null) {
    const { type } = distortion;
    const tasks = this.taskDatabase[type] || [];

    if (tasks.length === 0) {
      console.warn(`⚠️ ${type}에 대한 행동 과제가 없습니다`);
      return [];
    }

    // 난이도 필터링
    let filteredTasks = difficulty
      ? tasks.filter(t => t.difficulty === difficulty)
      : tasks;

    // 최대 3개 과제 추천
    const recommendedTasks = filteredTasks.slice(0, 3).map(task => ({
      ...task,
      distortionType: type,
      distortionName: distortion.name_ko
    }));

    console.log(`✅ 행동 과제 추천: ${recommendedTasks.length}개 (${type})`);

    return recommendedTasks;
  }

  /**
   * 난이도별 과제 추천
   */
  getTasksByDifficulty(type, difficulty) {
    const tasks = this.taskDatabase[type] || [];
    return tasks.filter(t => t.difficulty === difficulty);
  }

  /**
   * 모든 과제 통계
   */
  getStats() {
    const stats = {};
    let totalTasks = 0;

    Object.entries(this.taskDatabase).forEach(([type, tasks]) => {
      stats[type] = tasks.length;
      totalTasks += tasks.length;
    });

    return {
      totalTasks,
      byDistortionType: stats
    };
  }
}

module.exports = BehavioralTaskRecommender;
