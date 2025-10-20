const Sequelize = require('sequelize');

class Counseling extends Sequelize.Model {
  static initiate(sequelize) {
    Counseling.init({
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      responses: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      }
    }, {
      sequelize,
      timestamps: true,
      underscored: false,
      modelName: 'Counseling',
      tableName: 'counselings',
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
   
  };

  static associate(db) {
    db.Counseling.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id' });
  }
}

module.exports = Counseling;

