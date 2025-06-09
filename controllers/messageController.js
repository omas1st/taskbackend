// backend/controllers/messageController.js

const Message = require('../models/Message');
const User = require('../models/User');
const mailer = require('../utils/mailer');

/**
 * GET /api/messages
 * List all messages/notifications for current user
 */
exports.listUserMessages = async (req, res) => {
  try {
    const msgs = await Message.find({ toUser: req.user.id })
      .sort('-createdAt')
      .populate('fromUser', 'email firstName lastName');
    res.json(msgs);
  } catch (err) {
    console.error('listUserMessages error:', err);
    res.status(500).json({ msg: 'Server error fetching messages' });
  }
};

/**
 * POST /api/messages
 * Send a message from current user to admin
 */
exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ msg: 'Message text is required' });
    }

    // find sender details
    const sender = await User.findById(req.user.id).select('email firstName lastName');
    if (!sender) {
      console.warn('Sender user not found');
    }

    // attempt to find admin user record
    const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });

    // create in-app message if admin exists
    let msg;
    if (adminUser) {
      msg = await Message.create({
        fromUser: sender?._id,
        toUser:   adminUser._id,
        text
      });
    } else {
      console.warn('Admin user not found, skipping in-app message');
      msg = { fromUser: sender?._id, toUser: null, text };
    }

    // email notification to admin including sender details
    const senderName  = sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown User';
    const senderEmail = sender ? sender.email : 'Unknown Email';
    mailer.sendEmail({
      to:      process.env.ADMIN_EMAIL,
      subject: `Message from ${senderEmail}`,
      text:    `You have received a new message from ${senderName} (${senderEmail}):\n\n${text}`
    });

    return res.json(msg);
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ msg: 'Server error sending message' });
  }
};
