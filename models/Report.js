const Sequelize = require('sequelize');

class Report extends Sequelize.Model {
  static initiate(sequelize) {
    Report.init({
      reportId: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      sessionId: {
        type: Sequelize.STRING(64),
        allowNull: false,
        index: true,
      },
      vadVector: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      vadTimeline: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      cbtSummary: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      statistics: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      analysis: {
        type: Sequelize.JSON,
        allowNull: true,
      }
    }, {
      sequelize,
      timestamps: true,
      underscored: false,
      modelName: 'Report',
      tableName: 'reports',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
      indexes: [{ fields: ['sessionId', 'createdAt'] }]
    });
  }

  static associate(db) {
    // no-op
  }
}

module.exports = Report;


