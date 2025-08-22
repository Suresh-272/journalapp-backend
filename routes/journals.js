const express = require('express');
const {
  getJournals,
  getJournal,
  createJournal,
  updateJournal,
  deleteJournal,
  createJournalWithMedia,
  getMoodAnalytics,
  protectJournal,
  unlockJournal,
  unprotectJournal
} = require('../controllers/journals');

const { protect } = require('../middleware/auth');
const { upload } = require('../controllers/media');

const router = express.Router();

router.route('/')
  .get(protect, getJournals)
  .post(protect, createJournal);

router.route('/with-media')
  .post(protect, upload.array('files', 10), createJournalWithMedia);

router.route('/mood-analytics')
  .get(protect, getMoodAnalytics);

router.route('/:id')
  .get(protect, getJournal)
  .put(protect, updateJournal)
  .delete(protect, deleteJournal);

router.route('/:id/protect')
  .post(protect, protectJournal);

router.route('/:id/unlock')
  .post(protect, unlockJournal);

router.route('/:id/unprotect')
  .post(protect, unprotectJournal);

module.exports = router;