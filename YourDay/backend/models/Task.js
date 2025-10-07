const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfterStartTime(value) {
        if (value <= this.startTime) {
          throw new Error('End time must be after start time');
        }
      }
    }
  },
  category: {
    type: DataTypes.ENUM('meeting', 'personal', 'other', 'weekend', 'cooking'),
    allowNull: false,
    defaultValue: 'other'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reminder: {
    type: DataTypes.DATE,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true,
  underscored: false,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['startTime']
    },
    {
      fields: ['category']
    }
  ]
});

// Associations
Task.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE'
});

User.hasMany(Task, {
  foreignKey: 'userId',
  as: 'tasks'
});

module.exports = Task;