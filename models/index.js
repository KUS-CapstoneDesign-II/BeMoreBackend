// models/index.js
const { Sequelize } = require('sequelize');
const User = require('./User');
const Counseling = require('./Counseling');
const Session = require('./Session');
const Report = require('./Report');
const UserPreferences = require('./UserPreferences');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config.json')[env];
const db={};
const sequelize = new Sequelize(config.database, config.username, config.password, config);

db.sequelize = sequelize;

db.User = User;
db.Counseling = Counseling;
db.Session = Session;
db.Report = Report;
db.UserPreferences = UserPreferences;

User.initiate(sequelize);
Counseling.initiate(sequelize);
Session.initiate(sequelize);
Report.initiate(sequelize);
UserPreferences.initiate(sequelize);

User.associate(db);
Counseling.associate(db);

module.exports = db;

