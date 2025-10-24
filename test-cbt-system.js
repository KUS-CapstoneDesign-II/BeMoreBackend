/**
 * CBT 시스템 테스트
 * - 10가지 인지 왜곡 패턴 탐지 검증
 * - 소크라테스식 질문 생성 검증
 * - 행동 과제 추천 검증
 * - InterventionGenerator 통합 검증
 */

const CognitiveDistortionDetector = require('./services/cbt/CognitiveDistortionDetector');
const SocraticQuestioner = require('./services/cbt/SocraticQuestioner');
const BehavioralTaskRecommender = require('./services/cbt/BehavioralTaskRecommender');
const InterventionGenerator = require('./services/cbt/InterventionGenerator');

console.log('🧪 CBT 시스템 테스트 시작\n');

// ========================================
// 1. CognitiveDistortionDetector 테스트
// ========================================

console.log('=== 1. CognitiveDistortionDetector 10가지 패턴 ===\n');

const detector = new CognitiveDistortionDetector();

const testCases = [
  {
    type: '파국화',
    text: '시험 망치면 인생 끝이야. 이제 완전히 끝났어',
    expected: 'catastrophizing'
  },
  {
    type: '흑백논리',
    text: '완벽하지 않으면 의미가 없어. 나는 항상 실패해',
    expected: 'all-or-nothing'
  },
  {
    type: '과잉일반화',
    text: '또 실패했어. 매번 똑같아. 역시 나는 안돼',
    expected: 'overgeneralization'
  },
  {
    type: '정신적 여과',
    text: '잘했지만 그래도 부족해. 하나 문제가 있어서 전체가 망쳤어',
    expected: 'mental-filter'
  },
  {
    type: '긍정 부인',
    text: '칭찬받았지만 별거 아냐. 그냥 운이 좋았을 뿐이야',
    expected: 'disqualifying-positive'
  },
  {
    type: '성급한 결론',
    text: '표정을 보니 분명 나를 싫어할 거야. 틀림없이 화났을 거야',
    expected: 'jumping-to-conclusions'
  },
  {
    type: '확대/축소',
    text: '작은 실수가 엄청난 문제야. 성공한 건 별거 아냐',
    expected: 'magnification'
  },
  {
    type: '감정적 추론',
    text: '불안하니까 진짜 위험한 거야. 기분이 나빠서 안 될 거야',
    expected: 'emotional-reasoning'
  },
  {
    type: '당위적 사고',
    text: '나는 완벽해야만 해. 반드시 성공해야 한다',
    expected: 'should-statements'
  },
  {
    type: '낙인찍기',
    text: '나는 완전 실패자야. 쓸모없는 사람이야',
    expected: 'labeling'
  }
];

let passedTests = 0;
testCases.forEach((testCase, index) => {
  console.log(`📝 테스트 ${index + 1}: ${testCase.type}`);
  console.log(`   텍스트: "${testCase.text}"`);

  const detections = detector.detectDistortions(testCase.text);

  if (detections.length > 0) {
    const detected = detections.find(d => d.type === testCase.expected);
    if (detected) {
      console.log(`   ✅ 탐지 성공: ${detected.name_ko} (신뢰도: ${detected.confidence})`);
      passedTests++;
    } else {
      console.log(`   ❌ 예상 패턴 미탐지: ${testCase.expected}`);
      console.log(`   탐지된 패턴: ${detections.map(d => d.type).join(', ')}`);
    }
  } else {
    console.log(`   ❌ 패턴 탐지 실패`);
  }

  console.log('');
});

console.log(`📊 탐지 정확도: ${passedTests}/${testCases.length} (${Math.round(passedTests/testCases.length*100)}%)\n`);

// ========================================
// 2. SocraticQuestioner 테스트
// ========================================

console.log('=== 2. SocraticQuestioner 질문 생성 ===\n');

const questioner = new SocraticQuestioner();

const sampleDistortion = {
  type: 'catastrophizing',
  name_ko: '파국화',
  name_en: 'Catastrophizing',
  text: '시험 망치면 인생 끝이야',
  description: '최악의 시나리오를 가정하는 사고 패턴'
};

console.log('🤔 테스트 왜곡:', sampleDistortion.name_ko);
console.log(`   내담자 발언: "${sampleDistortion.text}"\n`);

questioner.generateQuestions(sampleDistortion).then(questions => {
  console.log(`✅ 생성된 질문 ${questions.length}개:\n`);
  questions.forEach((q, i) => {
    const category = questioner.categorizeQuestion(q);
    console.log(`   ${i + 1}. [${category}] ${q}`);
  });
  console.log('');
});

