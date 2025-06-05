const express = require('express');
const {
  uploadMedia,
  getMedia,
  deleteMedia,
  upload
} = require('../controllers/media');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, upload.single('file'), uploadMedia)
  .get(protect, getMedia);

router.route('/:id')
  .delete(protect, deleteMedia);

module.exports = router;