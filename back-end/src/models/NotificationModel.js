// backend/models/NotificationModel.js

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // ID người dùng nhận thông báo
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Tham chiếu đến model User
        required: true
    },
    // Nội dung thông báo
    content: {
        type: String,
        required: true,
        trim: true
    },
    // Loại thông báo: dùng để phân loại icon và ưu tiên (VD: 'order', 'chat', 'system')
    type: {
        type: String,
        enum: ['order', 'shipment', 'payment', 'review', 'system', 'promotion'],
        default: 'system'
    },
    // Liên kết khi người dùng nhấp vào thông báo (VD: /order/orderId)
    link: {
        type: String,
        default: '#'
    },
    // Trạng thái đọc
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Tự động thêm createdAt và updatedAt
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;