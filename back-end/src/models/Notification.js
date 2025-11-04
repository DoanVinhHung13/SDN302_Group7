const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'order_status',      // Cập nhật trạng thái đơn hàng
        'payment_success',   // Thanh toán thành công
        'payment_failed',    // Thanh toán thất bại
        'new_message',       // Tin nhắn mới
        'review_received',   // Nhận đánh giá mới
        'return_request',    // Yêu cầu trả hàng
        'dispute_update',    // Cập nhật khiếu nại
        'voucher_expiring',  // Voucher sắp hết hạn
        'promotion',         // Khuyến mãi
        'system',            // Thông báo hệ thống
        'seller_response'    // Phản hồi từ seller
      ],
      required: true
    },
    
    // Dữ liệu liên quan
    relatedId: { type: Schema.Types.ObjectId }, // ID của order, message, etc.
    relatedModel: { 
      type: String,
      enum: ['Order', 'Message', 'Review', 'ReturnRequest', 'Dispute', 'Voucher']
    },
    
    // Metadata
    data: { type: Schema.Types.Mixed }, // Dữ liệu bổ sung
    
    // Trạng thái
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    
    // Action buttons (optional)
    actions: [{
      label: String,
      action: String, // 'view_order', 'reply_message', etc.
      url: String
    }],
    
    // Thời gian
    expiresAt: { type: Date }, // Tự động xóa sau thời gian này
    
    // Priority
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    }
  },
  { 
    timestamps: true,
    // TTL index để tự động xóa notification cũ
    expireAfterSeconds: 2592000 // 30 days
  }
);

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method để tạo notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  
  // Emit realtime notification via Socket.IO
  try {
    if (global.io) {
      global.io.to(`user_${data.userId}`).emit('new_notification', notification);
    }
  } catch (error) {
    console.log('Socket.IO not available for notification:', error.message);
  }
  
  return notification;
};

// Static method để đánh dấu đã đọc
notificationSchema.statics.markAsRead = async function(userId, notificationIds) {
  const result = await this.updateMany(
    { 
      userId, 
      _id: { $in: notificationIds },
      isRead: false 
    },
    { 
      isRead: true, 
      readAt: new Date() 
    }
  );
  
  return result;
};

// Static method để lấy số lượng notification chưa đọc
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

module.exports = mongoose.model("Notification", notificationSchema);