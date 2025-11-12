// front-end/src/services/api/NotificationService.js

import { api } from '../index'; 

class NotificationService {
    // Helper đã sửa đổi để ưu tiên 'accessToken' hoặc kiểm tra cả 'token'
    getAuthHeaders() {
        // Kiểm tra cả hai key để tăng khả năng tìm thấy token hợp lệ
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token'); 
        
        if (!token) {
            // Nếu không có token, ném lỗi để Component biết và không cố gắng gọi API
            throw new Error("Missing authentication token.");
        }
        
        return { Authorization: `Bearer ${token}` };
    }

    // Lấy danh sách thông báo
    async getNotifications() {
        try {
            const response = await api.get('/notifications', {
                // Đảm bảo getAuthHeaders được gọi ở đây
                headers: this.getAuthHeaders(), 
            });
            return response.data;
        } catch (error) {
            // Ghi log chi tiết hơn để dễ debug
            console.error("Lỗi khi lấy thông báo:", error.response?.status || error.message);
            throw error;
        }
    }

    // ... (Các hàm markOneAsRead và markAllAsRead giữ nguyên logic)
    async markOneAsRead(notificationId) {
        try {
            const response = await api.patch(`/notifications/mark-read/${notificationId}`, null, {
                headers: this.getAuthHeaders(),
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async markAllAsRead() {
        try {
            const response = await api.patch('/notifications/mark-all-read', null, {
                headers: this.getAuthHeaders(),
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
}

export default new NotificationService();