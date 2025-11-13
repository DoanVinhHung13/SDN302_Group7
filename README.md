# SDN302_Group7 - Hệ thống E-commerce

## 📋 Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
3. [Cài đặt thư viện](#cài-đặt-thư-viện)
4. [Cấu hình môi trường](#cấu-hình-môi-trường)
5. [Hướng dẫn chạy ứng dụng](#hướng-dẫn-chạy-ứng-dụng)
6. [Tài khoản test](#tài-khoản-test)
7. [Hướng dẫn chụp ảnh từng bước](#hướng-dẫn-chụp-ảnh-từng-bước)
8. [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## 🎯 Giới thiệu

Dự án E-commerce với các tính năng:
- Quản lý sản phẩm, đơn hàng, thanh toán
- Hệ thống đánh giá và review
- Chat real-time giữa buyer và seller
- Chatbot AI hỗ trợ khách hàng
- Thanh toán qua PayPal, VietQR, PayOS
- Quản lý voucher và giảm giá
- Hệ thống notification và watchlist
- Rate limiting bảo vệ API

---
![Uploading image.png…]()

## 💻 Yêu cầu hệ thống

### Phần mềm cần thiết:
- **Node.js**: phiên bản 16.x trở lên
- **npm**: phiên bản 8.x trở lên (hoặc yarn)
- **MongoDB**: phiên bản 5.x trở lên
- **Git**: để clone repository

### Kiểm tra phiên bản:
```bash
node --version
npm --version
mongod --version
git --version
```

---

## 📦 Cài đặt thư viện

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd SDN302_Group7
```

### Bước 2: Cài đặt Backend

```bash
cd back-end
npm install
```

**Các thư viện chính được cài đặt:**
- Express.js - Web framework
- Mongoose - MongoDB ODM
- Socket.io - Real-time communication
- Passport.js - Authentication
- Cloudinary - Image upload
- Express-rate-limit - Rate limiting
- @google/generative-ai - Gemini AI
- @paypal/checkout-server-sdk - PayPal integration
- Và nhiều thư viện khác...

### Bước 3: Cài đặt Frontend

```bash
cd ../front-end
npm install
```

**Các thư viện chính được cài đặt:**
- React 18.2.0 - UI framework
- Redux Toolkit - State management
- React Router - Routing
- Axios - HTTP client
- Material-UI & Ant Design - UI components
- Socket.io-client - Real-time communication
- Chart.js & Recharts - Data visualization
- Và nhiều thư viện khác...

---

## ⚙️ Cấu hình môi trường

### Backend (.env)

Tạo file `.env` trong thư mục `back-end/` với nội dung:

```env
# Server Configuration
PORT=9999
SERVER_URL=http://localhost:9999
CLIENT_URL=http://localhost:3000

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/shopii
# Hoặc MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/shopii?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary (Image Upload)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Gemini AI (Chatbot)
GEMINI_API_KEY=your_gemini_api_key

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox

# VietQR Configuration
BANK_ACCOUNT_NO=your_bank_account_number
BANK_ACCOUNT_NAME=your_bank_account_name
BANK_ACQ_ID=your_bank_acq_id
VIETQR_CLIENT_ID=your_vietqr_client_id
VIETQR_API_KEY=your_vietqr_api_key

# PayOS Configuration
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
```

### Frontend (.env)

Tạo file `.env` trong thư mục `front-end/` với nội dung:

```env
REACT_APP_API_URL=http://localhost:9999
```

### Hướng dẫn lấy các API Keys:

#### 1. MongoDB
- **Local**: Cài đặt MongoDB và chạy `mongod`
- **Atlas**: Đăng ký tại [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) và lấy connection string

#### 2. Google OAuth
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới
3. Enable Google+ API
4. Tạo OAuth 2.0 credentials
5. Thêm authorized redirect URI: `http://localhost:9999/api/auth/google/callback`

#### 3. Cloudinary
1. Đăng ký tại [Cloudinary](https://cloudinary.com/)
2. Vào Dashboard → Settings
3. Copy "Cloudinary URL" (format: `cloudinary://api_key:api_secret@cloud_name`)

#### 4. Gemini AI
1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Tạo API key mới
3. Copy API key vào `GEMINI_API_KEY`

#### 5. Gmail App Password (cho email OTP)
1. Vào Google Account → Security
2. Enable 2-Step Verification
3. Tạo App Password cho "Mail"
4. Sử dụng App Password (không phải mật khẩu Gmail thông thường)

#### 6. PayPal
1. Đăng ký tại [PayPal Developer](https://developer.paypal.com/)
2. Tạo Sandbox App
3. Lấy Client ID và Secret

#### 7. VietQR & PayOS
- Liên hệ với nhà cung cấp để lấy credentials

---

## 🚀 Hướng dẫn chạy ứng dụng

### Bước 1: Khởi động MongoDB

**Windows:**
```bash
# Nếu đã cài MongoDB service, nó sẽ tự động chạy
# Hoặc chạy thủ công:
mongod
```

**Mac/Linux:**
```bash
# Với Homebrew (Mac):
brew services start mongodb-community

# Hoặc chạy thủ công:
mongod
```

### Bước 2: Import dữ liệu mẫu (Tùy chọn)

```bash
cd back-end
npm run import-data
```

Lệnh này sẽ import các dữ liệu mẫu từ thư mục `db/` vào MongoDB.

### Bước 3: Khởi động Backend

```bash
cd back-end
npm start
```

Backend sẽ chạy tại: `http://localhost:9999`

**Kiểm tra:**
- Mở browser: `http://localhost:9999`
- Hoặc test API: `http://localhost:9999/api/products`

### Bước 4: Khởi động Frontend

Mở terminal mới:

```bash
cd front-end
npm start
```

Frontend sẽ tự động mở tại: `http://localhost:3000`

### Bước 5: Kiểm tra kết nối

1. Backend đang chạy → Console hiển thị: `Server is running at PORT 9999`
2. Frontend đang chạy → Browser tự động mở `http://localhost:3000`
3. Kiểm tra Network tab trong DevTools để xem API calls

---

## 👤 Tài khoản test

### ⚠️ LƯU Ý: Cần điền thông tin tài khoản test vào đây

Sau khi import dữ liệu mẫu, bạn có thể sử dụng các tài khoản sau:

#### Tài khoản Buyer
```
Email: chieupham1011@gmail.com
Password: 123456123456
```

**Hoặc tạo tài khoản mới:**
1. Truy cập `http://localhost:3000`
2. Click "Đăng ký"
3. Điền thông tin và tạo tài khoản mới

---

## 📸 Hướng dẫn chụp ảnh từng bước

### Bước 1: Cài đặt thư viện

**Chụp ảnh:**
1. Terminal hiển thị lệnh `npm install` trong thư mục `back-end`
2. Terminal hiển thị quá trình cài đặt packages
3. Terminal hiển thị "added X packages" khi hoàn thành

**Mô tả:** Chụp màn hình terminal khi đang cài đặt và sau khi hoàn thành.

### Bước 2: Cấu hình .env

**Chụp ảnh:**
1. File `.env` trong thư mục `back-end/` (ẩn các giá trị nhạy cảm)
2. File `.env` trong thư mục `front-end/`

**Mô tả:** Chụp màn hình các file `.env` (có thể blur các giá trị nhạy cảm như passwords, API keys).

### Bước 3: Khởi động MongoDB

**Chụp ảnh:**
1. Terminal chạy lệnh `mongod`
2. Console hiển thị "waiting for connections on port 27017"

**Mô tả:** Chụp màn hình terminal khi MongoDB đã khởi động thành công.

### Bước 4: Import dữ liệu

**Chụp ảnh:**
1. Terminal chạy `npm run import-data`
2. Console hiển thị "Importing collection: users..."
3. Console hiển thị "Import completed successfully"

**Mô tả:** Chụp màn hình quá trình import dữ liệu.

### Bước 5: Khởi động Backend

**Chụp ảnh:**
1. Terminal chạy `npm start` trong `back-end/`
2. Console hiển thị:
   - "Connecting to MongoDB..."
   - "MongoDB connected successfully"
   - "Server is running at PORT 9999"
   - "WebSocket server is running"

**Mô tả:** Chụp màn hình terminal khi backend đã khởi động thành công.

### Bước 6: Khởi động Frontend

**Chụp ảnh:**
1. Terminal chạy `npm start` trong `front-end/`
2. Browser tự động mở `http://localhost:3000`
3. Trang chủ hiển thị

**Mô tả:** Chụp màn hình browser khi frontend đã load xong.

### Bước 7: Đăng nhập

**Chụp ảnh:**
1. Trang đăng nhập
2. Điền email và password
3. Click "Đăng nhập"
4. Trang chủ sau khi đăng nhập thành công

**Mô tả:** Chụp màn hình các bước đăng nhập.

### Bước 8: Test các tính năng

**Chụp ảnh các tính năng chính:**
1. **Xem sản phẩm:** Danh sách sản phẩm, chi tiết sản phẩm
2. **Thêm vào giỏ hàng:** Thêm sản phẩm, xem giỏ hàng
3. **Đặt hàng:** Tạo đơn hàng, chọn phương thức thanh toán
4. **Chat:** Mở chat với seller, gửi tin nhắn
5. **Chatbot:** Mở chatbot, hỏi câu hỏi
6. **Review:** Viết review cho sản phẩm
7. **Admin Panel:** (Nếu là admin) Dashboard, quản lý đơn hàng

**Mô tả:** Chụp màn hình từng tính năng khi đang sử dụng.

### Bước 9: Kiểm tra API

**Chụp ảnh:**
1. Postman hoặc Browser DevTools → Network tab
2. Test API endpoint: `GET http://localhost:9999/api/products`
3. Response JSON hiển thị danh sách sản phẩm

**Mô tả:** Chụp màn hình kết quả API call.

---

## 📚 Tài liệu tham khảo

### Tài liệu trong dự án:
- [CHATBOT_SETUP.md](back-end/CHATBOT_SETUP.md) - Hướng dẫn setup Chatbot AI
- [RATE_LIMITING.md](back-end/RATE_LIMITING.md) - Tài liệu về Rate Limiting
- [PAYPAL_INTEGRATION_DOCUMENTATION.md](PAYPAL_INTEGRATION_DOCUMENTATION.md) - Tài liệu tích hợp PayPal
- [PAYMENT_FLOW_DOCUMENTATION.md](PAYMENT_FLOW_DOCUMENTATION.md) - Tài liệu luồng thanh toán
- [ORDER_SCHEMA_UPDATE_DOCUMENTATION.md](ORDER_SCHEMA_UPDATE_DOCUMENTATION.md) - Tài liệu cập nhật schema đơn hàng
- [ADMIN_ORDERS_UPDATE_DOCUMENTATION.md](ADMIN_ORDERS_UPDATE_DOCUMENTATION.md) - Tài liệu cập nhật admin orders

### Scripts hữu ích:
- `back-end/scripts/import-data.js` - Import dữ liệu mẫu
- `back-end/env-check.js` - Kiểm tra biến môi trường

---

## 🐛 Troubleshooting

### Lỗi thường gặp:

#### 1. MongoDB connection error
```
Error: MongoDB connection error
```
**Giải pháp:**
- Kiểm tra MongoDB đã chạy chưa: `mongod`
- Kiểm tra `MONGO_URI` trong `.env` có đúng không
- Kiểm tra firewall có chặn port 27017 không

#### 2. Port already in use
```
Error: listen EADDRINUSE: address already in use :::9999
```
**Giải pháp:**
- Tìm process đang dùng port: `netstat -ano | findstr :9999` (Windows) hoặc `lsof -i :9999` (Mac/Linux)
- Kill process hoặc đổi PORT trong `.env`

#### 3. Module not found
```
Error: Cannot find module 'xxx'
```
**Giải pháp:**
- Xóa `node_modules` và `package-lock.json`
- Chạy lại `npm install`

#### 4. CORS error
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Giải pháp:**
- Kiểm tra `CLIENT_URL` trong backend `.env` có đúng không
- Kiểm tra `REACT_APP_API_URL` trong frontend `.env`

#### 5. Email không gửi được
```
Error sending email
```
**Giải pháp:**
- Kiểm tra `EMAIL_USER` và `EMAIL_PASS` (phải dùng App Password, không phải mật khẩu Gmail)
- Enable "Less secure app access" hoặc tạo App Password

---

## 📝 Ghi chú

- **Development mode**: Backend sử dụng `nodemon` để tự động restart khi có thay đổi
- **Rate Limiting**: Hệ thống có rate limiting để bảo vệ API, xem chi tiết trong [RATE_LIMITING.md](back-end/RATE_LIMITING.md)
- **Database**: Dữ liệu được lưu trong MongoDB, có thể import dữ liệu mẫu từ thư mục `db/`
- **Images**: Hình ảnh được upload lên Cloudinary, cần cấu hình `CLOUDINARY_URL`

---

## 👥 Đóng góp

Dự án được phát triển bởi **SDN302_Group7**

---

## 📄 License

ISC

