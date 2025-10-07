const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

// Import models to ensure they are defined
require('./models/User');
require('./models/Task');
require('./models/Otp');

const app = express();
const PORT = process.env.PORT || 3001;
// Bind to all interfaces by default so devices on LAN can reach the server
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
// In dev, allow all origins to simplify testing from physical devices
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Add request logging with body debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);

  // Debug for POST requests
  if (req.method === 'POST' && req.path === '/api/tasks') {
    console.log('Raw headers:', req.headers);
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Content-Length:', req.get('Content-Length'));
  }

  next();
});

// Debug middleware to log raw body before JSON parsing
app.use('/api/tasks', (req, res, next) => {
  if (req.method === 'POST') {
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk.toString();
    });
    req.on('end', () => {
      console.log('Raw request body:', rawBody);
      console.log('Raw body length:', rawBody.length);
    });
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Connect to PostgreSQL and sync models
sequelize.authenticate()
  .then(() => {
    console.log('Connected to PostgreSQL');
    return sequelize.sync({ force: false });
  })
  .then(() => {
    console.log('Database synchronized');
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server is running on: http://${HOST}:${PORT}`);
      console.log(`📱 API Base URL: http://${HOST}:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error('Database connection error:', error);
  });