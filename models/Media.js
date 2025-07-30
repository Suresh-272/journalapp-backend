const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'audio', 'video'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  public_id: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    trim: true,
    maxlength: [200, 'Caption cannot be more than 200 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  journal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Journal'
  },
  fileSize: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
MediaSchema.index({ user: 1, createdAt: -1 });
MediaSchema.index({ journal: 1, type: 1 });
MediaSchema.index({ public_id: 1 });

module.exports = mongoose.model('Media', MediaSchema);