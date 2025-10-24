const Sequelize = require('sequelize');

class Feedback extends Sequelize.Model {
  static initiate(sequelize) {
    Feedback.init({
      feedbackId: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        primaryKey: true,
      },
      sessionId: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      submittedAt: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: () => Date.now(),
      },
    }, {
      sequelize,
      timestamps: true,
      underscored: false,
      modelName: 'Feedback',
      tableName: 'feedbacks',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }

  static associate(models) {
    // Foreign key 관계 설정 (필요시)
  }
}

module.exports = Feedback;
