require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const taskRoutes = require('./routes/task');
const withdrawRoutes = require('./routes/withdraw');
const messageRoutes = require('./routes/message');
const adminRoutes = require('./routes/admin');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// --- Add these two “health-check” endpoints ---
app.get('/', (req, res) => {
  res.send('TaskWorker API is running');
});

app.get('/api', (req, res) => {
  res.json({ message: 'API root — authentication routes at /api/auth' });
});
// ------------------------------------------------

// Public / auth
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/user', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/messages', messageRoutes);

// Admin
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
