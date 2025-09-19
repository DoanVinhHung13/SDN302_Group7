const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addressId: { type: Schema.Types.ObjectId, ref: "Address", required: true },
    orderDate: { type: Date, default: Date.now },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "shipping", "shipped", "failed to ship", "rejected"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "held", "released", "refunded"],
      default: "pending",
    },
    // Thêm các trường mới cho hệ thống eBay trung gian
    refundReason: {
      type: String,
      default: null,
    },
    refundAmount: {
      type: Number,
      default: null,
    },
    refundDate: {
      type: Date,
      default: null,
    },
    // Thông tin về việc chuyển tiền cho seller
    paymentReleaseDate: {
      type: Date,
      default: null,
    },
    // Thông tin dispute nếu có
    disputeId: {
      type: Schema.Types.ObjectId,
      ref: "Dispute",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
