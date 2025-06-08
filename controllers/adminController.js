// backend/controllers/adminController.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Task = require('../models/Task');
const Message = require('../models/Message');
const Withdraw = require('../models/Withdraw');
const Pin = require('../models/Pin');
const mailer = require('../utils/mailer');

/**
 * POST /api/admin/login
 * Public endpoint for admin to log in
 */
exports.loginAdmin = (req, res) => {
  const { username, password } = req.body;
  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(400).json({ msg: 'Invalid admin credentials' });
  }
  // include an id so req.user.id exists
  const token = jwt.sign({ id: 'admin', role: 'admin' }, process.env.secret_key, {
    expiresIn: '7d',
  });
  res.json({ token });
};

/**
 * GET /api/admin/users
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ msg: 'Server error listing users' });
  }
};

/**
 * GET /api/admin/users/:id
 */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('getUser error:', err);
    res.status(500).json({ msg: 'Server error fetching user' });
  }
};

/**
 * PUT /api/admin/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { walletBalance } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { walletBalance },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ msg: 'Server error updating user' });
  }
};

/**
 * DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ msg: 'Server error deleting user' });
  }
};

/**
 * GET /api/admin/tasks
 */
exports.listTasks = async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    console.error('listTasks error:', err);
    res.status(500).json({ msg: 'Server error listing tasks' });
  }
};

/**
 * POST /api/admin/tasks
 */
exports.createTask = async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);

    // Email notification to the admin list
    mailer.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'New Task Created',
      text: `A new task "${task.name}" ($${task.price}) was created.`
    });
  } catch (err) {
    console.error('createTask error:', err);
    res.status(500).json({ msg: err.message || 'Server error creating task' });
  }
};

/**
 * GET /api/admin/tasks/:id
 */
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    res.json(task);
  } catch (err) {
    console.error('getTask error:', err);
    res.status(500).json({ msg: 'Server error fetching task' });
  }
};

/**
 * PUT /api/admin/tasks/:id
 */
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    console.error('updateTask error:', err);
    res.status(500).json({ msg: 'Server error updating task' });
  }
};

/**
 * DELETE /api/admin/tasks/:id
 */
exports.deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Task deleted' });
  } catch (err) {
    console.error('deleteTask error:', err);
    res.status(500).json({ msg: 'Server error deleting task' });
  }
};

/**
 * GET /api/admin/tasks/completed
 * List all user task attempts awaiting approval
 */
/**
 * GET /api/admin/tasks/completed
 * List all user task attempts awaiting approval
 */
exports.listCompleted = async (req, res) => {
  try {
    // fetch only attempted messages
    const attempts = await Message.find({ text: /^attempted:/ });

    const formatted = [];
    for (let msg of attempts) {
      const parts = msg.text.split(':');
      if (parts.length < 2) continue;              // skip malformed
      const taskId = parts[1];
      const task = await Task.findById(taskId);
      if (!task) continue;                         // skip missing task
      const user = await User.findById(msg.fromUser);
      if (!user) continue;                         // skip missing user

      formatted.push({
        id:          msg._id,
        userEmail:   user.email,
        taskName:    task.name,
        description: task.description,
        price:       task.price
      });
    }

    res.json(formatted);
  } catch (err) {
    console.error('listCompleted error:', err);
    res.status(500).json({ msg: 'Server error fetching task attempts' });
  }
};


/**
 * POST /api/admin/tasks/:id/accept
 */
exports.acceptTask = async (req, res) => {
  try {
    const { id } = req.params;                 
    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ msg: 'Attempt not found' });

    const taskId = msg.text.split(':')[1];
    const task   = await Task.findById(taskId);
    const user   = await User.findById(msg.fromUser);

    user.walletBalance += task.price;
    await user.save();

    await Message.findByIdAndDelete(id);

    // Admin notification message (no fromUser)
    await Message.create({
      toUser: user._id,
      text:   `taskAccepted:${task.name}:${task.price}`
    });

    mailer.sendEmail({
      to: user.email,
      subject: 'Your Task was Accepted',
      text: `Your task "${task.name}" was accepted. $${task.price.toFixed(2)} has been added to your wallet.`
    });

    return res.json({
      msg:       'Task accepted',
      attemptId: id,
      newBalance: user.walletBalance
    });
  } catch (err) {
    console.error('acceptTask error:', err);
    return res.status(500).json({ msg: 'Server error accepting task' });
  }
};

/**
 * POST /api/admin/tasks/:id/reject
 */
