const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const { startScheduler } = require('./utils/scheduler');
const { ensureUploadsDir } = require('./utils/fileSystem');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Ensure uploads directory exists
ensureUploadsDir();

// Initialize express
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Make uploads folder static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/journals', require('./routes/journals'));
app.use('/api/media', require('./routes/media'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/reminders', require('./routes/reminders'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start the reminder scheduler
  startScheduler();
});