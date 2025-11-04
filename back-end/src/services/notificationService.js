const { Notification } = require('../models');

class NotificationService {
  
  // Thông báo đơn hàng
  static async notifyOrderStatusChange(userId, orderId, status, orderNumber) {
    const statusMessages = {
      'confirmed': 'Đơn hàng đã được xác nhận',
      'processing': 'Đơn hàng đang được xử lý',
      'shipping': 'Đơn hàng đang được giao',
      'delivered': 'Đơn hàng đã được giao thành công',
      'cancelled': 'Đơn hàng đã bị hủy',
      'returned': 'Đơn hàng đã được trả lại'
    };
    
    return await Notification.createNotification({
      userId,
      title: 'Cập nhật đơn hàng',
      message: `${statusMessages[status] || 'Trạng thái đơn hàng đã thay đổi'} - ${orderNumber}`,
      type: 'order_status',
      relatedId: orderId,
      relatedModel: 'Order',
      actions: [{
        label: 'Xem đơn hàng',
        action: 'view_order',
        url: `/order-details/${orderId}`
      }],
      priority: ['cancelled', 'delivered'].includes(status) ? 'high' : 'normal'
    });
  }
  
  // Thông báo thanh toán
  static async notifyPaymentSuccess(userId, orderId, amount, orderNumber) {
    return await Notification.createNotification({
      userId,
      title: 'Thanh toán thành công',
      message: `Thanh toán ${amount.toLocaleString()}đ cho đơn hàng ${orderNumber} đã thành công`,
      type: 'payment_success',
      relatedId: orderId,
      relatedModel: 'Order',
      actions: [{
        label: 'Xem đơn hàng',
        action: 'view_order',
        url: `/order-details/${orderId}`
      }],
      priority: 'high'
    });
  }
  
  static async notifyPaymentFailed(userId, orderId, reason, orderNumber) {
    return await Notification.createNotification({
      userId,
      title: 'Thanh toán thất bại',
      message: `Thanh toán cho đơn hàng ${orderNumber} thất bại: ${reason}`,
      type: 'payment_failed',
      relatedId: orderId,
      relatedModel: 'Order',
      actions: [{
        label: 'Thử lại',
        action: 'retry_payment',
        url: `/payment/${orderId}`
      }],
      priority: 'high'
    });
  }
  
  // Thông báo tin nhắn mới
  static async notifyNewMessage(userId, messageId, senderName, preview) {
    return await Notification.createNotification({
      userId,
      title: 'Tin nhắn mới',
      message: `${senderName}: ${preview.substring(0, 50)}${preview.length > 50 ? '...' : ''}`,
      type: 'new_message',
      relatedId: messageId,
      relatedModel: 'Message',
      actions: [{
        label: 'Xem tin nhắn',
        action: 'view_message',
        url: '/chat'
      }],
      priority: 'normal'
    });
  }
  
  // Thông báo đánh giá mới (cho seller)
  static async notifyNewReview(sellerId, reviewId, productName, rating) {
    const stars = '⭐'.repeat(rating);
    return await Notification.createNotification({
      userId: sellerId,
      title: 'Đánh giá mới',
      message: `Sản phẩm "${productName}" nhận được đánh giá ${stars} (${rating}/5)`,
      type: 'review_received',
      relatedId: reviewId,
      relatedModel: 'Review',
      actions: [{
        label: 'Xem đánh giá',
        action: 'view_review',
        url: `/reviews/${reviewId}`
      }],
      priority: rating <= 2 ? 'high' : 'normal'
    });
  }
  
  // Thông báo yêu cầu trả hàng
  static async notifyReturnRequest(sellerId, returnRequestId, productName, buyerName) {
    return await Notification.createNotification({
      userId: sellerId,
      title: 'Yêu cầu trả hàng mới',
      message: `${buyerName} yêu cầu trả hàng sản phẩm "${productName}"`,
      type: 'return_request',
      relatedId: returnRequestId,
      relatedModel: 'ReturnRequest',
      actions: [{
        label: 'Xem yêu cầu',
        action: 'view_return_request',
        url: `/manage-return-request`
      }],
      priority: 'high'
    });
  }
  
  static async notifyReturnRequestUpdate(userId, returnRequestId, status, productName) {
    const statusMessages = {
      'seller_approved': 'Seller đã chấp nhận yêu cầu trả hàng',
      'seller_rejected': 'Seller đã từ chối yêu cầu trả hàng',
      'approved': 'Yêu cầu trả hàng đã được chấp thuận',
      'rejected': 'Yêu cầu trả hàng đã bị từ chối',
      'processing': 'Yêu cầu trả hàng đang được xử lý',
      'completed': 'Yêu cầu trả hàng đã hoàn thành'
    };
    
    return await Notification.createNotification({
      userId,
      title: 'Cập nhật yêu cầu trả hàng',
      message: `${statusMessages[status]} cho sản phẩm "${productName}"`,
      type: 'return_request',
      relatedId: returnRequestId,
      relatedModel: 'ReturnRequest',
      actions: [{
        label: 'Xem chi tiết',
        action: 'view_return_request',
        url: `/return-requests/${returnRequestId}`
      }],
      priority: ['approved', 'completed'].includes(status) ? 'high' : 'normal'
    });
  }
  
  // Thông báo voucher sắp hết hạn
  static async notifyVoucherExpiring(userId, voucherCode, expirationDate) {
    const daysLeft = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
    
    return await Notification.createNotification({
      userId,
      title: 'Voucher sắp hết hạn',
      message: `Mã giảm giá ${voucherCode} sẽ hết hạn trong ${daysLeft} ngày`,
      type: 'voucher_expiring',
      actions: [{
        label: 'Sử dụng ngay',
        action: 'use_voucher',
        url: '/cart'
      }],
      priority: daysLeft <= 1 ? 'urgent' : 'normal',
      expiresAt: expirationDate
    });
  }
  
  // Thông báo khuyến mãi
  static async notifyPromotion(userId, title, message, actionUrl) {
    return await Notification.createNotification({
      userId,
      title,
      message,
      type: 'promotion',
      actions: actionUrl ? [{
        label: 'Xem ngay',
        action: 'view_promotion',
        url: actionUrl
      }] : [],
      priority: 'normal'
    });
  }
  
  // Thông báo hệ thống
  static async notifySystem(userId, title, message, priority = 'normal') {
    return await Notification.createNotification({
      userId,
      title,
      message,
      type: 'system',
      priority
    });
  }
  
  // Gửi thông báo cho nhiều user
  static async notifyMultipleUsers(userIds, notificationData) {
    const notifications = userIds.map(userId => ({
      ...notificationData,
      userId
    }));
    
    return await Notification.insertMany(notifications);
  }
  
  // Gửi thông báo broadcast (tất cả user)
  static async broadcastNotification(title, message, type = 'system') {
    const User = require('../models/User');
    const userIds = await User.find({ isActive: true }).distinct('_id');
    
    return await this.notifyMultipleUsers(userIds, {
      title,
      message,
      type,
      priority: 'high'
    });
  }
}

module.exports = NotificationService;