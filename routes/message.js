// backend/routes/message.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  listUserMessages,
  sendMessage
} = require('../controllers/messageController');

// All message endpoints require authentication
router.use(auth);

// Fetch notifications/messages for current user
router.get('/', listUserMessages);

// Send a message to admin
router.post('/', sendMessage);

module.exports = router;
