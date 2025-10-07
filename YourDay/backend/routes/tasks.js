const express = require('express');
const jwt = require('jsonwebtoken');
const Task = require('../models/Task');
const User = require('../models/User');
const { Op } = require('sequelize');
const router = express.Router();

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Get all tasks for authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    const whereClause = {
      userId: req.user.id
    };

    // Filter by date range if provided
    if (startDate && endDate) {
      whereClause.startTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.startTime = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.startTime = {
        [Op.lte]: new Date(endDate)
      };
    }

    // Filter by category if provided
    if (category) {
      whereClause.category = category;
    }

    const tasks = await Task.findAll({
      where: whereClause,
      order: [['startTime', 'ASC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single task by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, startTime, endTime, category, notes, reminder } = req.body;

    // Debug logging
    console.log('Create task - Request body:', JSON.stringify(req.body, null, 2));
    console.log('Create task - Field validation:', {
      title: { value: title, type: typeof title, truthy: !!title, length: title?.length },
      startTime: { value: startTime, type: typeof startTime, truthy: !!startTime },
      endTime: { value: endTime, type: typeof endTime, truthy: !!endTime },
    });

    // Validate required fields
    if (!title || !startTime || !endTime) {
      console.log('Create task - Validation failed:', {
        titleCheck: !title,
        startTimeCheck: !startTime,
        endTimeCheck: !endTime,
      });
      return res.status(400).json({
        message: 'Title, start time, and end time are required'
      });
    }

    // Validate date format and logic
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (end <= start) {
      return res.status(400).json({
        message: 'End time must be after start time'
      });
    }

    // Check for overlapping tasks
    const overlappingTask = await Task.findOne({
      where: {
        userId: req.user.id,
        [Op.or]: [
          {
            startTime: {
              [Op.between]: [start, end]
            }
          },
          {
            endTime: {
              [Op.between]: [start, end]
            }
          },
          {
            [Op.and]: [
              {
                startTime: {
                  [Op.lte]: start
                }
              },
              {
                endTime: {
                  [Op.gte]: end
                }
              }
            ]
          }
        ]
      }
    });

    if (overlappingTask) {
      return res.status(400).json({
        message: 'Task overlaps with existing task',
        conflictingTask: {
          id: overlappingTask.id,
          title: overlappingTask.title,
          startTime: overlappingTask.startTime,
          endTime: overlappingTask.endTime
        }
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim(),
      startTime: start,
      endTime: end,
      category: category || 'other',
      notes: notes?.trim(),
      reminder: reminder ? new Date(reminder) : null,
      userId: req.user.id
    });

    // Fetch the created task with user data
    const createdTask = await Task.findByPk(task.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    res.status(201).json({
      message: 'Task created successfully',
      task: createdTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { title, description, startTime, endTime, category, notes, reminder } = req.body;

    // Validate dates if provided
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      if (end <= start) {
        return res.status(400).json({
          message: 'End time must be after start time'
        });
      }

      // Check for overlapping tasks (excluding current task)
      const overlappingTask = await Task.findOne({
        where: {
          userId: req.user.id,
          id: {
            [Op.ne]: req.params.id
          },
          [Op.or]: [
            {
              startTime: {
                [Op.between]: [start, end]
              }
            },
            {
              endTime: {
                [Op.between]: [start, end]
              }
            },
            {
              [Op.and]: [
                {
                  startTime: {
                    [Op.lte]: start
                  }
                },
                {
                  endTime: {
                    [Op.gte]: end
                  }
                }
              ]
            }
          ]
        }
      });

      if (overlappingTask) {
        return res.status(400).json({
          message: 'Task overlaps with existing task',
          conflictingTask: {
            id: overlappingTask.id,
            title: overlappingTask.title,
            startTime: overlappingTask.startTime,
            endTime: overlappingTask.endTime
          }
        });
      }
    }

    // Update fields
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (category !== undefined) updateData.category = category;
    if (notes !== undefined) updateData.notes = notes?.trim();
    if (reminder !== undefined) updateData.reminder = reminder ? new Date(reminder) : null;

    await task.update(updateData);

    // Fetch updated task with user data
    const updatedTask = await Task.findByPk(task.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.destroy();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;