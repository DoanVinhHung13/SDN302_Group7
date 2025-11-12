// front-end/src/components/home/Header/NotificationDropdown.jsx
import React, { useState, useEffect, useRef } from 'react';
import NotificationService from '../../../services/api/NotificationService';
// Import hook điều hướng nếu bạn sử dụng react-router-dom
// import { useNavigate } from 'react-router-dom'; 

const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    // const navigate = useNavigate(); // Bỏ comment nếu sử dụng điều hướng
    const dropdownRef = useRef(null);

    // --- 1. Fetch Dữ liệu ---
    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            // Gọi API để lấy danh sách thông báo
            const data = await NotificationService.getNotifications();
            // Đảm bảo data.notifications là một mảng
            setNotifications(data.notifications || []); 
        } catch (error) {
            console.error("Lỗi khi lấy thông báo:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Thêm logic Real-time Socket.IO ở đây nếu cần (sau khi đã sửa lỗi Backend)

    useEffect(() => {
        // Tải thông báo khi component được render
        fetchNotifications();
    }, []);

    // --- 2. Xử lý UI ---
    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);


    // --- 3. Xử lý click thông báo ---
    const handleNotificationClick = async (notification) => {
        setIsOpen(false);
        if (!notification.isRead) {
            try {
                // Đánh dấu thông báo đã đọc trên server
                await NotificationService.markOneAsRead(notification._id);
                // Cập nhật trạng thái trong state (giảm độ trễ)
                setNotifications(prev => prev.map(n => 
                    n._id === notification._id ? { ...n, isRead: true } : n
                ));
            } catch (error) {
                console.error("Lỗi đánh dấu đã đọc:", error);
            }
        }
        
        // Điều hướng đến liên kết liên quan (bỏ comment nếu bạn muốn chuyển trang)
        // if (notification.link && notification.link !== '#') {
        //     navigate(notification.link); 
        // }
    };

    const markAllAsRead = async () => {
        try {
            await NotificationService.markAllAsRead();
            // Cập nhật tất cả thông báo trong state
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error("Lỗi đánh dấu tất cả đã đọc:", error);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Nút Chuông */}
            <button 
                className="px-2 py-1 relative rounded-full hover:bg-gray-100 transition duration-150"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-lg">🔔</span> 
                {unreadCount > 0 && (
                    <span 
                        // 🌟 SỬA ĐỔI: Giảm kích thước badge xuống h-3.5 w-3.5 và điều chỉnh top/right 🌟
                        className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-3.5 w-3.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full border-2 border-white"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                    <div className="flex justify-between items-center p-3 border-b">
                        <h3 className="text-base font-semibold text-gray-800">Thông báo</h3>
                        <button 
                            onClick={markAllAsRead} 
                            className="text-sm text-blue-500 hover:text-blue-700 disabled:opacity-50"
                            disabled={unreadCount === 0 || isLoading}
                        >
                            Đánh dấu tất cả đã đọc
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">Đang tải thông báo...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">Không có thông báo mới.</div>
                    ) : (
                        <ul className="max-h-96 overflow-y-auto">
                            {notifications.map((n) => (
                                <li 
                                    key={n._id} 
                                    className={`p-3 cursor-pointer border-b last:border-b-0 transition duration-150 
                                                ${n.isRead ? 'bg-white text-gray-500 hover:bg-gray-50' : 'bg-blue-50/50 text-gray-800 hover:bg-blue-100 font-medium'}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className="text-sm">{n.content}</div>
                                    <div className="text-xs mt-1 text-gray-400">
                                        {new Date(n.createdAt).toLocaleDateString('vi-VN')} - Loại: {n.type}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;