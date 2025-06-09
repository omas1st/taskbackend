// backend/controllers/messageController.js

const Message = require('../models/Message');
const User    = require('../models/User');
const mailer  = require('../utils/mailer');

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

    // Lookup sender details
    const sender = await User.findById(req.user.id).select(
      'email firstName lastName'
    );
    if (!sender) {
      return res.status(404).json({ msg: 'Sender not found' });
    }

    // Lookup admin user record (in-app)
    const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });

    // Create in-app message for admin if record exists
    let sentMsg;
    if (adminUser) {
      sentMsg = await Message.create({
        fromUser: sender._id,
        toUser:   adminUser._id,
        text
      });
    } else {
      console.warn('Admin user record not found; skipping in-app message');
      sentMsg = { fromUser: sender._id, toUser: null, text };
    }

    // Send email notification to admin
    const senderName  = `${sender.firstName} ${sender.lastName}`;
    const senderEmail = sender.email;
    const emailBody = `
You have received a new message from ${senderName} (${senderEmail}):

"${text}"
`;
    mailer.sendEmail({
      to:      process.env.ADMIN_EMAIL,
      subject: `New message from ${senderName}`,
      text:    emailBody.trim()
    });

    return res.json(sentMsg);
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ msg: 'Server error sending message' });
  }
};