exports.rejectTask = async (req, res) => {
  try {
    const { id } = req.params;
    const msg    = await Message.findById(id);
    if (!msg) return res.status(404).json({ msg: 'Attempt not found' });

    const taskId = msg.text.split(':')[1];
    const task   = await Task.findById(taskId);
    const user   = await User.findById(msg.fromUser);

    await Message.findByIdAndDelete(id);

    await Message.create({
      toUser: user._id,
      text:   `taskRejected:${task.name}`
    });

    mailer.sendEmail({
      to: user.email,
      subject: 'Your Task was Rejected',
      text: `Your task "${task.name}" was rejected by the admin.`
    });

    return res.json({ msg: 'Task rejected', attemptId: id });
  } catch (err) {
    console.error('rejectTask error:', err);
    return res.status(500).json({ msg: 'Server error rejecting task' });
  }
};

/**
 * GET /api/admin/messages/:email
 */
exports.getMessagesByEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    const msgs = await Message.find({ toUser: user._id }).sort('-createdAt');
    res.json(msgs);
  } catch (err) {
    console.error('getMessagesByEmail error:', err);
    res.status(500).json({ msg: 'Server error fetching messages' });
  }
};

/**
 * POST /api/admin/messages
 */
exports.sendMessage = async (req, res) => {
  try {
    const { email, text } = req.body;
    // Find the target user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Create in-app message
    const msg = await Message.create({
      fromUser: null,         // system/admin messages have no fromUser
      toUser: user._id,
      text
    });

    // Email the user
    mailer.sendEmail({
      to: user.email,
      subject: 'Message from Admin',
      text
    });

    res.json(msg);
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ msg: err.message || 'Server error sending message' });
  }
};

/**
 * GET /api/admin/withdraw/urls/:email
 */
exports.getWithdrawURLs = async (req, res) => {
  const user = await User.findOne({ email: req.params.email });
  const record = await Pin.findOne({ user: user._id });
  res.json({ urls: record?.withdrawURLs || Array(5).fill('') });
};

exports.setWithdrawURLs = async (req, res) => {
  try {
    const { email } = req.params;
    const { urls }  = req.body;  // array of URLs

    // Find the target user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Find or create the Pin record for this user
    let record = await Pin.findOne({ user: user._id });
    if (!record) record = new Pin({ user: user._id });

    record.withdrawURLs = urls;
    await record.save();

    // Email the admin about this change
    mailer.sendEmail({
      to:      process.env.ADMIN_EMAIL,
      subject: 'Withdraw URLs Updated',
      text:    `Withdraw URLs for ${email} have been set:\n\n${urls.join('\n')}`
    });

    return res.json({ msg: 'URLs saved' });
  } catch (err) {
    console.error('setWithdrawURLs error:', err);
    return res.status(500).json({ msg: 'Server error saving URLs' });
  }
};

/**
 * POST /api/admin/withdraw/pins
 */
exports.activatePins = async (req, res) => {
  try {
    const { email, pin4, pin5 } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });
    if (!pin4 && !pin5) return res.status(400).json({ msg: 'Provide pin4 or pin5' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: 'User not found' });

    let record = await Pin.findOne({ user: user._id });
    if (!record) record = new Pin({ user: user._id });

    const updates = [];
    if (pin4) {
      if (!/^\d{4}$/.test(pin4)) return res.status(400).json({ msg: 'Invalid 4-digit PIN' });
      record.verifyPin = pin4;
      updates.push(`verifyPin:${pin4}`);
    }
    if (pin5) {
      if (!/^\d{5}$/.test(pin5)) return res.status(400).json({ msg: 'Invalid 5-digit PIN' });
      record.servicePin = pin5;
      updates.push(`servicePin:${pin5}`);
    }
    await record.save();

    // In-app message includes the actual pins
    await Message.create({
      fromUser: null,
      toUser:   user._id,
      text:     `pinsActivated:${updates.join(',')}`
    });

    // Email the user
    const fullName = `${user.firstName} ${user.lastName}`;
    const bodyLines = [`Hello ${fullName},`, `Your PINs have been updated:`]
      .concat(updates.map(u => `• ${u.replace(':', ' = ')}`))
      .concat(['', 'Please keep them safe.']);
    mailer.sendEmail({
      to:      user.email,
      subject: 'Your Withdrawal PINs Have Been Updated',
      text:    bodyLines.join('\n')
    });

    return res.json({ msg: 'PINs activated', details: updates });
  } catch (err) {
    console.error('activatePins error:', err);
    return res.status(500).json({ msg: 'Server error activating PINs' });
  }
};
