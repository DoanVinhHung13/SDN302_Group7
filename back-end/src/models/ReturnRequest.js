const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const returnRequestSchema = new Schema(
  {
    orderItemId: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Thông tin yêu cầu
    type: {
      type: String,
      enum: ["return", "refund", "exchange"],
      default: "return",
    },
    reason: {
      type: String,
      required: true,
      enum: [
        "defective_product",
        "wrong_item",
        "not_as_described",
        "damaged_shipping",
        "changed_mind",
        "size_issue",
        "quality_issue",
        "other",
      ],
    },
    description: { type: String, required: true },

    // Hình ảnh minh chứng
    images: [
      {
        url: String,
        publicId: String, // Cloudinary public ID
      },
    ],

    // Trạng thái xử lý
    status: {
      type: String,
      enum: [
        "pending", // Chờ xử lý
        "seller_approved", // Seller chấp nhận
        "seller_rejected", // Seller từ chối
        "admin_reviewing", // Admin đang xem xét
        "approved", // Được chấp thuận
        "rejected", // Bị từ chối
        "processing", // Đang xử lý
        "completed", // Hoàn thành
        "cancelled", // Đã hủy
      ],
      default: "pending",
    },

    // Thông tin xử lý
    sellerResponse: {
      message: String,
      respondedAt: Date,
      decision: {
        type: String,
        enum: ["approve", "reject", "need_admin_review"],
      },
    },

    adminResponse: {
      adminId: { type: Schema.Types.ObjectId, ref: "User" },
      message: String,
      respondedAt: Date,
      decision: {
        type: String,
        enum: ["approve", "reject"],
      },
    },

    // Thông tin hoàn tiền
    refundInfo: {
      amount: { type: Number, default: 0 },
      method: {
        type: String,
        enum: ["original_payment", "store_credit", "bank_transfer"],
      },
      processedAt: Date,
      transactionId: String,
    },

    // Thông tin vận chuyển (nếu cần trả hàng)
    shippingInfo: {
      trackingNumber: String,
      carrier: String,
      shippingLabel: String, // URL to shipping label
      estimatedDelivery: Date,
    },

    // Timeline
    timeline: [
      {
        status: String,
        message: String,
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // Metadata
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // Thời gian xử lý
    dueDate: Date, // Hạn xử lý
    resolvedAt: Date,

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
returnRequestSchema.index({ userId: 1, status: 1 });
returnRequestSchema.index({ sellerId: 1, status: 1 });
returnRequestSchema.index({ orderId: 1 });
returnRequestSchema.index({ createdAt: -1 });
returnRequestSchema.index({ dueDate: 1, status: 1 });

// Pre-save middleware để set dueDate và timeline
returnRequestSchema.pre("save", function (next) {
  // Set due date (7 days from creation for seller response)
  if (this.isNew && !this.dueDate) {
    this.dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  // Add to timeline if status changed
  if (this.isModified("status") && !this.isNew) {
    this.timeline.push({
      status: this.status,
      message: `Status changed to ${this.status}`,
      createdAt: new Date(),
    });
  }

  next();
});

// Method để tính priority dựa trên giá trị đơn hàng và thời gian
returnRequestSchema.methods.calculatePriority = function (orderValue) {
  const daysSinceCreated = Math.floor(
    (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)
  );

  if (orderValue > 1000000 || daysSinceCreated > 5) {
    // > 1M VND hoặc > 5 ngày
    return "high";
  } else if (orderValue > 500000 || daysSinceCreated > 3) {
    // > 500K VND hoặc > 3 ngày
    return "normal";
  }
  return "low";
};

// Static method để lấy thống kê return requests
returnRequestSchema.statics.getStats = function (sellerId, timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgProcessingTime: {
          $avg: {
            $cond: [
              { $ne: ["$resolvedAt", null] },
              { $subtract: ["$resolvedAt", "$createdAt"] },
              null,
            ],
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model("ReturnRequest", returnRequestSchema);
