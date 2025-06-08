// backend/routes/task.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  listTasks,
  startTask,
  attemptTask,
  getHistory
} = require('../controllers/taskController');

router.use(auth);

router.get('/', listTasks);
router.post('/:id/start', startTask);
router.post('/:id/attempt', attemptTask);
router.get('/history', getHistory);

module.exports = router;
