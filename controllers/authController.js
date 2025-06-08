const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Message = require('../models/Message');
const mailer = require('../utils/mailer');

exports.register = async (req, res) => {
  const { email, password, profileType, firstName, lastName, phone, country, gender } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: 'Email already registered' });

    const user = new User({ email, password, profileType, firstName, lastName, phone, country, gender });
    await user.save();

    // Notify admin by email
    const details = `
      New user registration:
      Name: ${firstName} ${lastName}
      Email: ${email}
      Profile: ${profileType}
      Phone: ${phone}
      Country: ${country}
      Gender: ${gender}
    `;
    mailer.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'New User Registered',
      text: details
    });

    // In-app message to admin
    const admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (admin) {
      await Message.create({
        fromUser: user._id,
        toUser: admin._id,
        text: `register:${email}:${firstName} ${lastName}`
      });
    }

    res.status(201).json({ msg: 'Registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password))
      return res.status(400).json({ msg: 'Invalid credentials' });

    user.lastLogin = Date.now();
    await user.save();

    const payload = { id: user._id, role: user.profileType };
    const token = jwt.sign(payload, process.env.secret_key, { expiresIn: '7d' });

    // Notify admin by email
    const details = `
      User login:
      Name: ${user.firstName} ${user.lastName}
      Email: ${user.email}
      Wallet Balance: $${user.walletBalance.toFixed(2)}
    `;
    mailer.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'User Logged In',
      text: details
    });

    // In-app message to admin
    const admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (admin) {
      await Message.create({
        fromUser: user._id,
        toUser: admin._id,
        text: `login:${email}:${user.walletBalance}`
      });
    }

    res.json({ token, role: user.profileType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
