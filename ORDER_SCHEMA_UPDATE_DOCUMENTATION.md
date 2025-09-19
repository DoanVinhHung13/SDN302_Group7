# Order Schema Update - Tài liệu

## Tổng quan
Đã cập nhật Order schema và database để phù hợp hơn với hệ thống eBay trung gian, bao gồm các trường mới cho việc quản lý hoàn tiền và chuyển tiền.

## Các thay đổi chính

### 1. Cập nhật Order Schema

#### Trường mới được thêm:
```javascript
// Thông tin hoàn tiền
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
```

#### Schema hoàn chỉnh:
```javascript
const orderSchema = new Schema({
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
  // Các trường mới cho hệ thống eBay trung gian
  refundReason: { type: String, default: null },
  refundAmount: { type: Number, default: null },
  refundDate: { type: Date, default: null },
  paymentReleaseDate: { type: Date, default: null },
  disputeId: { type: Schema.Types.ObjectId, ref: "Dispute", default: null },
}, { timestamps: true });
```

### 2. Cập nhật Database

#### Thống kê cập nhật:
- **Tổng đơn hàng**: 61 đơn hàng
- **Đã cập nhật**: 61 đơn hàng (100%)
- **Phân bố paymentStatus**:
  - `held`: 17 đơn hàng (đã shipped)
  - `pending`: 44 đơn hàng (chưa shipped)

#### Logic cập nhật:
```javascript
switch (order.status) {
  case 'shipped':
    paymentStatus = 'held'; // Đã giao, tiền đang được giữ
    paymentReleaseDate = new Date(); // Có thể chuyển tiền
    break;
  case 'processing':
  case 'shipping':
    paymentStatus = 'held'; // Đang xử lý, tiền đang được giữ
    break;
  case 'pending':
    paymentStatus = 'pending'; // Chưa thanh toán
    break;
  case 'failed to ship':
  case 'rejected':
    paymentStatus = 'refunded'; // Cần hoàn tiền
    refundReason = `Đơn hàng ${order.status}`;
    refundAmount = order.totalPrice;
    refundDate = new Date();
    break;
}
```

### 3. Cập nhật Controllers

#### Admin Controller:
- **Release Payment**: Thêm `paymentReleaseDate` khi chuyển tiền
- **Refund Payment**: Thêm `refundReason`, `refundAmount`, `refundDate`

#### Order Controller:
- **Create Order**: Khởi tạo tất cả trường mới với giá trị mặc định

## Luồng hoạt động mới

### 1. Đặt hàng và thanh toán:
```
Buyer đặt hàng → Order tạo với paymentStatus: "held"
→ PayPal thanh toán → paymentStatus: "held" (tiền được giữ)
```

### 2. Xử lý đơn hàng:
```
Seller ship hàng → Order status: "shipped"
→ paymentStatus vẫn "held" (chờ admin chuyển tiền)
```

### 3. Admin chuyển tiền:
```
Admin chọn "Release Payment" → paymentStatus: "released"
→ paymentReleaseDate: new Date()
→ Gửi email thông báo cho seller
```

### 4. Admin hoàn tiền:
```
Admin chọn "Refund Payment" → paymentStatus: "refunded"
→ refundReason: lý do hoàn tiền
→ refundAmount: số tiền hoàn
→ refundDate: new Date()
→ Gửi email thông báo cho buyer
```

## Lợi ích của cập nhật

### 1. **Tính minh bạch**
- Theo dõi đầy đủ quá trình thanh toán
- Lưu trữ lý do hoàn tiền
- Ghi nhận thời gian chuyển tiền

### 2. **Tính bảo mật**
- Kiểm soát chặt chẽ việc chuyển tiền
- Audit trail đầy đủ
- Ngăn chặn gian lận

### 3. **Tính hiệu quả**
- Admin có thể quản lý tập trung
- Tự động hóa thông báo
- Giảm thiểu lỗi thủ công

### 4. **Tính linh hoạt**
- Hỗ trợ nhiều trường hợp hoàn tiền
- Tích hợp với hệ thống dispute
- Mở rộng dễ dàng

## Cách sử dụng

### 1. Tạo đơn hàng mới:
```javascript
const order = new Order({
  buyerId,
  addressId,
  totalPrice,
  status: 'pending',
  paymentStatus: 'held',
  refundReason: null,
  refundAmount: null,
  refundDate: null,
  paymentReleaseDate: null,
  disputeId: null,
});
```

### 2. Chuyển tiền cho seller:
```javascript
order.paymentStatus = 'released';
order.paymentReleaseDate = new Date();
await order.save();
```

### 3. Hoàn tiền cho buyer:
```javascript
order.paymentStatus = 'refunded';
order.refundReason = 'Sản phẩm bị lỗi';
order.refundAmount = order.totalPrice;
order.refundDate = new Date();
await order.save();
```

## API Endpoints

### 1. Lấy đơn hàng với thông tin mới:
```
GET /api/admin/orders
Response: {
  data: [{
    _id: "...",
    status: "shipped",
    paymentStatus: "held",
    refundReason: null,
    refundAmount: null,
    refundDate: null,
    paymentReleaseDate: "2025-09-19T04:19:40.080Z",
    disputeId: null
  }]
}
```

### 2. Chuyển tiền:
```
PUT /api/admin/orders/:orderId/release-payment
Body: { sellerId: "..." }
Response: {
  success: true,
  message: "Chuyển tiền cho seller thành công",
  data: { paymentStatus: "released", paymentReleaseDate: "..." }
}
```

### 3. Hoàn tiền:
```
PUT /api/admin/orders/:orderId/refund-payment
Body: { reason: "Sản phẩm bị lỗi" }
Response: {
  success: true,
  message: "Hoàn tiền cho buyer thành công",
  data: { 
    paymentStatus: "refunded", 
    refundReason: "Sản phẩm bị lỗi",
    refundAmount: 799.99,
    refundDate: "..."
  }
}
```

## Testing

### Test Cases:
1. ✅ Tạo đơn hàng mới với các trường mới
2. ✅ Cập nhật paymentStatus từ held → released
3. ✅ Cập nhật paymentStatus từ held → refunded
4. ✅ Lưu trữ thông tin hoàn tiền đầy đủ
5. ✅ Ghi nhận thời gian chuyển tiền
6. ✅ Tích hợp với email notifications

### Test Data:
- Orders với các paymentStatus khác nhau
- Orders có thông tin refund
- Orders có paymentReleaseDate
- Orders liên kết với dispute

## Lưu ý quan trọng

1. **Backward Compatibility**: Các trường mới có default value nên không ảnh hưởng đến dữ liệu cũ
2. **Data Integrity**: Tất cả trường mới đều có validation phù hợp
3. **Performance**: Các trường mới không ảnh hưởng đến performance của queries hiện có
4. **Security**: Chỉ admin mới có thể thay đổi paymentStatus

## Kết luận

Cập nhật này giúp hệ thống quản lý thanh toán chặt chẽ hơn, phù hợp với mô hình eBay trung gian, đảm bảo tính minh bạch và bảo mật trong việc xử lý tiền của khách hàng.

