/**
 * ErrorHandler.js
 * 중앙화된 에러 처리 및 로깅 시스템
 *
 * 기능:
 * - 에러 타입별 분류 및 처리
 * - 에러 로깅 및 통계 수집
 * - 자동 복구 메커니즘
 * - 에러 알림 시스템
 */

class ErrorHandler {
  constructor() {
    // 에러 통계
    this.stats = {
      total: 0,
      byType: {},
      byCode: {},
      byModule: {},
      recent: [] // 최근 100개 에러
    };

    // 에러 레벨
    this.levels = {
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR',
      CRITICAL: 'CRITICAL'
    };

    // 에러 타입 정의
    this.types = {
      NETWORK: 'NETWORK',           // 네트워크 오류
      VALIDATION: 'VALIDATION',     // 입력 검증 오류
      AUTH: 'AUTH',                 // 인증/권한 오류
      DATABASE: 'DATABASE',         // 데이터베이스 오류
      AI_SERVICE: 'AI_SERVICE',     // AI 서비스 오류
      WEBSOCKET: 'WEBSOCKET',       // WebSocket 오류
      FILE: 'FILE',                 // 파일 시스템 오류
      UNKNOWN: 'UNKNOWN'            // 알 수 없는 오류
    };

    // 복구 전략
    this.recoveryStrategies = {
      [this.types.NETWORK]: this.retryWithBackoff.bind(this),
      [this.types.WEBSOCKET]: this.reconnectWebSocket.bind(this),
      [this.types.AI_SERVICE]: this.fallbackToCache.bind(this)
    };
  }

  /**
   * 에러 처리 메인 함수
   */
  handle(error, context = {}) {
    const errorInfo = this.classify(error, context);
    this.log(errorInfo);
    this.updateStats(errorInfo);

    // 자동 복구 시도
    if (context.autoRecover && this.recoveryStrategies[errorInfo.type]) {
      return this.recoveryStrategies[errorInfo.type](errorInfo, context);
    }

    return errorInfo;
  }

