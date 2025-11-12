# Hướng dẫn Import Dữ liệu vào MongoDB

Script này sẽ tự động import tất cả dữ liệu từ thư mục `db/` vào MongoDB.

## Cách sử dụng:

### 1. Đảm bảo MongoDB đang chạy
- Khởi động MongoDB trên máy của bạn
- Hoặc đảm bảo kết nối MongoDB trong file `.env` là đúng

### 2. Chạy script import

```bash
cd back-end
npm run import-data
```

Script sẽ:
- ✅ Tự động kết nối đến MongoDB
- ✅ Đọc tất cả file JSON từ thư mục `db/`
- ✅ Chuyển đổi format MongoDB JSON sang format Mongoose
- ✅ Import dữ liệu vào các collection tương ứng
- ✅ Xóa dữ liệu cũ trước khi import (để tránh duplicate)

### 3. Kiểm tra kết quả

Sau khi chạy xong, bạn sẽ thấy thông báo:
```
✨ Data import completed!
```

Bây giờ bạn có thể chạy `npm start` và ứng dụng sẽ có đầy đủ dữ liệu!

## Lưu ý:

- Script sẽ **xóa toàn bộ dữ liệu cũ** trước khi import dữ liệu mới
- Nếu có lỗi duplicate key, một số document có thể đã tồn tại (không ảnh hưởng)
- Đảm bảo file `.env` có cấu hình `MONGO_URI` đúng

## Các collection được import:

1. users
2. categories
3. stores
4. products
5. inventories
6. addresses
7. carts
8. vouchers
9. coupons
10. orders
11. orderitems
12. payments
13. shippinginfos
14. reviews
15. returnrequests
16. disputes
17. conversations
18. bids
19. feedbacks
20. messages

