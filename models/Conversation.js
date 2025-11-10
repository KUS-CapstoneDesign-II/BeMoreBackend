const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Conversation Model
 *
 * Stores AI counseling conversation history for each session.
 * Enables context-aware AI responses by maintaining message history.
 *
 * @model Conversation
 * @table conversations
 */
const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Primary key (UUID)',
  },
  session_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Foreign key to sessions table',
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant'),
    allowNull: false,
    comment: 'Message sender: user or assistant',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Message content (user input or AI response)',
  },
  emotion: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      isIn: [['anxious', 'sad', 'angry', 'happy', 'neutral']],
    },
    comment: 'Detected emotion for the message (optional)',
  },
}, {
  tableName: 'conversations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // No need for updated_at
  indexes: [
    {
      name: 'idx_conversations_session_id',
      fields: ['session_id'],
    },
    {
      name: 'idx_conversations_created_at',
      fields: ['created_at'],
      order: [['created_at', 'DESC']],
    },
  ],
});

/**
 * Get recent conversation history for a session
 * @param {string} sessionId - Session UUID
 * @param {number} limit - Number of messages to retrieve (default: 10)
 * @returns {Promise<Array>} Array of conversation messages
 */
Conversation.getHistory = async function(sessionId, limit = 10) {
  return await this.findAll({
    where: { session_id: sessionId },
    order: [['created_at', 'DESC']],
    limit,
    attributes: ['role', 'content', 'emotion', 'created_at'],
  });
};

/**
 * Save a new message to conversation history
 * @param {string} sessionId - Session UUID
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 * @param {string} emotion - Optional emotion (anxious, sad, angry, happy, neutral)
 * @returns {Promise<Object>} Created conversation record
 */
Conversation.saveMessage = async function(sessionId, role, content, emotion = null) {
  return await this.create({
    session_id: sessionId,
    role,
    content,
    emotion,
  });
};

module.exports = Conversation;
