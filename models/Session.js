const Sequelize = require('sequelize');

class Session extends Sequelize.Model {
  static initiate(sequelize) {
    Session.init({
      sessionId: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      userId: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      counselorId: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'ended'),
        allowNull: false,
        defaultValue: 'active',
      },
      startedAt: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      endedAt: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      counters: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      emotionsData: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: '분석된 감정 데이터 배열 [{timestamp, emotion, frameCount, ...}]',
      },
    }, {
      sequelize,
      timestamps: true,
      underscored: false,
      modelName: 'Session',
      tableName: 'sessions',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(db) {
    // no-op for now
  }
}

module.exports = Session;


