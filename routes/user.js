const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getMe } = require('../controllers/userController');

// @route   GET /api/user/me
// @desc    Get current user profile
router.get('/me', auth, getMe);

module.exports = router;
