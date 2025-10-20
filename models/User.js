const Sequelize = require('sequelize');

class User extends Sequelize.Model {
  static initiate(sequelize) {
    User.init({
      username: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
    },
      {
        sequelize,
        timestamps: true,
        underscored: false,
        modelName: 'User',
        tableName: 'users',
        paranoid: false,
        charset: 'utf8',
        collate: 'utf8_general_ci',
      });
    };
  
  static associate(db) {
    db.User.hasMany(db.Counseling, { foreignKey: 'userId', sourceKey: 'id' });
  }
};

module.exports = User;