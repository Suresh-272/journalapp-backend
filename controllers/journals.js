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
    
    // Validate category if provided
    if (req.body.category && !['personal', 'professional'].includes(req.body.category)) {
      return res.status(400).json({
        success: false,
        error: 'Category must be either "personal" or "professional"'
      });
    }
    
    // Set default category if not provided
    if (!req.body.category) {
      req.body.category = 'personal';
    }
    
    const journal = await Journal.create(req.body);

    res.status(201).json({
      success: true,
      data: journal
    });
  } catch (err) {
    console.error('Error creating journal:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
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
    
    // Extract and validate journal data from request body
    const { title, content, mood, tags, location, category } = req.body;
    
    // Validate category
    if (!category || !['personal', 'professional'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Category must be either "personal" or "professional"'
      });
    }
    
    // Create journal entry with proper category
    const journal = await Journal.create({
      title: title || 'Untitled Entry',
      content: content || '',
      category: category, // Ensure category is properly set
      mood: mood || 'neutral',
      tags: tags ? JSON.parse(tags) : [],
      location: location || '',
      user: req.user.id
    });
    
    const mediaIds = [];
    
    // Process uploaded files if any
    if (req.files && req.files.length > 0) {
      // Process files in parallel for better performance
      const mediaPromises = req.files.map(async (file) => {
        try {
          // Determine media type
          const type = file.mimetype.startsWith('image') ? 'image' : 'audio';
          
          // Upload to cloudinary with optimization
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: type === 'image' ? 'image' : 'video',
            folder: `memory-journal/${req.user.id}/${type}s`,
            transformation: type === 'image' ? [
              { quality: 'auto:good', fetch_format: 'auto' },
              { width: 1200, height: 1200, crop: 'limit' }
            ] : undefined,
            eager: type === 'image' ? [
              { width: 300, height: 300, crop: 'thumb' },
              { width: 600, height: 600, crop: 'limit' }
            ] : undefined
          });
          
                  // Create media in database with enhanced data
        const media = await Media.create({
          type,
          url: result.secure_url,
          public_id: result.public_id,
          caption: '',
          user: req.user.id,
          journal: journal._id,
          fileSize: result.bytes || 0,
          mimeType: file.mimetype
        });
          
          // Remove file from server after upload
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          
          return media._id;
        } catch (error) {
          // Clean up file if upload fails
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          throw error;
        }
      });
      
      // Wait for all media uploads to complete
      const uploadedMediaIds = await Promise.all(mediaPromises);
      mediaIds.push(...uploadedMediaIds);
    }
    
    // Update journal with media IDs if any were uploaded
    if (mediaIds.length > 0) {
      await Journal.findByIdAndUpdate(journal._id, {
        media: mediaIds
      });
    }
    
    // Get the updated journal with media
    const updatedJournal = await Journal.findById(journal._id)
      .populate('media', 'url type public_id')
      .lean();
    
    res.status(201).json({
      success: true,
      data: updatedJournal
    });
  } catch (err) {
    console.error('Error creating journal with media:', err);
    
    // Clean up any uploaded files if there's an error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};

// @desc    Get mood analytics for a user
// @route   GET /api/journals/mood-analytics
// @access  Private
exports.getMoodAnalytics = async (req, res) => {
  try {
    const { timeFilter = 'week' } = req.query;
    
    // Calculate date range based on filter
    const now = new Date();
    let startDate;
    
    switch (timeFilter) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get journal entries with mood data
    const journals = await Journal.find({
      user: req.user.id,
      createdAt: { $gte: startDate },
      mood: { $exists: true, $ne: 'other' }
    })
    .select('mood createdAt')
    .sort({ createdAt: 1 })
    .lean();

    // Calculate analytics
    const moodCounts = {};
    const moodValues = {
      'sad': 1,
      'anxious': 2,
      'neutral': 3,
      'calm': 4,
      'happy': 5,
      'excited': 5
    };

    let totalMoodValue = 0;
    let entryCount = 0;

    journals.forEach(journal => {
      const mood = journal.mood;
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      
      if (moodValues[mood]) {
        totalMoodValue += moodValues[mood];
        entryCount++;
      }
    });

    // Calculate most frequent mood
    let mostFrequentMood = null;
    let maxCount = 0;
    Object.keys(moodCounts).forEach(mood => {
      if (moodCounts[mood] > maxCount) {
        maxCount = moodCounts[mood];
        mostFrequentMood = mood;
      }
    });

    // Calculate average mood
    const averageMood = entryCount > 0 ? totalMoodValue / entryCount : 0;

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (journals.length > 0) {
      // Check if last entry was today or yesterday
      const lastEntry = new Date(journals[journals.length - 1].createdAt);
      const daysDiff = Math.floor((now.getTime() - lastEntry.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        currentStreak = 1;
        
        // Calculate current streak
        for (let i = journals.length - 2; i >= 0; i--) {
          const currentDate = new Date(journals[i + 1].createdAt);
          const prevDate = new Date(journals[i].createdAt);
          const diff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      for (let i = 1; i < journals.length; i++) {
        const currentDate = new Date(journals[i].createdAt);
        const prevDate = new Date(journals[i - 1].createdAt);
        const diff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Prepare chart data
    const chartData = journals.slice(-10).map(journal => ({
      date: journal.createdAt.toISOString().split('T')[0],
      mood: moodValues[journal.mood] || 3,
      label: journal.mood
    }));

    res.status(200).json({
      success: true,
      data: {
        totalEntries: journals.length,
        averageMood: Number(averageMood.toFixed(1)),
        mostFrequentMood,
        currentStreak,
        longestStreak,
        moodCounts,
        chartData,
        timeFilter
      }
    });
  } catch (err) {
    console.error('Error getting mood analytics:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
};