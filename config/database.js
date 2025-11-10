// config/database.js
const { Sequelize } = require('sequelize');

let sequelize;

try {
  // DATABASE_URL이 있으면 config.json 없이도 작동
  if (process.env.DATABASE_URL) {
    // Sequelize의 URL 파싱 문제를 피하기 위해 직접 파싱
    const dbUrl = new URL(process.env.DATABASE_URL);

    // Port를 명시적으로 숫자로 변환 (빈 문자열 방지)
    const port = dbUrl.port ? parseInt(dbUrl.port, 10) : 5432;

    const dbConfig = {
      database: dbUrl.pathname.slice(1),
      username: dbUrl.username,
      password: decodeURIComponent(dbUrl.password),
      host: dbUrl.hostname,
      port: port,
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    };

    // 디버깅: DATABASE_URL 마스킹 출력
    const maskedUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@');
    console.log('📊 DATABASE_URL:', maskedUrl);
    console.log('🔌 Connection Config:', {
      database: dbConfig.database,
      username: dbConfig.username,
      host: dbConfig.host,
      port: dbConfig.port,
      ssl: 'enabled'
    });

    sequelize = new Sequelize(dbConfig);
  } else {
    // Fallback to config.json (개발 환경)
    const config = require('./config.json')[process.env.NODE_ENV || 'development'];
    sequelize = new Sequelize(config.database, config.username, config.password, config);
  }
} catch (error) {
  console.error('❌ Database configuration error:', error.message);
  throw error;
}

module.exports = sequelize;
