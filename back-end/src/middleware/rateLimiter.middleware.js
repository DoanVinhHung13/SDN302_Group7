const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate limiter chung cho tất cả API routes
 * Giới hạn: 100 requests trong 15 phút
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // giới hạn 100 requests
    message: {
        success: false,
        message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            success: false,
            message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) // seconds until reset
        });
    }
});

/**
 * Rate limiter nghiêm ngặt cho authentication routes
 * Giới hạn: 5 requests trong 15 phút (chống brute force)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 5, // chỉ 5 lần thử trong 15 phút
    skipSuccessfulRequests: true, // không đếm các request thành công
    message: {
        success: false,
        message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            success: false,
            message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Rate limiter cho OTP verification
 * Giới hạn: 3 requests trong 10 phút (chống spam OTP)
 */
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 phút
    max: 3, // chỉ 3 lần gửi OTP trong 10 phút
    message: {
        success: false,
        message: 'Quá nhiều lần yêu cầu OTP, vui lòng thử lại sau 10 phút'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`OTP rate limit exceeded for IP: ${req.ip}, Email: ${req.body.email || 'N/A'}`);
        res.status(429).json({
            success: false,
            message: 'Quá nhiều lần yêu cầu OTP, vui lòng thử lại sau 10 phút',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Rate limiter cho password reset
 * Giới hạn: 3 requests trong 1 giờ (chống spam email)
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 3, // chỉ 3 lần reset password trong 1 giờ
    message: {
        success: false,
        message: 'Quá nhiều lần yêu cầu reset mật khẩu, vui lòng thử lại sau 1 giờ'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}, Email: ${req.body.email || 'N/A'}`);
        res.status(429).json({
            success: false,
            message: 'Quá nhiều lần yêu cầu reset mật khẩu, vui lòng thử lại sau 1 giờ',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Rate limiter cho tạo đơn hàng
 * Giới hạn: 10 requests trong 1 phút (chống spam orders)
 */
const orderLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 10, // 10 đơn hàng trong 1 phút
    message: {
        success: false,
        message: 'Quá nhiều đơn hàng được tạo, vui lòng thử lại sau 1 phút'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Order rate limit exceeded for IP: ${req.ip}, User: ${req.user?.id || 'N/A'}`);
        res.status(429).json({
            success: false,
            message: 'Quá nhiều đơn hàng được tạo, vui lòng thử lại sau 1 phút',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Rate limiter cho tạo review
 * Giới hạn: 5 reviews trong 1 phút (chống spam reviews)
 */
const reviewLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 5, // 5 reviews trong 1 phút
    message: {
        success: false,
        message: 'Quá nhiều reviews được tạo, vui lòng thử lại sau 1 phút'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Review rate limit exceeded for IP: ${req.ip}, User: ${req.user?.id || 'N/A'}`);
        res.status(429).json({
            success: false,
            message: 'Quá nhiều reviews được tạo, vui lòng thử lại sau 1 phút',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Rate limiter cho chatbot
 * Giới hạn: 20 requests trong 1 phút (chatbot có thể được dùng nhiều)
 */
const chatbotLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 20, // 20 messages trong 1 phút
    message: {
        success: false,
        message: 'Quá nhiều tin nhắn chatbot, vui lòng thử lại sau 1 phút'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Chatbot rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Quá nhiều tin nhắn chatbot, vui lòng thử lại sau 1 phút',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

module.exports = {
    generalLimiter,
    authLimiter,
    otpLimiter,
    passwordResetLimiter,
    orderLimiter,
    reviewLimiter,
    chatbotLimiter
};

