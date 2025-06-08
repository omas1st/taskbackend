// backend/models/Pin.js

const mongoose = require('mongoose');

const PinSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifyPin: {
    type: String,
    required: false
  },
  servicePin: {
    type: String,
    required: false
  },
  withdrawURLs: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Pin', PinSchema);
