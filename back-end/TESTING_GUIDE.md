# 🧪 Testing Guide - Updated Features

Hướng dẫn test các chức năng đã cập nhật: Voucher System, Return Request System, và Notification System.

## 📋 Chuẩn bị

### 1. Khởi động server
```bash
cd back-end
npm start
```

### 2. Chuẩn bị dữ liệu test
- Tạo tài khoản user và admin
- Tạo một số sản phẩm và đơn hàng
- Lấy JWT token từ việc đăng nhập

## 🎯 Test 1: Model Logic (Không cần server)

### Chạy test logic cơ bản:
```bash
node run-all-tests.js
```

**Kết quả mong đợi:**
- ✅ Voucher validation logic - PASSED
- ✅ Voucher discount calculation - PASSED  
- ✅ Return request priority system - PASSED
- ✅ Return request timeline tracking - PASSED
- ✅ Notification creation - PASSED
- ✅ Notification read/unread system - PASSED

## 🎯 Test 2: Voucher System

### Test từng chức năng:

#### 2.1 Test Voucher Validation
```bash
# Chạy test validation logic
node test-voucher-system.js
```

#### 2.2 Test API Endpoints

**Bước 1: Tạo voucher (Admin)**
```bash
POST /api/admin/vouchers
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "code": "TEST2024",
  "title": "Test Voucher 2024",
  "description": "Voucher test cho hệ thống",
  "discount": 10,
  "discountType": "percentage",
  "maxDiscount": 50000,
  "minOrderValue": 100000,
  "usageLimit": 100,
  "usageLimitPerUser": 1,
  "expirationDate": "2024-12-31T23:59:59.000Z",
  "isActive": true,
  "isPublic": true
}
```

**Bước 2: Lấy danh sách voucher công khai**
```bash
GET /api/vouchers/public?limit=10&page=1
```

**Bước 3: Validate voucher**
```bash
GET /api/buyers/vouchers/code/TEST2024?orderValue=150000&productIds=60d21b4667d0d8992e610c8d
Authorization: Bearer {user_token}
```

**Bước 4: Apply voucher**
```bash
POST /api/buyers/vouchers/apply
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "code": "TEST2024",
  "orderId": "60d21b4667d0d8992e610c90",
  "orderValue": 150000,
  "productIds": ["60d21b4667d0d8992e610c8d"]
}
```

### ✅ Kết quả mong đợi:
- Tạo voucher thành công
- Validate voucher trả về discount amount chính xác
- Apply voucher cập nhật usage count

## 🎯 Test 3: Return Request System

### Test từng chức năng:

#### 3.1 Test Model Logic
```bash
node test-return-request.js
```

#### 3.2 Test API Endpoints

**Bước 1: Tạo return request**
```bash
POST /api/buyers/return-requests
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "orderItemId": "60d21b4667d0d8992e610c91",
  "reason": "defective_product",
  "description": "Sản phẩm bị lỗi, không hoạt động đúng như mô tả",
  "type": "return",
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "publicId": "test_image_1"
    }
  ]
}
```

**Bước 2: Lấy danh sách return requests**
```bash
GET /api/buyers/return-requests
Authorization: Bearer {user_token}
```

**Bước 3: Xem chi tiết return request**
```bash
GET /api/buyers/return-requests/{return_request_id}
Authorization: Bearer {user_token}
```

### ✅ Kết quả mong đợi:
- Tạo return request thành công
- Priority được tính toán đúng
- Timeline được tạo tự động
- Notification được gửi cho seller

## 🎯 Test 4: Notification System

### Test từng chức năng:

#### 4.1 Test Service Logic
```bash
node test-notification-system.js
```

#### 4.2 Test API Endpoints

**Bước 1: Lấy danh sách notifications**
```bash
GET /api/buyers/notifications?page=1&limit=20
Authorization: Bearer {user_token}
```

**Bước 2: Lấy số lượng chưa đọc**
```bash
GET /api/buyers/notifications/unread-count
Authorization: Bearer {user_token}
```

**Bước 3: Đánh dấu đã đọc**
```bash
PUT /api/buyers/notifications/mark-read
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "notificationIds": ["notification_id_1", "notification_id_2"]
}
```

**Bước 4: Đánh dấu tất cả đã đọc**
```bash
PUT /api/buyers/notifications/mark-all-read
Authorization: Bearer {user_token}
```

### ✅ Kết quả mong đợi:
- Lấy notifications thành công
- Unread count chính xác
- Mark as read hoạt động đúng

## 🎯 Test 5: Socket.IO Realtime

### Test realtime notifications:

1. **Mở browser console** tại `http://localhost:3000`
2. **Connect to Socket.IO:**
```javascript
const socket = io('http://localhost:9999', {
  auth: {
    token: 'your_jwt_token_here'
  }
});

socket.on('new_notification', (notification) => {
  console.log('New notification:', notification);
});
```

3. **Trigger notification** bằng cách:
   - Tạo return request mới
   - Cập nhật trạng thái đơn hàng
   - Thanh toán đơn hàng

### ✅ Kết quả mong đợi:
- Socket connection thành công
- Nhận được notification realtime
- Notification hiển thị đúng format

## 🎯 Test 6: Integration Test

### Test workflow hoàn chỉnh:

1. **User tạo đơn hàng** với voucher
2. **Seller xác nhận** đơn hàng → Notification gửi cho buyer
3. **User tạo return request** → Notification gửi cho seller
4. **Seller phản hồi** return request → Notification gửi cho buyer

### ✅ Kết quả mong đợi:
- Tất cả notifications được tạo đúng thời điểm
- Socket.IO gửi realtime notifications
- Database được cập nhật chính xác

## 📊 Performance Test

### Test với dữ liệu lớn:

```bash
# Tạo 1000 notifications
for i in {1..1000}; do
  curl -X POST http://localhost:9999/api/test/create-notification \
    -H "Authorization: Bearer {token}" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test '${i}'","message":"Test message '${i}'"}'
done

# Test pagination
curl "http://localhost:9999/api/buyers/notifications?page=1&limit=50" \
  -H "Authorization: Bearer {token}"
```

## 🐛 Troubleshooting

### Lỗi thường gặp:

1. **"Voucher not found"**
   - Kiểm tra code voucher đã tạo chưa
   - Kiểm tra isActive = true

2. **"Return request validation failed"**
   - Kiểm tra orderItem thuộc về user
   - Kiểm tra đơn hàng đã delivered
   - Kiểm tra trong thời hạn 30 ngày

3. **"Socket connection failed"**
   - Kiểm tra JWT token hợp lệ
   - Kiểm tra CORS settings
   - Kiểm tra server đang chạy

4. **"Notification not received"**
   - Kiểm tra user đã join notification room
   - Kiểm tra global.io được set đúng
   - Kiểm tra NotificationService import đúng

## 📈 Metrics để theo dõi

- **Voucher usage rate**: Số lượt sử dụng / Tổng số voucher
- **Return request resolution time**: Thời gian xử lý trung bình
- **Notification delivery rate**: Tỷ lệ gửi thành công
- **Socket connection stability**: Số lượng disconnect/reconnect

---

**🎉 Chúc mừng! Bạn đã test thành công tất cả các chức năng mới.**