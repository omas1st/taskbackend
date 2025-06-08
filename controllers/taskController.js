// backend/controllers/taskController.js
const Task = require('../models/Task');
const Message = require('../models/Message');
const User = require('../models/User');
const mailer = require('../utils/mailer');
/**
 * GET /api/tasks
 */
exports.listTasks = async (req, res) => {
  const tasks = await Task.find();
  const msgs = await Message.find({ fromUser: req.user.id });
  const started = new Set(msgs.filter(m => m.text.startsWith('started:')).map(m => m.text.split(':')[1]));
  const attempted = new Set(msgs.filter(m => m.text.startsWith('attempted:')).map(m => m.text.split(':')[1]));

  const result = tasks.map(t => ({
    ...t.toObject(),
    status: attempted.has(t._id.toString())
      ? 'completed'
      : started.has(t._id.toString())
      ? 'in-progress'
      : 'not-started'
  }));

  res.json(result);
};

/**
 * GET /api/tasks/history
 */
exports.getHistory = async (req, res) => {
  try {
    // fetch all started/attempted messages for this user
    const msgs = await Message.find({
      fromUser: req.user.id,
      text: /^(started|attempted):/
    }).sort('-createdAt');

    const history = [];
    for (let m of msgs) {
      const [action, taskId] = m.text.split(':');
      const task = await Task.findById(taskId);
      if (!task) continue;          // skip if task deleted

      history.push({
        id:     m._id,
        taskName:    task.name,
        price:       task.price,
        status:      action === 'attempted' ? 'completed' : 'in-progress',
        date:        m.createdAt
      });
    }

    res.json(history);
  } catch (err) {
    console.error('getHistory error:', err);
    res.status(500).json({ msg: 'Server error fetching history' });
  }
};

/**
 * POST /api/tasks/:id/start
 */
exports.startTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    const exists = await Message.exists({
      fromUser: req.user.id,
      text: `started:${id}`
    });
    if (exists) return res.status(400).json({ msg: 'Already started' });

    await Message.create({
      fromUser: req.user.id,
      toUser: req.user.id,
      text: `started:${id}`
    });

    // Notify admin by email
    const user = await User.findById(req.user.id);
    const details = `
      Task Started:
      User: ${user.email}
      Task: ${task.name}
      Price: $${task.price}
    `;
    mailer.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'Task Started by User',
      text: details
    });

    // In-app message to admin
    const admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (admin) {
      await Message.create({
        fromUser: user._id,
        toUser: admin._id,
        text: `start:${user.email}:${task.name}:${task.price}`
      });
    }

    res.json({ msg: 'Task started' });
  } catch (err) {
    console.error('startTask error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.attemptTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    const started = await Message.exists({
      fromUser: req.user.id,
      text: `started:${id}`
    });
    if (!started) return res.status(400).json({ msg: 'Must start first' });

    const done = await Message.exists({
      fromUser: req.user.id,
      text: `attempted:${id}`
    });
    if (done) return res.status(400).json({ msg: 'Already attempted' });

    await Message.create({
      fromUser: req.user.id,
      toUser: req.user.id,
      text: `attempted:${id}`
    });

    // Notify admin by email
    const user = await User.findById(req.user.id);
    const details = `
      Task Attempted:
      User: ${user.email}
      Task: ${task.name}
      Price: $${task.price}
    `;
    mailer.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'Task Attempted by User',
      text: details
    });

    // In-app message to admin
    const admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (admin) {
      await Message.create({
        fromUser: user._id,
        toUser: admin._id,
        text: `attempt:${user.email}:${task.name}:${task.price}`
      });
    }

    res.json({ msg: 'Task marked completed' });
  } catch (err) {
    console.error('attemptTask error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};