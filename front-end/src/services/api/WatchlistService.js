// front-end/src/services/api/WatchlistService.js

import { api } from '../index'; // Axios instance đã được cấu hình

class WatchlistService {
    // Helper để lấy token
    getAuthHeaders() {
        // Dùng 'token' hoặc 'accessToken' tùy theo bạn lưu trong AuthenService
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    }

    async getWatchlist() {
        try {
            const response = await api.get('/buyers/watchlist', { 
                headers: this.getAuthHeaders() 
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async toggleWatchlist(productId) {
        try {
            // Dùng PUT cho hành động thay đổi trạng thái
            const response = await api.put(`/buyers/watchlist/toggle/${productId}`, null, { 
                headers: this.getAuthHeaders() 
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
}

export default new WatchlistService();