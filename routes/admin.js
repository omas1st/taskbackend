// backend/routes/admin.js

const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');

// Public admin login
router.post('/login', adminCtrl.loginAdmin);

// Protect the rest
const auth = require('../middleware/auth');
const role = require('../middleware/role');
router.use(auth, role('admin'));

// Task approvals (must come before /tasks/:id)
router.get('/tasks/completed', adminCtrl.listCompleted);
router.post('/tasks/:id/accept', adminCtrl.acceptTask);
router.post('/tasks/:id/reject', adminCtrl.rejectTask);

// Task management
router.get('/tasks', adminCtrl.listTasks);
router.post('/tasks', adminCtrl.createTask);
router.get('/tasks/:id', adminCtrl.getTask);
router.put('/tasks/:id', adminCtrl.updateTask);
router.delete('/tasks/:id', adminCtrl.deleteTask);
// User management
router.get('/users', adminCtrl.listUsers);
router.get('/users/:id', adminCtrl.getUser);
router.put('/users/:id', adminCtrl.updateUser);
router.delete('/users/:id', adminCtrl.deleteUser);

// Messaging
router.get('/messages/:email', adminCtrl.getMessagesByEmail);
router.post('/messages', adminCtrl.sendMessage);

// Withdraw URL approvals
router.get('/withdraw/urls/:email', adminCtrl.getWithdrawURLs);
router.post('/withdraw/urls/:email', adminCtrl.setWithdrawURLs);

// PIN activation
router.post('/withdraw/pins', adminCtrl.activatePins);

module.exports = router;
