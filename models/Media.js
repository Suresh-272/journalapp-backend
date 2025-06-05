const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'audio'],
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
    type: String
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Media', MediaSchema);