  /**
   * 에러 분류
   */
  classify(error, context) {
    const timestamp = new Date().toISOString();
    const stack = error.stack || new Error().stack;

    let type = this.types.UNKNOWN;
    let level = this.levels.ERROR;

    // 에러 타입 분류
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      type = this.types.NETWORK;
    } else if (error.name === 'ValidationError') {
      type = this.types.VALIDATION;
      level = this.levels.WARN;
    } else if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      type = this.types.AUTH;
      level = this.levels.WARN;
    } else if (error.message?.includes('database') || error.message?.includes('MongoDB')) {
      type = this.types.DATABASE;
      level = this.levels.CRITICAL;
    } else if (error.message?.includes('Gemini') || error.message?.includes('API')) {
      type = this.types.AI_SERVICE;
    } else if (error.message?.includes('WebSocket') || error.message?.includes('ws')) {
      type = this.types.WEBSOCKET;
    } else if (error.code?.startsWith('E') && error.syscall) {
      type = this.types.FILE;
    }

    return {
      type,
      level,
      message: error.message,
      code: error.code,
      stack,
      timestamp,
      module: context.module || 'unknown',
      userId: context.userId,
      sessionId: context.sessionId,
      metadata: context.metadata || {}
    };
  }

  /**
   * 에러 로깅
   */
  log(errorInfo) {
    const { level, type, message, module, timestamp } = errorInfo;

    // 색상 코드
    const colors = {
      INFO: '\x1b[36m',      // Cyan
      WARN: '\x1b[33m',      // Yellow
      ERROR: '\x1b[31m',     // Red
      CRITICAL: '\x1b[35m'   // Magenta
    };
    const reset = '\x1b[0m';

    const prefix = `${colors[level]}[${level}]${reset}`;
    const timeStr = `\x1b[90m${timestamp}\x1b[0m`;
    const moduleStr = `\x1b[34m[${module}]\x1b[0m`;
    const typeStr = `\x1b[33m(${type})\x1b[0m`;

    console.error(`${prefix} ${timeStr} ${moduleStr} ${typeStr} ${message}`);

    // CRITICAL 에러는 스택 트레이스도 출력
    if (level === this.levels.CRITICAL && errorInfo.stack) {
      console.error('\x1b[90mStack Trace:\x1b[0m');
      console.error(errorInfo.stack);
    }
  }

  /**
   * 에러 통계 업데이트
   */
  updateStats(errorInfo) {
    this.stats.total++;

    // 타입별 통계
    if (!this.stats.byType[errorInfo.type]) {
      this.stats.byType[errorInfo.type] = 0;
    }
    this.stats.byType[errorInfo.type]++;

    // 코드별 통계
    const codeKey = errorInfo.code || 'UNKNOWN';
    if (!this.stats.byCode[codeKey]) {
      this.stats.byCode[codeKey] = 0;
    }
    this.stats.byCode[codeKey]++;

    // 모듈별 통계
    if (!this.stats.byModule[errorInfo.module]) {
      this.stats.byModule[errorInfo.module] = 0;
    }
    this.stats.byModule[errorInfo.module]++;

    // 최근 에러 저장 (최대 100개)
    this.stats.recent.push({
      type: errorInfo.type,
      level: errorInfo.level,
      message: errorInfo.message,
      module: errorInfo.module,
      timestamp: errorInfo.timestamp,
      code: errorInfo.code || null,
      requestId: (errorInfo.metadata && errorInfo.metadata.requestId) || null
    });

    if (this.stats.recent.length > 100) {
      this.stats.recent.shift();
    }
  }

  /**
   * 에러 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      summary: {
        total: this.stats.total,
        byType: Object.entries(this.stats.byType)
          .sort((a, b) => b[1] - a[1])
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {}),
        byCode: Object.entries(this.stats.byCode)
          .sort((a, b) => b[1] - a[1])
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {}),
        topModules: Object.entries(this.stats.byModule)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {})
      }
    };
  }

  /**
   * 통계 초기화
   */
  resetStats() {
    this.stats = {
      total: 0,
      byType: {},
      byModule: {},
      recent: []
    };
  }

  // ==================== 복구 전략 ====================

  /**
   * 지수 백오프를 사용한 재시도
   */
  async retryWithBackoff(errorInfo, context = {}, maxRetries = 3) {
    const { retryCount = 0 } = context || {};

    if (retryCount >= maxRetries) {
      console.error(`❌ [RETRY FAILED] ${errorInfo.module}: 최대 재시도 횟수 초과`);
      return { success: false, error: errorInfo };
    }

    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    console.log(`🔄 [RETRY] ${errorInfo.module}: ${retryCount + 1}/${maxRetries} (${delay}ms 후)`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      if (context.retryFn) {
        const result = await context.retryFn();
        console.log(`✅ [RETRY SUCCESS] ${errorInfo.module}: 재시도 성공`);
        return { success: true, result };
      }
    } catch (retryError) {
      const nextContext = Object.assign({}, context || {}, { retryCount: retryCount + 1 });
      return this.retryWithBackoff(errorInfo, nextContext, maxRetries);
    }

    return { success: false, error: errorInfo };
  }

  /**
   * WebSocket 재연결
   */
  async reconnectWebSocket(errorInfo, context) {
    console.log(`🔌 [WEBSOCKET RECONNECT] ${errorInfo.module}: 재연결 시도`);

    if (context.reconnectFn) {
      try {
        await context.reconnectFn();
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    }

    return { success: false, error: errorInfo };
  }

  /**
   * 캐시 폴백
   */
  async fallbackToCache(errorInfo, context) {
    console.log(`💾 [CACHE FALLBACK] ${errorInfo.module}: 캐시 데이터 사용`);

    if (context.cacheFn) {
      try {
        const cachedData = await context.cacheFn();
        return { success: true, data: cachedData, fromCache: true };
      } catch (error) {
        return { success: false, error };
      }
    }

    return { success: false, error: errorInfo };
  }

  // ==================== 유틸리티 함수 ====================

  /**
   * Express 미들웨어
   */
  expressMiddleware() {
    return (err, req, res, next) => {
      const errorInfo = this.handle(err, {
        module: 'express',
        metadata: {
          method: req.method,
          path: req.path,
          ip: req.ip,
          requestId: req.requestId
        }
      });

      const httpStatus = (err && typeof err.status === 'number') ? err.status : (errorInfo.level === this.levels.CRITICAL ? 500 : 400);
      const errCode = (err && err.code) || errorInfo.type;
      res.status(httpStatus).json({
        success: false,
        error: {
          type: errorInfo.type,
          message: errorInfo.message,
          timestamp: errorInfo.timestamp,
          requestId: req.requestId,
          code: errCode
        }
      });
    };
  }

  /**
   * 에러 래핑 함수 (async/await용)
   */
  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        throw error;
      }
    };
  }
}

// 싱글톤 인스턴스 생성
const errorHandler = new ErrorHandler();

module.exports = errorHandler;
