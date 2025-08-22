const mongoose = require('mongoose');

const JournalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Please add content'],
  },
  // Encrypted content for protected entries
  encryptedContent: {
    type: String,
    default: null
  },
  encryptionIV: {
    type: String,
    default: null
  },
  category: {
    type: String,
    enum: ['personal', 'professional'],
    required: [true, 'Please specify category as personal or professional']
  },
  mood: {
    type: String,
    enum: ['happy', 'sad', 'angry', 'anxious', 'neutral', 'excited', 'calm', 'other'],
    default: 'neutral'
  },
  tags: [{
    type: String,
    trim: true
  }],
  location: {
    type: String,
    trim: true
  },
  media: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Privacy and security fields
  isProtected: {
    type: Boolean,
    default: false
  },
  passwordHash: {
    type: String,
    default: null
  },
  salt: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
JournalSchema.index({ user: 1, createdAt: -1 });
JournalSchema.index({ user: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Journal', JournalSchema);