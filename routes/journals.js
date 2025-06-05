const express = require('express');
const {
  getJournals,
  getJournal,
  createJournal,
  updateJournal,
  deleteJournal
} = require('../controllers/journals');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getJournals)
  .post(protect, createJournal);

router.route('/:id')
  .get(protect, getJournal)
  .put(protect, updateJournal)
  .delete(protect, deleteJournal);

module.exports = router;