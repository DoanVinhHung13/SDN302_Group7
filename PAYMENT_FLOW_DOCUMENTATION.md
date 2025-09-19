# Luồng Thanh Toán eBay-style - Tài liệu

## Tổng quan
Hệ thống đã được cập nhật để mô phỏng luồng thanh toán của eBay, trong đó platform giữ tiền và chỉ chuyển cho seller sau khi đơn hàng được giao thành công.

## Luồng mới

### 1. Buyer đặt hàng và thanh toán
- Buyer chọn sản phẩm và đặt hàng
- Thanh toán được xử lý và chuyển sang trạng thái "paid"
- **Order được tạo với `paymentStatus: "held"`** - eBay giữ tiền

### 2. Seller xử lý đơn hàng
- Seller nhận đơn hàng và chuẩn bị giao hàng
- Seller cập nhật trạng thái OrderItem từ "pending" → "shipping" → "shipped"
- Khi tất cả OrderItem có status "shipped", Order status tự động chuyển thành "shipped"
- **Payment vẫn ở trạng thái "held"** - chờ admin xử lý

### 3. Admin quản lý chuyển tiền
- Admin truy cập màn hình "Payment Management" 
- Xem danh sách đơn hàng đã shipped với payment status "held"
- Admin có thể:
  - **Chuyển tiền cho seller**: Chuyển paymentStatus từ "held" → "released"
  - **Hoàn tiền cho buyer**: Chuyển paymentStatus từ "held" → "refunded"

### 4. Feedback và hoàn tất
- Sau khi chuyển tiền, buyer có thể để lại feedback
- Luồng hoàn tất

## Các thay đổi kỹ thuật

### Backend Changes

#### 1. Model Order (Order.js)
```javascript
paymentStatus: {
  type: String,
  enum: ["pending", "held", "released", "refunded"],
  default: "pending",
}
```

#### 2. Order Controller (orderController.js)
- Khi tạo order mới: `paymentStatus: "held"`
- Khi order shipped: giữ nguyên `paymentStatus: "held"`

#### 3. Admin Controller (adminController.js)
Thêm 3 API mới:
- `GET /api/admin/orders/payment-management` - Lấy danh sách đơn hàng cần xử lý
- `PUT /api/admin/orders/:orderId/release-payment` - Chuyển tiền cho seller
- `PUT /api/admin/orders/:orderId/refund-payment` - Hoàn tiền cho buyer

#### 4. Admin Routes (admin.js)
```javascript
router.get("/orders/payment-management", getOrdersForPaymentManagement);
router.put("/orders/:orderId/release-payment", releasePaymentToSeller);
router.put("/orders/:orderId/refund-payment", refundPaymentToBuyer);
```

### Frontend Changes

#### 1. Màn hình Payment Management
- **File**: `front-end/src/pages/DashboardAdmin/ManagePayment/ManagePayment.js`
- **Chức năng**:
  - Hiển thị danh sách đơn hàng đã shipped với payment held
  - Xem chi tiết đơn hàng và danh sách seller
  - Chuyển tiền cho từng seller riêng biệt
  - Hoàn tiền cho buyer với lý do

#### 2. Service API
- **File**: `front-end/src/services/api/PaymentManagementService.js`
- Cung cấp các method để gọi API payment management

#### 3. Navigation
- Thêm menu "Payment Management" vào admin dashboard
- Route: `/admin/manage-payments`

## Các trạng thái Payment

| Trạng thái | Mô tả | Khi nào |
|------------|-------|---------|
| `pending` | Chờ thanh toán | Khi order mới tạo, chưa thanh toán |
| `held` | eBay giữ tiền | Sau khi thanh toán thành công, chờ admin xử lý |
| `released` | Đã chuyển cho seller | Admin đã chuyển tiền cho seller |
| `refunded` | Đã hoàn tiền | Admin đã hoàn tiền cho buyer |

## Lợi ích của luồng mới

1. **Bảo vệ Buyer**: Tiền được giữ cho đến khi nhận hàng
2. **Bảo vệ Seller**: Đảm bảo thanh toán sau khi giao hàng
3. **Kiểm soát Admin**: Admin có thể can thiệp khi cần thiết
4. **Minh bạch**: Tất cả giao dịch được theo dõi và ghi log
5. **Linh hoạt**: Có thể hoàn tiền hoặc chuyển tiền tùy tình huống

## Cách sử dụng

### Cho Admin:
1. Đăng nhập với tài khoản admin
2. Vào menu "Payment Management"
3. Xem danh sách đơn hàng cần xử lý
4. Click "Xem chi tiết" để xem thông tin đầy đủ
5. Click "Chuyển tiền" cho từng seller hoặc "Hoàn tiền" cho buyer

### Cho Seller:
- Không thay đổi gì, vẫn xử lý đơn hàng như bình thường
- Sẽ nhận được email thông báo khi admin chuyển tiền

### Cho Buyer:
- Không thay đổi gì, vẫn đặt hàng và thanh toán như bình thường
- Sẽ nhận được email thông báo nếu có hoàn tiền

## Lưu ý quan trọng

1. **Email Notifications**: Hệ thống sẽ gửi email thông báo khi:
   - Chuyển tiền cho seller
   - Hoàn tiền cho buyer

2. **Security**: Tất cả API đều yêu cầu authentication và admin role

3. **Error Handling**: Có xử lý lỗi đầy đủ cho các trường hợp:
   - Order không tồn tại
   - Payment đã được xử lý
   - Order chưa được shipped

4. **Data Integrity**: Không thể chuyển tiền cho order chưa shipped
