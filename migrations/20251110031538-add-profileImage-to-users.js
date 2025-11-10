'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add profileImage column
    await queryInterface.addColumn('users', 'profileImage', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove profileImage column
    await queryInterface.removeColumn('users', 'profileImage');
  }
};
