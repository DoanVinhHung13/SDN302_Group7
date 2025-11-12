// models/Notification.js

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // ID của người dùng nhận thông báo (required)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Giả sử Model người dùng của bạn là 'User'
        required: true,
        index: true,
    },
    // Nội dung chính của thông báo
    content: {
        type: String,
        required: true,
        trim: true,
    },
    // Loại thông báo (giúp phân loại và hiển thị icon/màu sắc phù hợp)
    type: {
        type: String,
        enum: ['Order', 'Promotion', 'Feedback', 'Dispute', 'System', 'ReturnRequest'],
        default: 'System',
    },
    // Liên kết khi click vào thông báo (ví dụ: '/orders/123')
    link: {
        type: String,
        trim: true,
        default: '#',
    },
    // Trạng thái đã đọc
    isRead: {
        type: Boolean,
        default: false,
    },
    // ID liên quan (ví dụ: OrderId, ReviewId, CouponId)
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    }
}, {
    timestamps: true, // Thêm createdAt và updatedAt tự động
});

// Tạo index kết hợp để tăng tốc độ truy vấn thông báo theo người dùng và trạng thái
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// 🌟 DÒNG ĐÃ SỬA LỖI OverwriteModelError 🌟
// Kiểm tra xem Model 'Notification' đã tồn tại chưa. Nếu có, sử dụng nó; nếu không, tạo mới.
module.exports = mongoose.models.Notification 
    ? mongoose.models.Notification 
    : mongoose.model('Notification', notificationSchema);