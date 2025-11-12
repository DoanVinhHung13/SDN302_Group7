const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, Message, Conversation } = require('../models');
const logger = require('../utils/logger');

// Map to store online users: { userId: socketId }
const onlineUsers = new Map();

// Biến toàn cục để giữ instance io
let ioInstance;

// Hàm export để truy cập io từ Controller khác
const getIo = () => ioInstance;

// Hàm gửi thông báo đến một user cụ thể (dùng trong notificationService.js)
const emitNotification = (userId, notificationData) => {
    if (ioInstance) {
        const socketId = onlineUsers.get(userId.toString());
        
        if (socketId) {
            ioInstance.to(socketId).emit('newNotification', notificationData);
            // 🌟 SỬ DỤNG console.info THAY CHO logger.info 🌟
            console.info(`[SOCKET] Thông báo Real-time gửi đến User: ${userId}`); 
            return true;
        } else {
            // 🌟 SỬ DỤNG console.warn THAY CHO logger.warn 🌟
            console.warn(`[SOCKET] User ${userId} không online hoặc chưa kết nối.`);
            return false;
        }
    }
};

// Initialize Socket.IO server
const initSocketServer = (server) => {
    const io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // 🌟 LƯU INSTANCE IO 🌟
    ioInstance = io;

    // Authentication middleware for Socket.IO
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Authentication error: Token not provided'));
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Quan trọng: Đảm bảo ID được lưu dưới dạng chuỗi
            socket.user = { id: decoded.id.toString(), ...decoded }; 
            next();
        } catch (error) {
            logger.error('Socket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        const userId = socket.user.id;
        logger.info(`User connected: ${userId}`);
        
        // Add user to online users map
        // 🌟 SỬ DỤNG USER ID DẠNG CHUỖI 🌟
        onlineUsers.set(userId, socket.id); 
        
        // Broadcast user online status
        io.emit('userStatus', { userId, status: 'online' });
        
        // ... (Các handlers khác: joinConversation, leaveConversation, sendMessage, markAsRead, typing)
        
        // Handle disconnect
        socket.on('disconnect', () => {
            logger.info(`User disconnected: ${userId}`);
            
            // Remove user from online users map
            onlineUsers.delete(userId);
            
            // Broadcast user offline status
            io.emit('userStatus', { userId, status: 'offline' });
        });
    });
    
    return io;
};

module.exports = { initSocketServer, getIo, emitNotification, onlineUsers };