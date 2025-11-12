const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const Cart = require('../models/Cart');

// Khởi tạo Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDRba3VudNEHBk8-TOzookMbEtyv3OglMg';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Cố định sử dụng model 2.5 Flash
const MODEL_NAME = 'gemini-2.5-flash';
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// System prompt để chatbot hoạt động như một trợ lý bán hàng thân thiện
const SYSTEM_PROMPT = `Bạn là một trợ lý AI thông minh, thân thiện và nhiệt tình cho trang web thương mại điện tử "Shopii" (tương tự eBay).

NHIỆM VỤ CỦA BẠN:

1. TƯƠNG TÁC XÃ GIAO VÀ CHÀO HỎI:
   - Luôn chào hỏi người dùng một cách thân thiện và nhiệt tình
   - Trả lời các câu hỏi xã giao đơn giản như: "Xin chào", "Bạn khỏe không?", "Cảm ơn", "Tạm biệt"
   - Có thể hỏi thăm, trò chuyện nhẹ nhàng với người dùng
   - Sử dụng emoji phù hợp để tạo không khí thân thiện (nhưng không quá nhiều)

2. HỖ TRỢ MUA SẮM:
   - Trả lời câu hỏi về sản phẩm, đơn hàng, thanh toán, vận chuyển
   - Hướng dẫn người dùng sử dụng website
   - Hỗ trợ tìm kiếm sản phẩm
   - Giải đáp thắc mắc về chính sách bán hàng, đổi trả, bảo hành

3. XEM GIỎ HÀNG VÀ YÊU THÍCH:
   - Khi người dùng hỏi "Giỏ hàng của tôi có những gì", "Xem giỏ hàng", "Cart của tôi" → Bạn sẽ nhận được thông tin giỏ hàng từ hệ thống
   - Khi người dùng hỏi "Xem danh mục các sản phẩm yêu thích", "Sản phẩm yêu thích", "Wishlist" → Bạn sẽ nhận được thông tin sản phẩm yêu thích từ hệ thống
   - Hãy trình bày thông tin một cách rõ ràng, liệt kê từng sản phẩm với: tên sản phẩm, số lượng, giá tiền, và tổng tiền
   - Nếu giỏ hàng/yêu thích trống, hãy thông báo một cách thân thiện và đề xuất xem sản phẩm
   - Khi trình bày giỏ hàng, hãy format đẹp và dễ đọc, ví dụ:
     "Giỏ hàng của bạn có X sản phẩm:
     1. [Tên sản phẩm] - Số lượng: X - Giá: $X.XX - Thành tiền: $X.XX
     ...
     Tổng tiền: $X.XX"

4. PHONG CÁCH GIAO TIẾP:
   - Trả lời bằng tiếng Việt một cách tự nhiên, gần gũi như đang nói chuyện với bạn
   - Sử dụng ngôn ngữ thân thiện, không quá trang trọng
   - Trả lời ngắn gọn, rõ ràng và hữu ích
   - Có thể sử dụng một số từ ngữ thân mật như "bạn", "mình" một cách tự nhiên
   - QUAN TRỌNG: KHÔNG sử dụng markdown formatting như **, #, *, __, etc.
   - Chỉ sử dụng text thuần, xuống dòng tự nhiên, không dùng bold, italic, heading
   - Có thể sử dụng emoji một cách hợp lý để tạo không khí thân thiện
   - Khi liệt kê, sử dụng số thứ tự (1., 2., 3.) hoặc dấu gạch đầu dòng (-) thay vì markdown

4. XỬ LÝ TÌNH HUỐNG:
   - Nếu không biết câu trả lời, hãy thành thật và đề xuất liên hệ với bộ phận hỗ trợ
   - Luôn sẵn sàng giúp đỡ và tạo cảm giác tích cực cho người dùng

VÍ DỤ TƯƠNG TÁC:
- Người dùng: "Xin chào" → Bạn: "Xin chào! Mình là trợ lý AI của Shopii. Mình có thể giúp gì cho bạn hôm nay? 😊"
- Người dùng: "Bạn khỏe không?" → Bạn: "Mình khỏe, cảm ơn bạn! Bạn có cần mình giúp gì về mua sắm không?"
- Người dùng: "Cảm ơn" → Bạn: "Không có gì! Nếu bạn cần thêm gì, cứ hỏi mình nhé! 😊"

Hãy luôn tạo cảm giác thân thiện, nhiệt tình và hữu ích cho người dùng.`;

// Lưu trữ lịch sử chat theo session (có thể cải thiện bằng Redis sau)
const chatHistory = new Map();

