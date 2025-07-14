const path = require('path');
const Media = require('../models/Media');
const Journal = require('../models/Journal');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const fs = require('fs');

// Set up multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images and audio
  if (file.mimetype.startsWith('image') || file.mimetype.startsWith('audio')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and audio files are allowed!'), false);
  }
};

// Initialize upload
exports.upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// @desc    Upload media
// @route   POST /api/media
// @access  Private
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a file'
      });
    }

    // Determine media type
    const type = req.file.mimetype.startsWith('image') ? 'image' : 'audio';
    
    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: type === 'image' ? 'image' : 'video', // Cloudinary uses 'video' for audio files
      folder: `memory-journal/${req.user.id}/${type}s`
    });

    // Create media in database
    const media = await Media.create({
      type,
      url: result.secure_url,
      public_id: result.public_id,
      caption: req.body.caption || '',
      user: req.user.id,
      journal: req.body.journalId || null
    });

    // If journalId is provided, add media to journal
    if (req.body.journalId) {
      await Journal.findByIdAndUpdate(req.body.journalId, {
        $push: { media: media._id }
      });
    }

    // Remove file from server after upload
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      success: true,
      data: media
    });
  } catch (err) {
    console.error(err);
    // Remove file from server if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get all media for a user
// @route   GET /api/media
// @access  Private
exports.getMedia = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Media.countDocuments({ user: req.user.id });

    // Query with filters
    let query = { user: req.user.id };
    
    // Filter by type if provided
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    // Filter by journal if provided
    if (req.query.journalId) {
      query.journal = req.query.journalId;
    }

    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: media.length,
      pagination,
      data: media
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete media
// @route   DELETE /api/media/:id
// @access  Private
exports.deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }

    // Make sure user owns media
    if (media.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this media'
      });
    }

    // Delete from cloudinary
    await cloudinary.uploader.destroy(media.public_id, {
      resource_type: media.type === 'image' ? 'image' : 'video'
    });

    // Remove media reference from journal if it exists
    if (media.journal) {
      await Journal.findByIdAndUpdate(media.journal, {
        $pull: { media: media._id }
      });
    }

    // Delete from database
    await media.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Upload multiple media files
// @route   POST /api/media/batch
// @access  Private
exports.uploadMultipleMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please upload at least one file'
      });
    }

    const mediaResults = [];
    const journalId = req.body.journalId || null;

    // Process each file
    for (const file of req.files) {
      // Determine media type
      const type = file.mimetype.startsWith('image') ? 'image' : 'audio';
      
      // Upload to cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: type === 'image' ? 'image' : 'video', // Cloudinary uses 'video' for audio files
        folder: `memory-journal/${req.user.id}/${type}s`
      });

      // Create media in database
      const media = await Media.create({
        type,
        url: result.secure_url,
        public_id: result.public_id,
        caption: req.body.captions && req.body.captions[file.fieldname] || '',
        user: req.user.id,
        journal: journalId
      });

      // If journalId is provided, add media to journal
      if (journalId) {
        await Journal.findByIdAndUpdate(journalId, {
          $push: { media: media._id }
        });
      }

      // Remove file from server after upload
      fs.unlinkSync(file.path);
      
      mediaResults.push(media);
    }

    res.status(201).json({
      success: true,
      count: mediaResults.length,
      data: mediaResults
    });
  } catch (err) {
    console.error(err);
    // Remove files from server if there's an error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};