// backend/models/Task.js

const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, required: true },
  price:       { type: Number, required: true },
  url:         { type: String, required: true },   // <-- external URL
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