const chatWithBot = async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.user?.id; // Lấy userId nếu có (từ auth middleware)

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập câu hỏi',
            });
        }

        // Tạo sessionId nếu chưa có
        const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // Lấy lịch sử chat của session này
        let history = chatHistory.get(currentSessionId) || [];

        // Giới hạn lịch sử để tránh quá dài (chỉ giữ 10 tin nhắn gần nhất)
        if (history.length > 10) {
            history = history.slice(-10);
        }

        // Kiểm tra nếu người dùng hỏi về giỏ hàng hoặc yêu thích
        const messageLower = message.toLowerCase();
        const isCartQuestion = messageLower.includes('giỏ hàng') || messageLower.includes('cart') ||
            messageLower.includes('giỏ hàng của tôi') || messageLower.includes('xem giỏ hàng');
        const isFavoriteQuestion = messageLower.includes('yêu thích') || messageLower.includes('favorite') ||
            messageLower.includes('wishlist') || messageLower.includes('danh mục các sản phẩm yêu thích');

        let additionalContext = '';

        // Lấy thông tin giỏ hàng nếu người dùng hỏi
        if (isCartQuestion && userId) {
            try {
                const cart = await Cart.findOne({ userId }).populate('items.productId');
                if (cart && cart.items && cart.items.length > 0) {
                    let cartInfo = '\n\nTHÔNG TIN GIỎ HÀNG:\n';
                    let total = 0;
                    for (let index = 0; index < cart.items.length; index++) {
                        const item = cart.items[index];
                        const product = item.productId;
                        const itemTotal = product.price * item.quantity;
                        total += itemTotal;
                        cartInfo += `${index + 1}. ${product.title || 'Sản phẩm'}\n`;
                        cartInfo += `   - Số lượng: ${item.quantity}\n`;
                        cartInfo += `   - Giá: $${product.price?.toFixed(2) || '0.00'}\n`;
                        cartInfo += `   - Thành tiền: $${itemTotal.toFixed(2)}\n\n`;
                    }
                    cartInfo += `TỔNG TIỀN GIỎ HÀNG: $${total.toFixed(2)}\n`;
                    additionalContext = cartInfo;
                } else {
                    additionalContext = '\n\nTHÔNG TIN GIỎ HÀNG: Giỏ hàng của bạn đang trống.\n';
                }
            } catch (error) {
                console.error('Error fetching cart:', error);
                additionalContext = '\n\nTHÔNG TIN GIỎ HÀNG: Không thể lấy thông tin giỏ hàng. Vui lòng đăng nhập để xem giỏ hàng.\n';
            }
        } else if (isCartQuestion && !userId) {
            additionalContext = '\n\nTHÔNG TIN GIỎ HÀNG: Bạn cần đăng nhập để xem giỏ hàng.\n';
        }

        // Lấy thông tin yêu thích nếu người dùng hỏi (hiện tại chưa có API, sẽ trả về thông báo)
        if (isFavoriteQuestion) {
            if (userId) {
                additionalContext += '\n\nTHÔNG TIN SẢN PHẨM YÊU THÍCH: Tính năng này đang được phát triển. Hiện tại bạn có thể xem sản phẩm yêu thích trên trang cá nhân.\n';
            } else {
                additionalContext += '\n\nTHÔNG TIN SẢN PHẨM YÊU THÍCH: Bạn cần đăng nhập để xem sản phẩm yêu thích.\n';
            }
        }

        // Tạo prompt với lịch sử và context bổ sung
        let prompt = SYSTEM_PROMPT + additionalContext + '\n\nLịch sử chat:\n';
        for (const msg of history) {
            prompt += `${msg.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${msg.content}\n`;
        }
        prompt += `\nNgười dùng: ${message}\nTrợ lý:`;

        // Gọi Gemini API với retry logic - ĐỢI kết quả trả về trước khi response
        let botMessage = null;
        let retryCount = 0;
        const maxRetries = 2;
        let apiSuccess = false;

        // Vòng lặp retry cho đến khi thành công hoặc hết số lần retry
        while (retryCount <= maxRetries && !apiSuccess) {
            try {
                console.log(`Đang gọi Gemini API... (lần thử ${retryCount + 1}/${maxRetries + 1})`);

                // ĐỢI Gemini API trả về kết quả
                const result = await model.generateContent(prompt);
                const response = result.response; // response là property, không phải Promise
                let rawMessage = response.text(); // Extract text từ response

                // Loại bỏ markdown formatting
                botMessage = rawMessage
                    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold** → bold
                    .replace(/\*(.*?)\*/g, '$1') // *italic* → italic
                    .replace(/__(.*?)__/g, '$1') // __bold__ → bold
                    .replace(/_(.*?)_/g, '$1') // _italic_ → italic
                    .replace(/^#{1,6}\s+/gm, '') // # Heading → Heading
                    .replace(/`(.*?)`/g, '$1') // `code` → code
                    .replace(/~~(.*?)~~/g, '$1') // ~~strikethrough~~ → strikethrough
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // [text](url) → text
                    .trim();

                // Kiểm tra botMessage có giá trị
                if (botMessage && botMessage.trim()) {
                    apiSuccess = true;
                    console.log('Gemini API trả về kết quả thành công');
                    break; // Thành công, thoát khỏi loop
                } else {
                    throw new Error('Gemini API trả về kết quả rỗng');
                }
            } catch (modelError) {
                const errorStatus = modelError?.status || modelError?.statusCode;
                const errorMessage = modelError?.message || String(modelError);

                console.error(`Lỗi Gemini API (lần thử ${retryCount + 1}):`, errorMessage);

                // Xử lý lỗi 503 (Service Unavailable - Model Overloaded) - đợi và retry
                if (errorStatus === 503 || errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('Service Unavailable')) {
                    // Đợi một chút trước khi retry (model đang quá tải)
                    const retryDelay = (retryCount + 1) * 2000; // 2s, 4s, 6s

                    if (retryCount < maxRetries) {
                        console.log(`Model đang quá tải (503), đợi ${retryDelay}ms rồi retry... (attempt ${retryCount + 1}/${maxRetries})`);
                        // ĐỢI trước khi retry
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        retryCount++;
                        continue;
                    } else {
                        // Đã retry hết, trả về lỗi thân thiện
                        console.log('Đã retry hết, trả về lỗi 503');
                        return res.status(503).json({
                            success: false,
                            message: 'Chatbot đang quá tải. Vui lòng thử lại sau vài giây.',
                            retryAfter: 30, // seconds
                        });
                    }
                }

                // Xử lý lỗi 429 (Rate Limit) - đợi và retry
                if (errorStatus === 429 || errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
                    // Parse retryDelay từ error (có thể là "42s" hoặc số)
                    let retryDelay = (retryCount + 1) * 2000; // Default: 2s, 4s, 6s
                    if (modelError?.errorDetails?.[2]?.retryDelay) {
                        const delayStr = modelError.errorDetails[2].retryDelay;
                        if (typeof delayStr === 'string' && delayStr.endsWith('s')) {
                            retryDelay = Number.parseInt(delayStr, 10) * 1000;
                        } else {
                            retryDelay = Number.parseInt(delayStr, 10) * 1000 || retryDelay;
                        }
                    }

                    if (retryCount < maxRetries) {
                        console.log(`Rate limit hit, đợi ${retryDelay}ms rồi retry... (attempt ${retryCount + 1}/${maxRetries})`);
                        // ĐỢI trước khi retry
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        retryCount++;
                        continue;
                    } else {
                        // Đã retry hết, trả về lỗi thân thiện
                        console.log('Đã retry hết, trả về lỗi 429');
                        return res.status(429).json({
                            success: false,
                            message: 'Chatbot đang quá tải. Vui lòng thử lại sau vài giây.',
                            retryAfter: 30, // seconds
                        });
                    }
                }

                // Nếu không phải lỗi 429, throw lỗi ngay
                // Không có fallback model vì đã cố định model 2.5 Flash
                if (retryCount >= maxRetries) {
                    throw modelError;
                }

                retryCount++;
            }
        }

        // Kiểm tra đảm bảo có botMessage trước khi response
        if (!apiSuccess || !botMessage || !botMessage.trim()) {
            console.error('Không nhận được kết quả từ Gemini API sau tất cả các lần thử');
            return res.status(500).json({
                success: false,
                message: 'Không thể nhận được phản hồi từ AI. Vui lòng thử lại sau.',
            });
        }

        // Lưu vào lịch sử
        history.push(
            { role: 'user', content: message },
            { role: 'assistant', content: botMessage }
        );
        chatHistory.set(currentSessionId, history);

        // Xóa lịch sử cũ (sau 1 giờ không hoạt động)
        setTimeout(() => {
            chatHistory.delete(currentSessionId);
        }, 3600000); // 1 giờ

        // CHỈ TRẢ VỀ RESPONSE SAU KHI ĐÃ CÓ botMessage
        console.log('Trả về kết quả cho người dùng');
        res.status(200).json({
            success: true,
            data: {
                message: botMessage,
                sessionId: currentSessionId,
            },
        });
    } catch (error) {
        console.error('Error in chatbot:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi xử lý câu hỏi. Vui lòng thử lại sau.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

// Xóa lịch sử chat
const clearChatHistory = (req, res) => {
    try {
        const { sessionId } = req.body;

        if (sessionId && chatHistory.has(sessionId)) {
            chatHistory.delete(sessionId);
        }

        res.status(200).json({
            success: true,
            message: 'Đã xóa lịch sử chat',
        });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi xóa lịch sử',
        });
    }
};

module.exports = {
    chatWithBot,
    clearChatHistory,
};

