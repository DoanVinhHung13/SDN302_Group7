# Hướng dẫn Setup Chatbot AI với Gemini

## 1. Cấu hình API Key và Model

Thêm Gemini API Key và Model vào file `.env` trong thư mục `back-end`:

```env
GEMINI_API_KEY=AIzaSyDRba3VudNEHBk8-TOzookMbEtyv3OglMg
```

**Lưu ý:** Model đã được cố định là `gemini-2.5-flash` trong code, không cần cấu hình `GEMINI_MODEL`.

**Model đang sử dụng:**
- `gemini-2.5-flash`: **2.5 Flash** - Model cố định, nhanh và toàn diện

**Lưu ý:** 
- API Key đã được hardcode trong code làm fallback, nhưng nên thêm vào `.env` để bảo mật tốt hơn.
- Model đã được cố định là `gemini-2.5-flash`, không có fallback.

## 2. Khởi động Server

```bash
cd back-end
npm start
```

## 3. Sử dụng Chatbot

- Chatbot sẽ xuất hiện dưới dạng floating button ở góc dưới bên phải màn hình
- Click vào button để mở cửa sổ chat
- Chatbot có thể trả lời các câu hỏi về:
  - Sản phẩm và tìm kiếm
  - Đơn hàng và thanh toán
  - Vận chuyển và đổi trả
  - Hướng dẫn sử dụng website
  - Chính sách bán hàng

## 4. Tính năng

- ✅ Chat real-time với AI
- ✅ Lưu lịch sử chat theo session
- ✅ UI đẹp và responsive
- ✅ Tự động scroll đến tin nhắn mới nhất
- ✅ Xóa lịch sử chat
- ✅ Loading indicator khi AI đang xử lý

## 5. API Endpoints

- `POST /api/chatbot/chat` - Gửi tin nhắn đến chatbot
- `POST /api/chatbot/clear` - Xóa lịch sử chat

## 6. Lưu ý

- Chatbot sử dụng model `gemini-2.5-flash` của Google - model mới nhất, nhanh và toàn diện
- Model đã được cố định trong code, không thể thay đổi qua biến môi trường
- Chatbot có khả năng tương tác xã giao, chào hỏi và trả lời các câu hỏi đơn giản
- Lịch sử chat được lưu trong memory (sẽ mất khi restart server)
- Để production, nên sử dụng Redis hoặc database để lưu lịch sử chat
- API Key nên được bảo mật và không commit lên Git

