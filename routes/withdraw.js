// backend/routes/withdraw.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const withdrawController = require('../controllers/withdrawController');

// User requests a withdrawal
// POST /api/withdraw
router.post('/', auth, withdrawController.requestWithdraw);

// Get withdraw details for verification step
// GET /api/withdraw/verify
router.get('/verify', auth, withdrawController.getVerify);

// Verify tax payment PIN
// POST /api/withdraw/verify
router.post('/verify', auth, withdrawController.postVerify);

// Get service-charge details
// GET /api/withdraw/service
router.get('/service', auth, withdrawController.getService);

// Verify service PIN and complete withdrawal
// POST /api/withdraw/service
router.post('/service', auth, withdrawController.postService);

// Confirm URL redirection
// GET /api/withdraw/confirm
router.get('/confirm', auth, withdrawController.confirmWithdrawURL);

module.exports = router;
