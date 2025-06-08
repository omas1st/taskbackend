const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  profileType: {
    type: String,
    enum: ['worker', 'customer'],
    required: true
  },
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone:   { type: String, required: true },
  country: { type: String, required: true },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  password:    { type: String, required: true },
  walletBalance: { type: Number, default: 0 },
  lastLogin:   { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