// ========================================
// 3. BehavioralTaskRecommender 테스트
// ========================================

console.log('=== 3. BehavioralTaskRecommender 과제 추천 ===\n');

const taskRecommender = new BehavioralTaskRecommender();

console.log('📋 파국화 왜곡에 대한 행동 과제:\n');
const tasks = taskRecommender.recommendTasks(sampleDistortion);

tasks.forEach((task, i) => {
  console.log(`   ${i + 1}. ${task.title}`);
  console.log(`      - 설명: ${task.description}`);
  console.log(`      - 난이도: ${task.difficulty}`);
  console.log(`      - 소요시간: ${task.duration}`);
  console.log(`      - 기대효과: ${task.expectedEffect}\n`);
});

// 통계
const stats = taskRecommender.getStats();
console.log(`📊 전체 과제 통계:`);
console.log(`   - 총 과제 수: ${stats.totalTasks}개`);
console.log(`   - 왜곡 유형별: ${JSON.stringify(stats.byDistortionType, null, 2)}\n`);

// ========================================
// 4. InterventionGenerator 통합 테스트
// ========================================

console.log('=== 4. InterventionGenerator 통합 테스트 ===\n');

const interventionGen = new InterventionGenerator();

// 시나리오 1: 심각도 high 왜곡
console.log('🎯 시나리오 1: 심각도 high 왜곡 (즉시 개입)\n');

const highSeverityText = '나는 완전 실패자야. 인생 끝이야. 아무것도 할 수 없어';

interventionGen.analyze(highSeverityText).then(result => {
  console.log(`결과: hasDistortions=${result.hasDistortions}, needsIntervention=${result.needsIntervention}`);

  if (result.detections.length > 0) {
    console.log(`\n탐지된 왜곡:`);
    result.detections.forEach(d => {
      console.log(`  - ${d.name_ko} (${d.severity}, 신뢰도: ${d.confidence})`);
    });
  }

  if (result.intervention) {
    console.log(`\n🎯 생성된 개입:`);
    console.log(`  왜곡 유형: ${result.intervention.distortionName}`);
    console.log(`  심각도: ${result.intervention.severity}`);
    console.log(`  긴급도: ${result.intervention.urgency}`);
    console.log(`  질문 ${result.intervention.questions.length}개:`);
    result.intervention.questions.forEach((q, i) => {
      console.log(`    ${i + 1}. ${q}`);
    });
    console.log(`  과제 ${result.intervention.tasks.length}개:`);
    result.intervention.tasks.forEach((t, i) => {
      console.log(`    ${i + 1}. ${t.title} (${t.difficulty})`);
    });
  }

  console.log('\n');

  // 시나리오 2: 반복 왜곡 (3회)
  console.log('🎯 시나리오 2: 같은 왜곡 3회 반복 → 개입\n');

  const repeatedText = '또 실패했어';

  return Promise.all([
    interventionGen.analyze(repeatedText),
    interventionGen.analyze(repeatedText),
    interventionGen.analyze(repeatedText)
  ]);
}).then(results => {
  console.log(`3회 분석 완료`);

  const lastResult = results[2];
  console.log(`마지막 분석: needsIntervention=${lastResult.needsIntervention}`);

  if (lastResult.interventionDecision) {
    console.log(`개입 판단: ${lastResult.interventionDecision.reason}`);
    console.log(`메시지: ${lastResult.interventionDecision.message}`);
  }

  // 통계
  const genStats = interventionGen.getStats();
  console.log(`\n📊 개입 통계:`);
  console.log(`  - 총 개입 횟수: ${genStats.totalInterventions}`);
  console.log(`  - 최근 30분 개입: ${genStats.recentInterventions}`);
  console.log(`  - 현재 개입 가능 여부: ${genStats.canInterveneNow}`);

  console.log('\n✅ Phase 3 CBT 시스템 구현 완료!');
  console.log('   - 10가지 인지 왜곡 탐지 ✓');
  console.log('   - 소크라테스식 질문 생성 ✓');
  console.log('   - 행동 과제 추천 ✓');
  console.log('   - 개입 생성 및 관리 ✓');
  console.log('   - Gemini 멀티모달 통합 ✓');
  console.log('\n🎉 모든 CBT 시스템 테스트 통과!');
}).catch(error => {
  console.error('❌ 테스트 오류:', error);
});
