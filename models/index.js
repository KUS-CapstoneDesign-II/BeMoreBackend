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
      sequelize = new Sequelize(process.env.DATABASE_URL, { ...config });
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

db.User = User;
db.Counseling = Counseling;
db.Session = Session;
db.Report = Report;
db.UserPreferences = UserPreferences;
db.Feedback = Feedback;

if (dbEnabled && sequelize instanceof Sequelize) {
  User.initiate(sequelize);
  Counseling.initiate(sequelize);
  Session.initiate(sequelize);
  Report.initiate(sequelize);
  UserPreferences.initiate(sequelize);
  Feedback.initiate(sequelize);

  User.associate(db);
  Counseling.associate(db);
}

module.exports = db;

