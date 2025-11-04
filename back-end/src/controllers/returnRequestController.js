const mongoose = require('mongoose');
const { ReturnRequest, OrderItem } = require('../models');

/**
 * Tạo một yêu cầu trả hàng mới
 * @route POST /api/buyers/return-requests
 * @access Private - Chỉ buyer mới có thể tạo return request
 */
exports.createReturnRequest = async (req, res) => {
  try {
    const { orderItemId, reason, description, type = 'return', images = [] } = req.body;
    const userId = req.user.id;

    // Validation
    if (!orderItemId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cần thiết: orderItemId, reason, description'
      });
    }

    // Kiểm tra orderItem có tồn tại không
    const orderItem = await OrderItem.findById(orderItemId)
      .populate('productId', 'title price sellerId')
      .populate('orderId', 'buyerId orderNumber totalAmount createdAt status');

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mặt hàng trong đơn hàng'
      });
    }

    const order = orderItem.orderId;
    
    // Kiểm tra quyền sở hữu
    if (!order.buyerId || order.buyerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo yêu cầu trả hàng cho đơn hàng này'
      });
    }

    // Kiểm tra trạng thái đơn hàng (chỉ cho phép return khi đã delivered)
    if (!['delivered', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể tạo yêu cầu trả hàng khi đơn hàng đã được giao'
      });
    }

    // Kiểm tra thời hạn return (30 ngày)
    const deliveryDate = order.deliveredAt || order.updatedAt;
    const daysSinceDelivery = Math.floor((Date.now() - deliveryDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceDelivery > 30) {
      return res.status(400).json({
        success: false,
        message: 'Đã quá thời hạn 30 ngày để tạo yêu cầu trả hàng'
      });
    }

    // Kiểm tra đã có return request cho orderItem này chưa
    const existingRequest = await ReturnRequest.findOne({ 
      orderItemId,
      status: { $nin: ['cancelled', 'rejected'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Đã tồn tại yêu cầu trả hàng đang xử lý cho mặt hàng này',
        data: existingRequest
      });
    }

    // Tạo return request mới
    const returnRequest = new ReturnRequest({
      orderItemId,
      orderId: order._id,
      userId,
      sellerId: orderItem.productId.sellerId,
      type,
      reason,
      description,
      images,
      status: 'pending',
      timeline: [{
        status: 'pending',
        message: 'Yêu cầu trả hàng đã được tạo',
        createdAt: new Date(),
        createdBy: userId
      }]
    });

    // Tính priority dựa trên giá trị đơn hàng
    returnRequest.priority = returnRequest.calculatePriority(order.totalAmount);

    await returnRequest.save();

    // Gửi thông báo cho seller
    const NotificationService = require('../services/notificationService');
    const User = require('../models/User');
    const buyer = await User.findById(userId).select('fullname');
    
    await NotificationService.notifyReturnRequest(
      orderItem.productId.sellerId,
      returnRequest._id,
      orderItem.productId.title,
      buyer.fullname
    );

    // Populate thông tin để trả về
    await returnRequest.populate([
      {
        path: 'orderItemId',
        populate: [
          { path: 'productId', select: 'title image price' },
          { path: 'orderId', select: 'orderNumber createdAt totalAmount' }
        ]
      }
    ]);

    return res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu trả hàng thành công',
      data: returnRequest
    });
  } catch (error) {
    console.error('Error creating return request:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi tạo yêu cầu trả hàng',
      error: error.message
    });
  }
};

/**
 * Lấy danh sách yêu cầu trả hàng của người dùng
 * @route GET /api/buyers/return-requests
 * @access Private - Chỉ buyer mới có thể xem return requests của mình
 */
exports.getUserReturnRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const returnRequests = await ReturnRequest.find({ userId })
      .populate({
        path: 'orderItemId',
        populate: [
          { path: 'productId', select: 'title image price' },
          { path: 'orderId', select: 'orderNumber createdAt totalAmount' }
        ]
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: returnRequests
    });
  } catch (error) {
    console.error('Error fetching user return requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy danh sách yêu cầu trả hàng',
      error: error.message
    });
  }
};

/**
 * Xem chi tiết yêu cầu trả hàng
 * @route GET /api/buyers/return-requests/:id
 * @access Private - Chỉ buyer tạo yêu cầu mới có thể xem
 */
exports.getReturnRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const returnRequest = await ReturnRequest.findById(id)
      .populate({
        path: 'orderItemId',
        populate: [
          { path: 'productId', select: 'title image price description' },
          { path: 'orderId', select: 'orderNumber createdAt totalAmount' }
        ]
      });

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu trả hàng'
      });
    }

    // Kiểm tra quyền xem
    if (returnRequest.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem yêu cầu trả hàng này'
      });
    }

    return res.status(200).json({
      success: true,
      data: returnRequest
    });
  } catch (error) {
    console.error('Error fetching return request details:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi lấy chi tiết yêu cầu trả hàng',
      error: error.message
    });
  }
};

/**
 * Hủy yêu cầu trả hàng (chỉ khi status = pending)
 * @route DELETE /api/buyers/return-requests/:id
 * @access Private - Chỉ buyer tạo yêu cầu mới có thể hủy
 */
exports.cancelReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const returnRequest = await ReturnRequest.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu trả hàng'
      });
    }

    // Kiểm tra quyền hủy
    if (returnRequest.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy yêu cầu trả hàng này'
      });
    }

    // Chỉ có thể hủy khi trạng thái là pending
    if (returnRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy yêu cầu trả hàng đã được xử lý'
      });
    }

    await ReturnRequest.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Hủy yêu cầu trả hàng thành công'
    });
  } catch (error) {
    console.error('Error canceling return request:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi hủy yêu cầu trả hàng',
      error: error.message
    });
  }
};
