const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const voucherSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    title: { type: String, required: true }, // Tên hiển thị của voucher
    description: { type: String, required: true }, // Mô tả chi tiết
    discount: { type: Number, required: true },
    discountType: {
      type: String,
      enum: ["percentage", "fixed", "shipping"],
      default: "percentage",
    },
    maxDiscount: { type: Number, default: 0 }, // Giảm tối đa cho percentage
    minOrderValue: { type: Number, default: 0 }, // Giá trị đơn hàng tối thiểu

    // Thời gian hiệu lực
    startDate: { type: Date, default: Date.now },
    expirationDate: { type: Date, required: true },

    // Giới hạn sử dụng
    usageLimit: { type: Number, required: true, default: 1, min: 1 },
    usedCount: { type: Number, default: 0 },
    usageLimitPerUser: { type: Number, default: 1 }, // Giới hạn mỗi user

    // Áp dụng cho
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }], // Sản phẩm cụ thể
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }], // Danh mục
    applicableStores: [{ type: Schema.Types.ObjectId, ref: "Store" }], // Cửa hàng
    excludeProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }], // Loại trừ sản phẩm

    // Điều kiện khác
    firstTimeUserOnly: { type: Boolean, default: false }, // Chỉ user mới
    minimumQuantity: { type: Number, default: 1 }, // Số lượng tối thiểu

    // Trạng thái
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true }, // Hiển thị công khai hay không

    // Thống kê
    usageHistory: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        orderId: { type: Schema.Types.ObjectId, ref: "Order" },
        usedAt: { type: Date, default: Date.now },
        discountAmount: { type: Number },
      },
    ],

    // Metadata
    createdBy: { type: Schema.Types.ObjectId, ref: "User" }, // Admin tạo
    tags: [String], // Tags để phân loại
  },
  { timestamps: true }
);

// Indexes for better performance
voucherSchema.index({ code: 1 });
voucherSchema.index({ isActive: 1, isPublic: 1 });
voucherSchema.index({ startDate: 1, expirationDate: 1 });
voucherSchema.index({ applicableCategories: 1 });
voucherSchema.index({ applicableStores: 1 });

// Hook tự động cập nhật isActive trước khi lưu
voucherSchema.pre("save", function (next) {
  const now = new Date();

  // Kiểm tra thời gian hiệu lực
  if (this.startDate > now || this.expirationDate < now) {
    this.isActive = false;
  }
  // Kiểm tra số lượt sử dụng
  else if (this.usedCount >= this.usageLimit) {
    this.isActive = false;
  }
  // Nếu tất cả điều kiện OK thì active
  else {
    this.isActive = true;
  }

  next();
});

// Method để kiểm tra voucher có áp dụng được cho user và sản phẩm không
voucherSchema.methods.isValidForUser = function (userId, products, orderValue) {
  const now = new Date();

  // Kiểm tra thời gian
  if (this.startDate > now || this.expirationDate < now) {
    return {
      valid: false,
      message: "Voucher đã hết hạn hoặc chưa có hiệu lực",
    };
  }

  // Kiểm tra trạng thái
  if (!this.isActive) {
    return { valid: false, message: "Voucher không còn hiệu lực" };
  }

  // Kiểm tra số lượt sử dụng
  if (this.usedCount >= this.usageLimit) {
    return { valid: false, message: "Voucher đã hết lượt sử dụng" };
  }

  // Kiểm tra giá trị đơn hàng tối thiểu
  if (orderValue < this.minOrderValue) {
    return {
      valid: false,
      message: `Đơn hàng tối thiểu ${this.minOrderValue.toLocaleString()}đ`,
    };
  }

  // Kiểm tra số lượt sử dụng per user
  const userUsageCount = this.usageHistory.filter(
    (h) => h.userId.toString() === userId.toString()
  ).length;
  if (userUsageCount >= this.usageLimitPerUser) {
    return { valid: false, message: "Bạn đã sử dụng hết lượt cho voucher này" };
  }

  // Kiểm tra sản phẩm áp dụng
  if (this.applicableProducts.length > 0) {
    const hasApplicableProduct = products.some((p) =>
      this.applicableProducts.some((ap) => ap.toString() === p._id.toString())
    );
    if (!hasApplicableProduct) {
      return {
        valid: false,
        message: "Voucher không áp dụng cho sản phẩm này",
      };
    }
  }

  // Kiểm tra sản phẩm loại trừ
  if (this.excludeProducts.length > 0) {
    const hasExcludedProduct = products.some((p) =>
      this.excludeProducts.some((ep) => ep.toString() === p._id.toString())
    );
    if (hasExcludedProduct) {
      return {
        valid: false,
        message: "Voucher không áp dụng cho một số sản phẩm trong giỏ hàng",
      };
    }
  }

  return { valid: true, message: "Voucher hợp lệ" };
};

// Method tính toán số tiền giảm giá
voucherSchema.methods.calculateDiscount = function (
  orderValue,
  shippingFee = 0
) {
  let discountAmount = 0;

  switch (this.discountType) {
    case "percentage":
      discountAmount = (orderValue * this.discount) / 100;
      if (this.maxDiscount > 0 && discountAmount > this.maxDiscount) {
        discountAmount = this.maxDiscount;
      }
      break;

    case "fixed":
      discountAmount = Math.min(this.discount, orderValue);
      break;

    case "shipping":
      discountAmount = Math.min(this.discount, shippingFee);
      break;

    default:
      discountAmount = 0;
  }

  return Math.round(discountAmount);
};

module.exports = mongoose.model("Voucher", voucherSchema);
