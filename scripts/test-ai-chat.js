#!/usr/bin/env node

/**
 * AI Voice Chat WebSocket 테스트 스크립트
 *
 * 사용법:
 *   node scripts/test-ai-chat.js [options]
 *
 * Options:
 *   --url <ws://host:port>    WebSocket 서버 URL (기본: ws://localhost:3000)
 *   --session <session_id>     세션 ID (기본: 자동 생성)
 *   --message <text>          테스트 메시지 (기본: "안녕하세요, 요즘 우울해요")
 *   --emotion <emotion>        감정 상태 (기본: "sad")
 *   --multiple                 여러 메시지 테스트
 *
 * 예제:
 *   node scripts/test-ai-chat.js
 *   node scripts/test-ai-chat.js --url ws://localhost:3000 --emotion anxious
 *   node scripts/test-ai-chat.js --multiple
 */

const WebSocket = require('ws');

// 명령줄 인자 파싱
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : defaultValue;
}
function hasFlag(name) {
  return args.includes(name);
}

// 설정
const WS_URL = getArg('--url', 'ws://localhost:3000');
const SESSION_ID = getArg('--session', `test_session_${Date.now()}`);
const TEST_MESSAGE = getArg('--message', '안녕하세요, 요즘 우울해요');
const TEST_EMOTION = getArg('--emotion', 'sad');
const MULTIPLE_MESSAGES = hasFlag('--multiple');

