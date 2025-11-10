'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add email column
    await queryInterface.addColumn('users', 'email', {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    });

    // Add password column
    await queryInterface.addColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    // Add refreshToken column
    await queryInterface.addColumn('users', 'refreshToken', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Change username column size from 20 to 50
    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove added columns
    await queryInterface.removeColumn('users', 'email');
    await queryInterface.removeColumn('users', 'password');
    await queryInterface.removeColumn('users', 'refreshToken');

    // Revert username column size back to 20
    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING(20),
      allowNull: false,
      unique: true,
    });
  }
};
