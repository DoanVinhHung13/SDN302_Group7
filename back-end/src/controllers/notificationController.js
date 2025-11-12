// C:\prj\SDN302_Group7\back-end\src\controllers\notificationController.js

const Notification = require('../models/Notification'); 
// ĐÃ BỎ: const ErrorHandler = require('../utils/ErrorHandler');
// ĐÃ BỎ: const catchAsyncErrors = require('../middleware/catchAsyncErrors');

// Lấy danh sách thông báo của người dùng hiện tại
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy ID người dùng (dùng .id hoặc ._id tùy config của middleware)
        
        // Lấy tối đa 50 thông báo, sắp xếp theo thời gian mới nhất
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 }) // Mới nhất trước
            .limit(50);

        res.status(200).json({
            success: true,
            notifications,
        });

    } catch (error) {
        console.error("Lỗi khi lấy thông báo:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi lấy thông báo.' 
        });
    }
};

// Đánh dấu một thông báo cụ thể là đã đọc
exports.markOneAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; 

        const notification = await Notification.findOneAndUpdate(
            { _id: id, user: userId, isRead: false },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            // Trả về 404 nếu không tìm thấy hoặc đã được đọc
            return res.status(404).json({
                success: false,
                message: 'Thông báo không tồn tại hoặc đã được đánh dấu đọc.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification marked as read.',
            notification,
        });

    } catch (error) {
        console.error("Lỗi khi đánh dấu thông báo đã đọc:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi cập nhật trạng thái thông báo.' 
        });
    }
};

// Đánh dấu TẤT CẢ thông báo là đã đọc
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id; 

        // Cập nhật tất cả thông báo CHƯA ĐỌC của người dùng này
        const result = await Notification.updateMany(
            { user: userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({
            success: true,
            message: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc.`,
            modifiedCount: result.modifiedCount,
        });

    } catch (error) {
        console.error("Lỗi khi đánh dấu tất cả thông báo đã đọc:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi cập nhật tất cả thông báo.' 
        });
    }
};