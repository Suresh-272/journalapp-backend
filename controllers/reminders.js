const Reminder = require('../models/Reminder');

// @desc    Create new reminder
// @route   POST /api/reminders
// @access  Private
exports.createReminder = async (req, res) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;
    
    const reminder = await Reminder.create(req.body);

    res.status(201).json({
      success: true,
      data: reminder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get all reminders for a user
// @route   GET /api/reminders
// @access  Private
exports.getReminders = async (req, res) => {
  try {
    // Query with filters
    let query = { user: req.user.id };
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query.reminderDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    
    // Filter by recurring status if provided
    if (req.query.isRecurring !== undefined) {
      query.isRecurring = req.query.isRecurring === 'true';
    }

    const reminders = await Reminder.find(query).sort({ reminderDate: 1 });

    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single reminder
// @route   GET /api/reminders/:id
// @access  Private
exports.getReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    // Make sure user owns reminder
    if (reminder.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this reminder'
      });
    }

    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update reminder
// @route   PUT /api/reminders/:id
// @access  Private
exports.updateReminder = async (req, res) => {
  try {
    let reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    // Make sure user owns reminder
    if (reminder.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this reminder'
      });
    }

    reminder = await Reminder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    // Make sure user owns reminder
    if (reminder.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this reminder'
      });
    }

    await reminder.deleteOne();

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