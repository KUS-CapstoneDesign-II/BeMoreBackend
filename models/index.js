// models/index.js
const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const User = require('./User');
const Counseling = require('./Counseling');
const Session = require('./Session');
const Report = require('./Report');
const UserPreferences = require('./UserPreferences');
const Feedback = require('./Feedback');

const env = process.env.NODE_ENV || 'development';
const db = {};

let sequelize;
let dbEnabled = true;

try {
  // Allow disabling DB via env or when config file is missing in container builds
  const cfgPath = path.join(__dirname, '..', 'config', 'config.json');
  if (process.env.DB_DISABLED === 'true' || !fs.existsSync(cfgPath)) {
    dbEnabled = false;
  }

  if (dbEnabled) {
    const config = require('../config/config.json')[env];
    if (process.env.DATABASE_URL) {
      // DATABASE_URL은 PostgreSQL (Supabase) 형식으로 강제 설정
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        ...config,
        dialect: 'postgres',  // PostgreSQL 지정
        protocol: 'postgres'
      });
    } else {
      sequelize = new Sequelize(config.database, config.username, config.password, config);
    }
  } else {
    // No-op sequelize shim so app.js can safely call sequelize.sync()
    sequelize = { sync: async () => Promise.resolve() };
  }
} catch (e) {
  // Fallback to no-op when configuration is unavailable
  dbEnabled = false;
  sequelize = { sync: async () => Promise.resolve() };
}

db.sequelize = sequelize;
db.dbEnabled = dbEnabled;

if (dbEnabled && sequelize instanceof Sequelize) {
  // Only assign and initialize models when database is properly enabled
  db.User = User;
  db.Counseling = Counseling;
  db.Session = Session;
  db.Report = Report;
  db.UserPreferences = UserPreferences;
  db.Feedback = Feedback;

  User.initiate(sequelize);
  Counseling.initiate(sequelize);
  Session.initiate(sequelize);
  Report.initiate(sequelize);
  UserPreferences.initiate(sequelize);
  Feedback.initiate(sequelize);

  User.associate(db);
  Counseling.associate(db);
} else {
  // Create stub properties when database is disabled
  db.User = null;
  db.Counseling = null;
  db.Session = null;
  db.Report = null;
  db.UserPreferences = null;
  db.Feedback = null;
}

module.exports = db;

