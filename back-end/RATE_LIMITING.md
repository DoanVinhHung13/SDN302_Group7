# Rate Limiting Documentation

## Tổng quan

Hệ thống đã được triển khai rate limiting để bảo vệ API khỏi các cuộc tấn công DDoS, brute force và spam requests. Rate limiting được áp dụng ở nhiều mức độ khác nhau tùy theo tính chất của từng endpoint.

## Các mức độ Rate Limiting

### 1. General Rate Limiter (Chung cho tất cả API)
- **Giới hạn**: 100 requests trong 15 phút
- **Áp dụng**: Tất cả routes dưới `/api`
- **Mục đích**: Bảo vệ tổng thể hệ thống khỏi spam requests

### 2. Auth Rate Limiter (Nghiêm ngặt cho Authentication)
- **Giới hạn**: 5 requests trong 15 phút
- **Áp dụng**: 
  - `/api/login`
  - `/api/register`
- **Đặc điểm**: Bỏ qua các request thành công (không đếm khi login/register thành công)
- **Mục đích**: Chống brute force attack

### 3. OTP Rate Limiter (Cho OTP verification)
- **Giới hạn**: 3 requests trong 10 phút
- **Áp dụng**:
  - `/api/verify-otp`
  - `/api/resend-otp`
- **Mục đích**: Chống spam OTP, giảm chi phí gửi email

### 4. Password Reset Limiter (Cho reset mật khẩu)
- **Giới hạn**: 3 requests trong 1 giờ
- **Áp dụng**: `/api/forgot-password`
- **Mục đích**: Chống spam email reset password

### 5. Order Rate Limiter (Cho tạo đơn hàng)
- **Giới hạn**: 10 requests trong 1 phút
- **Áp dụng**:
  - `/api/buyers/orders` (POST)
  - `/api/buyers/orders/paypal` (POST)
- **Mục đích**: Chống spam orders, đảm bảo tính hợp lệ của đơn hàng

### 6. Review Rate Limiter (Cho tạo review)
- **Giới hạn**: 5 requests trong 1 phút
- **Áp dụng**: `/api/buyers/reviews` (POST)
- **Mục đích**: Chống spam reviews

### 7. Chatbot Rate Limiter (Cho chatbot)
- **Giới hạn**: 20 requests trong 1 phút
- **Áp dụng**:
  - `/api/chatbot/chat`
  - `/api/chatbot/clear`
- **Mục đích**: Giới hạn sử dụng chatbot để tránh tốn tài nguyên AI

## Response khi vượt quá giới hạn

Khi vượt quá giới hạn rate limit, API sẽ trả về:

```json
{
  "success": false,
  "message": "Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút",
  "retryAfter": 900
}
```

- **Status Code**: 429 (Too Many Requests)
- **retryAfter**: Số giây còn lại cho đến khi có thể request lại

## Headers trả về

Rate limiting middleware tự động thêm các headers sau:

- `RateLimit-Limit`: Giới hạn số requests
- `RateLimit-Remaining`: Số requests còn lại
- `RateLimit-Reset`: Thời gian reset (Unix timestamp)

## Logging

Tất cả các trường hợp vượt quá rate limit đều được log vào hệ thống logger với thông tin:
- IP address
- Path được request
- User ID (nếu có)
- Email (nếu có, cho các route auth)

## Cách test Rate Limiting

### Test với curl:

```bash
# Test general limiter (100 requests trong 15 phút)
for i in {1..101}; do
  curl -X GET http://localhost:5000/api/products
done

# Test auth limiter (5 requests trong 15 phút)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### Test với Postman:

1. Tạo một Collection với nhiều requests
2. Chạy Collection với số lượng lớn requests
3. Quan sát response 429 sau khi vượt quá giới hạn

## Tùy chỉnh Rate Limiting

Để thay đổi giới hạn, chỉnh sửa file `back-end/src/middleware/rateLimiter.middleware.js`:

```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Thay đổi thời gian window
  max: 100, // Thay đổi số lượng requests tối đa
  // ...
});
```

## Lưu ý

1. **Payment Callbacks**: Các routes callback từ payment gateways (VietQR, PayOS, PayPal) không áp dụng rate limiting vì chúng được gọi từ bên ngoài.

2. **IP-based**: Rate limiting dựa trên IP address, không phải user ID. Điều này có nghĩa là nhiều users cùng IP sẽ chia sẻ cùng một giới hạn.

3. **Production**: Trong môi trường production với nhiều server instances, nên sử dụng Redis store để chia sẻ rate limit state giữa các servers:

```javascript
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const generalLimiter = rateLimit({
  store: new RedisStore({
    client: client
  }),
  // ... other options
});
```

## Kết luận

Rate limiting đã được triển khai thành công và bảo vệ hệ thống khỏi các cuộc tấn công phổ biến. Các giới hạn có thể được điều chỉnh linh hoạt tùy theo nhu cầu thực tế của hệ thống.

