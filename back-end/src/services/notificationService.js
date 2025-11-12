// backend/services/notificationService.js (ĐÃ SỬA LỖI ReferenceError)

const Notification = require('../models/Notification'); 
// 🌟 IMPORT HÀM EMIT MỚI 🌟
const { emitNotification } = require('./socketService');

/**
 * Hàm tạo và lưu một thông báo mới vào database.
 * @param {string|mongoose.Types.ObjectId} receiverId - ID người dùng nhận thông báo.
 * @param {string} content - Nội dung thông báo.
 * @param {string} type - Loại thông báo (Order, Promotion, etc.).
 * @param {string} link - Liên kết chuyển hướng.
 */
const createNotification = async (receiverId, content, type, link) => {
    try {
        if (!receiverId || !content) {
            console.warn("Lỗi tạo thông báo: Thiếu ID người nhận hoặc nội dung.");
            return;
        }

        const newNotification = new Notification({
            // Sửa lỗi Inconsistency: Gán cho trường 'user' trong Model
            user: receiverId, 
            content,
            type, 
            link,
            isRead: false
        });

        // 🌟 SỬA LỖI: Định nghĩa biến 'savedNotification' bằng kết quả của .save()
        const savedNotification = await newNotification.save(); 
        
        console.log(`[SUCCESS] Thông báo mới tạo cho User ${receiverId}: ${content}`);
        
        // 🌟 GỌI SOCKET: Sử dụng biến 'savedNotification' đã được định nghĩa
        emitNotification(receiverId, savedNotification);
        
        return savedNotification; // Trả về biến đã được định nghĩa

    } catch (error) {
        // 🚨 KHỐI CATCH ĐÃ SỬA: Log lỗi Mongoose chi tiết
        console.error("=========================================");
        console.error("LỖI KHI LƯU THÔNG BÁO (NOTIFICATION SERVICE CRASH):");
        
        if (error.name === 'ValidationError') {
            console.error("Mongoose Validation Error:", error.message);
            console.error("Chi tiết lỗi:", error.errors);
        } else {
            console.error("Lỗi Mongoose khác:", error);
        }
        console.error("=========================================");

        // Ném lỗi chung để Frontend hiển thị thông báo thất bại
        throw new Error("Failed to save notification to database.");
    }
};

module.exports = {
    createNotification
};