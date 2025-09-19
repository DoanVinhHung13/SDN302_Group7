# PayPal Integration - Tài liệu

## Tổng quan
Hệ thống đã được cập nhật để gộp quá trình đặt hàng và thanh toán PayPal thành một bước duy nhất, mô phỏng luồng eBay với PayPal giả lập.

## Luồng mới

### 1. Buyer đặt hàng và thanh toán PayPal
- Buyer chọn sản phẩm và đặt hàng
- **Một API duy nhất** tạo đơn hàng + thanh toán PayPal
- Order được tạo với `paymentStatus: "held"` - eBay giữ tiền
- PayPal payment window mở trong popup

### 2. PayPal Payment Simulation
- PayPal giả lập hiển thị thông tin thanh toán
- Buyer có thể "Pay Now" hoặc "Cancel"
- Nếu thành công: payment status → "paid", order status → "processing"
- Nếu hủy: payment status → "failed"

### 3. Seller xử lý đơn hàng
- Seller nhận đơn hàng và chuẩn bị giao hàng
- Seller cập nhật trạng thái OrderItem từ "pending" → "shipping" → "shipped"
- Khi tất cả OrderItem có status "shipped", Order status tự động chuyển thành "shipped"
- **Payment vẫn ở trạng thái "held"** - chờ admin xử lý

### 4. Admin quản lý chuyển tiền
- Admin truy cập màn hình "Payment Management" 
- Xem danh sách đơn hàng đã shipped với payment status "held"
- Admin có thể:
  - **Chuyển tiền cho seller**: Chuyển paymentStatus từ "held" → "released"
  - **Hoàn tiền cho buyer**: Chuyển paymentStatus từ "held" → "refunded"

## Các thay đổi kỹ thuật

### Backend Changes

#### 1. Order Controller (orderController.js)
Thêm function mới:
```javascript
createOrderWithPayPal(req, res) // Tạo đơn hàng + PayPal payment trong một bước
```

#### 2. Payment Controller (paymentController.js)
Thêm 2 function mới:
```javascript
paypalSimulate(req, res) // Trả về trang PayPal giả lập
paypalComplete(req, res) // Xử lý kết quả thanh toán PayPal
```

#### 3. Routes (buyerRouter.js)
Thêm routes mới:
```javascript
POST /api/buyers/orders/paypal // Tạo đơn hàng + PayPal
GET /api/buyers/payments/paypal/simulate // Trang PayPal giả lập
POST /api/buyers/payments/paypal/complete // Hoàn thành thanh toán
```

### Frontend Changes

#### 1. Order Service
- **File**: `front-end/src/services/api/OrderService.js`
- **Chức năng**: Cung cấp API calls cho order management

#### 2. Checkout Page
- **File**: `front-end/src/pages/Checkout/Checkout.jsx`
- **Thay đổi**:
  - Gọi API `createOrderWithPayPal` thay vì `createOrder`
  - Mở PayPal payment trong popup window
  - Lắng nghe message từ PayPal window
  - Navigate về home sau khi thanh toán thành công

#### 3. PayPal Simulation
- **Trang HTML** được tạo động bởi backend
- **Giao diện** giống PayPal thật với:
  - Thông tin đơn hàng
  - Nút "Pay Now" và "Cancel"
  - JavaScript xử lý thanh toán

## Luồng chi tiết

### 1. Buyer đặt hàng
```
Checkout Page → Click "Place Order & Pay with PayPal" 
→ API: POST /api/buyers/orders/paypal
→ Tạo Order + Payment + PayPal URL
→ Mở PayPal popup window
```

### 2. PayPal Payment
```
PayPal Popup → Buyer clicks "Pay Now"
→ API: POST /api/buyers/payments/paypal/complete
→ Update Payment status to "paid"
→ Update Order status to "processing"
→ Send email notification
→ Close popup + Navigate to home
```

### 3. Order Processing
```
Seller Dashboard → Update OrderItem status to "shipped"
→ Order status auto-update to "shipped"
→ Payment status remains "held"
```

### 4. Admin Payment Management
```
Admin Dashboard → Payment Management
→ View orders with status "shipped" and payment "held"
→ Click "Release Payment" for each seller
→ Payment status → "released"
→ Send email to seller
```

## Các trạng thái

### Order Status
- `pending`: Chờ xử lý
- `processing`: Đang xử lý
- `shipped`: Đã giao hàng

### Payment Status
- `pending`: Chờ thanh toán
- `held`: eBay giữ tiền (sau khi thanh toán thành công)
- `released`: Đã chuyển cho seller
- `refunded`: Đã hoàn tiền

### PayPal Payment Status
- `pending`: Chờ thanh toán
- `paid`: Đã thanh toán thành công
- `failed`: Thanh toán thất bại

## Lợi ích của luồng mới

1. **Đơn giản hóa**: Chỉ một bước để đặt hàng và thanh toán
2. **Bảo mật**: PayPal giả lập an toàn, không cần thông tin thật
3. **Trải nghiệm**: Giao diện giống PayPal thật
4. **Kiểm soát**: Admin có thể quản lý việc chuyển tiền
5. **Minh bạch**: Tất cả giao dịch được theo dõi

## Cách sử dụng

### Cho Buyer:
1. Thêm sản phẩm vào giỏ hàng
2. Vào trang Checkout
3. Chọn địa chỉ giao hàng
4. Áp dụng mã giảm giá (nếu có)
5. Click "Place Order & Pay with PayPal"
6. Thanh toán trong popup PayPal
7. Nhận email xác nhận

### Cho Seller:
- Không thay đổi gì, vẫn xử lý đơn hàng như bình thường
- Sẽ nhận được email khi admin chuyển tiền

### Cho Admin:
1. Vào "Payment Management"
2. Xem đơn hàng đã shipped
3. Click "Release Payment" cho từng seller
4. Hoặc "Refund" nếu cần hoàn tiền

## Lưu ý quan trọng

1. **PayPal Simulation**: Đây là PayPal giả lập, không phải PayPal thật
2. **Popup Window**: PayPal mở trong popup, cần cho phép popup
3. **Email Notifications**: Tự động gửi email khi thanh toán thành công
4. **Error Handling**: Có xử lý lỗi đầy đủ cho các trường hợp
5. **Security**: Tất cả API đều yêu cầu authentication

## Testing

### Test Cases:
1. ✅ Đặt hàng thành công với PayPal
2. ✅ Hủy thanh toán PayPal
3. ✅ Seller ship hàng
4. ✅ Admin chuyển tiền cho seller
5. ✅ Admin hoàn tiền cho buyer
6. ✅ Email notifications
7. ✅ Error handling

### Test Data:
- Order ID: Auto-generated
- Payment ID: `PAYPAL_${timestamp}_${random}`
- Amount: Từ order total
- Status: Tự động cập nhật theo luồng