// 색상 코드 (터미널 출력)
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${'='.repeat(60)}\n`);
}

// 통계
const stats = {
  startTime: null,
  firstChunkTime: null,
  endTime: null,
  chunkCount: 0,
  totalChars: 0
};

/**
 * 단일 메시지 테스트
 */
async function testSingleMessage(message, emotion) {
  return new Promise((resolve, reject) => {
    const wsUrl = `${WS_URL}/ws/session/${SESSION_ID}`;

    log('🔌', `Connecting to: ${wsUrl}`, colors.blue);
    log('📝', `Session ID: ${SESSION_ID}`, colors.gray);

    const ws = new WebSocket(wsUrl);
    let fullResponse = '';

    ws.on('open', () => {
      log('✅', 'WebSocket connected', colors.green);

      // AI 요청 전송
      const request = {
        type: 'request_ai_response',
        data: {
          message: message,
          emotion: emotion
        }
      };

      log('📤', `Sending request:`, colors.cyan);
      console.log(JSON.stringify(request, null, 2));

      stats.startTime = Date.now();
      ws.send(JSON.stringify(request));
    });

    ws.on('message', (data) => {
      const parsedMessage = JSON.parse(data.toString());

      switch (parsedMessage.type) {
        case 'ai_stream_begin':
          log('🟢', 'Stream started', colors.green);
          fullResponse = '';
          stats.chunkCount = 0;
          stats.totalChars = 0;
          break;

        case 'ai_stream_chunk':
          const chunk = parsedMessage.data.chunk;

          if (stats.chunkCount === 0 && stats.firstChunkTime === null) {
            stats.firstChunkTime = Date.now();
            const firstChunkDelay = stats.firstChunkTime - stats.startTime;
            log('⚡', `First chunk received in ${firstChunkDelay}ms`, colors.yellow);
          }

          fullResponse += chunk;
          stats.chunkCount++;
          stats.totalChars += chunk.length;

          // 실시간 출력
          process.stdout.write(chunk);
          break;

        case 'ai_stream_complete':
          stats.endTime = Date.now();
          console.log('\n');
          log('✅', 'Stream complete', colors.green);

          // 통계 출력
          logSection('📊 Statistics');
          console.log(`  First Chunk:      ${stats.firstChunkTime - stats.startTime}ms`);
          console.log(`  Total Duration:   ${stats.endTime - stats.startTime}ms`);
          console.log(`  Chunk Count:      ${stats.chunkCount}`);
          console.log(`  Total Characters: ${stats.totalChars}`);
          console.log(`  Avg Chunk Size:   ${(stats.totalChars / stats.chunkCount).toFixed(1)} chars`);
          console.log(`  Avg Chunk Time:   ${((stats.endTime - stats.firstChunkTime) / stats.chunkCount).toFixed(1)}ms`);

          logSection('💬 Full Response');
          console.log(fullResponse);

          ws.close();
          resolve({ success: true, response: fullResponse, stats });
          break;

        case 'ai_stream_error':
          const error = parsedMessage.data.error;
          log('❌', `Error: ${error}`, colors.red);
          ws.close();
          reject(new Error(error));
          break;

        default:
          log('❓', `Unknown message type: ${parsedMessage.type}`, colors.yellow);
      }
    });

    ws.on('error', (error) => {
      log('❌', `WebSocket error: ${error.message}`, colors.red);
      reject(error);
    });

    ws.on('close', () => {
      log('🔌', 'WebSocket closed', colors.gray);
    });
  });
}

/**
 * 여러 메시지 테스트
 */
async function testMultipleMessages() {
  const testCases = [
    { message: '안녕하세요, 처음 뵙겠습니다', emotion: 'neutral' },
    { message: '요즘 회사에서 스트레스를 많이 받아요', emotion: 'anxious' },
    { message: '좋은 소식이 있어요!', emotion: 'happy' },
    { message: '모든 게 잘 풀리지 않는 것 같아요', emotion: 'sad' }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const { message, emotion } = testCases[i];

    logSection(`Test ${i + 1}/${testCases.length}: ${emotion}`);
    log('📝', `Message: "${message}"`, colors.cyan);

    try {
      await testSingleMessage(message, emotion);

      if (i < testCases.length - 1) {
        log('⏳', 'Waiting 2s before next test...', colors.gray);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      log('❌', `Test failed: ${error.message}`, colors.red);
    }
  }
}

/**
 * 에러 시나리오 테스트
 */
async function testErrorScenarios() {
  const errorTests = [
    {
      name: 'Empty message',
      message: '',
      emotion: null,
      expectedError: '메시지가 비어있습니다'
    },
    {
      name: 'Message too long',
      message: 'a'.repeat(2001),
      emotion: null,
      expectedError: '메시지가 너무 깁니다'
    }
  ];

  for (const test of errorTests) {
    logSection(`Error Test: ${test.name}`);

    try {
      await testSingleMessage(test.message, test.emotion);
      log('❌', `Expected error but succeeded`, colors.red);
    } catch (error) {
      if (error.message.includes(test.expectedError)) {
        log('✅', `Correctly handled: ${error.message}`, colors.green);
      } else {
        log('❌', `Unexpected error: ${error.message}`, colors.red);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * 성능 벤치마크
 */
async function benchmark() {
  logSection('🏃 Performance Benchmark');

  const iterations = 3;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    log('📊', `Iteration ${i + 1}/${iterations}`, colors.cyan);

    try {
      const result = await testSingleMessage(
        `테스트 메시지 ${i + 1}`,
        'neutral'
      );

      results.push({
        firstChunk: result.stats.firstChunkTime - result.stats.startTime,
        totalDuration: result.stats.endTime - result.stats.startTime,
        chunkCount: result.stats.chunkCount,
        totalChars: result.stats.totalChars
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      log('❌', `Benchmark iteration ${i + 1} failed: ${error.message}`, colors.red);
    }
  }

  // 평균 계산
  if (results.length > 0) {
    logSection('📈 Benchmark Results');

    const avgFirstChunk = results.reduce((sum, r) => sum + r.firstChunk, 0) / results.length;
    const avgDuration = results.reduce((sum, r) => sum + r.totalDuration, 0) / results.length;
    const avgChunks = results.reduce((sum, r) => sum + r.chunkCount, 0) / results.length;
    const avgChars = results.reduce((sum, r) => sum + r.totalChars, 0) / results.length;

    console.log(`  Avg First Chunk:    ${avgFirstChunk.toFixed(0)}ms`);
    console.log(`  Avg Total Duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Avg Chunk Count:    ${avgChunks.toFixed(1)}`);
    console.log(`  Avg Total Chars:    ${avgChars.toFixed(0)}`);

    // 성능 평가
    console.log('\n  Performance Assessment:');
    console.log(`  First Chunk: ${avgFirstChunk < 2000 ? '✅ PASS' : '❌ FAIL'} (< 2000ms)`);
    console.log(`  Total Time:  ${avgDuration < 10000 ? '✅ PASS' : '❌ FAIL'} (< 10000ms)`);
  }
}

/**
 * 메인 함수
 */
async function main() {
  logSection('🤖 BeMore AI Voice Chat - WebSocket Test');

  console.log(`  WS URL:      ${WS_URL}`);
  console.log(`  Session ID:  ${SESSION_ID}`);
  console.log(`  Message:     "${TEST_MESSAGE}"`);
  console.log(`  Emotion:     ${TEST_EMOTION}`);
  console.log(`  Mode:        ${MULTIPLE_MESSAGES ? 'Multiple Messages' : 'Single Message'}`);
  console.log();

  try {
    if (MULTIPLE_MESSAGES) {
      await testMultipleMessages();
    } else {
      await testSingleMessage(TEST_MESSAGE, TEST_EMOTION);
    }

    logSection('✅ Test Completed Successfully');

  } catch (error) {
    logSection('❌ Test Failed');
    console.error(error);
    process.exit(1);
  }
}

// 추가 테스트 모드
if (args.includes('--errors')) {
  testErrorScenarios().then(() => {
    logSection('✅ Error Tests Completed');
  }).catch((error) => {
    log('❌', `Error tests failed: ${error.message}`, colors.red);
    process.exit(1);
  });
} else if (args.includes('--benchmark')) {
  benchmark().then(() => {
    logSection('✅ Benchmark Completed');
  }).catch((error) => {
    log('❌', `Benchmark failed: ${error.message}`, colors.red);
    process.exit(1);
  });
} else {
  main();
}
