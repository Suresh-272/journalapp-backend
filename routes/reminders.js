const express = require('express');
const {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  deleteReminder
} = require('../controllers/reminders');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getReminders)
  .post(protect, createReminder);

router.route('/:id')
  .get(protect, getReminder)
  .put(protect, updateReminder)
  .delete(protect, deleteReminder);

module.exports = router;