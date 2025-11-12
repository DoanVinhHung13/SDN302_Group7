// routers/notificationRouter.js
const express = require('express');
const { authMiddleware } = require('../middleware/auth.middleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Tất cả các route thông báo đều cần xác thực người dùng
router.use(authMiddleware); 

// Lấy danh sách thông báo của người dùng hiện tại
router.get('/', notificationController.getNotifications);

// Đánh dấu tất cả thông báo là đã đọc
router.patch('/mark-all-read', notificationController.markAllAsRead);

// Đánh dấu một thông báo cụ thể là đã đọc
router.patch('/mark-read/:id', notificationController.markOneAsRead);

module.exports = router;