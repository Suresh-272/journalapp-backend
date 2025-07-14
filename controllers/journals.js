const Journal = require('../models/Journal');
const Media = require('../models/Media');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// @desc    Create new journal entry
// @route   POST /api/journals
// @access  Private
exports.createJournal = async (req, res) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;
    
    const journal = await Journal.create(req.body);

    res.status(201).json({
      success: true,
      data: journal
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get all journals for a user
// @route   GET /api/journals
// @access  Private
exports.getJournals = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Journal.countDocuments({ user: req.user.id });

    // Query with filters
    let query = { user: req.user.id };
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Filter by mood if provided
    if (req.query.mood) {
      query.mood = req.query.mood;
    }
    
    // Filter by tags if provided
    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $in: tags };
    }

    const journals = await Journal.find(query)
      .populate('media', 'url type')
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
      count: journals.length,
      pagination,
      data: journals
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single journal
// @route   GET /api/journals/:id
// @access  Private
exports.getJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id).populate('media', 'url type');

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    // Make sure user owns journal
    if (journal.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this journal'
      });
    }

    res.status(200).json({
      success: true,
      data: journal
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update journal
// @route   PUT /api/journals/:id
// @access  Private
exports.updateJournal = async (req, res) => {
  try {
    let journal = await Journal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    // Make sure user owns journal
    if (journal.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this journal'
      });
    }

    journal = await Journal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: journal
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete journal
// @route   DELETE /api/journals/:id
// @access  Private
exports.deleteJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        error: 'Journal not found'
      });
    }

    // Make sure user owns journal
    if (journal.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this journal'
      });
    }

    await journal.deleteOne();

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

// @desc    Create journal with media
// @route   POST /api/journals/with-media
// @access  Private
exports.createJournalWithMedia = async (req, res) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;
    
    // Extract journal data from request body
    const { title, content, mood, tags, location, category } = req.body;
    
    // Create journal entry
    const journal = await Journal.create({
      title,
      content,
      category: category || 'personal', // Add category field
      mood: mood || 'neutral',
      tags: tags ? JSON.parse(tags) : [],
      location,
      user: req.user.id
    });
    
    const mediaIds = [];
    
    // Process uploaded files if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Determine media type
        const type = file.mimetype.startsWith('image') ? 'image' : 'audio';
        
        // Upload to cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: type === 'image' ? 'image' : 'video',
          folder: `memory-journal/${req.user.id}/${type}s`
        });
        
        // Create media in database
        const media = await Media.create({
          type,
          url: result.secure_url,
          public_id: result.public_id,
          caption: '',
          user: req.user.id,
          journal: journal._id
        });
        
        mediaIds.push(media._id);
        
        // Remove file from server after upload
        fs.unlinkSync(file.path);
      }
      
      // Update journal with media IDs
      if (mediaIds.length > 0) {
        await Journal.findByIdAndUpdate(journal._id, {
          media: mediaIds
        });
      }
    }
    
    // Get the updated journal with media
    const updatedJournal = await Journal.findById(journal._id).populate('media');
    
    res.status(201).json({
      success: true,
      data: updatedJournal
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