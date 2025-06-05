const Journal = require('../models/Journal');

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