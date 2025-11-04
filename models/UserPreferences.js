const Sequelize = require('sequelize');

class UserPreferences extends Sequelize.Model {
  static initiate(sequelize) {
    UserPreferences.init({
      userId: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      preferences: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
    }, {
      sequelize,
      timestamps: true,
      underscored: false,
      modelName: 'UserPreferences',
      tableName: 'user_preferences',
      paranoid: false,
      charset: 'utf8',
      collate: 'utf8_general_ci',
      indexes: [
        { fields: ['userId'], unique: true },
        { fields: ['createdAt'] },
        { fields: ['id'] }
      ]
    });
  }

  static associate(db) {
    // no-op
  }
}

module.exports = UserPreferences;


