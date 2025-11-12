import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPaperPlane, FaRobot, FaUser, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Xin chào! Tôi là trợ lý AI của Shopii. Tôi có thể giúp gì cho bạn? 😊',
            timestamp: new Date(),
        },
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9999';

    // Lấy token từ Redux store nếu có
    const authState = useSelector((state) => state.auth);
    const token = authState?.token || null;

    // Câu hỏi đề xuất
    const suggestedQuestions = [
        'Giỏ hàng của tôi có những gì?',
        'Xem danh mục các sản phẩm yêu thích',
        'Hướng dẫn đặt hàng',
        'Chính sách đổi trả hàng',
    ];

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date(),
        };

        // Add user message immediately
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Gửi token nếu có (để chatbot có thể lấy thông tin giỏ hàng/yêu thích)
            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await axios.post(
                `${API_BASE_URL}/api/chatbot/chat`,
                {
                    message: userMessage.content,
                    sessionId: sessionId,
                },
                { headers }
            );

            if (response.data.success) {
                const botMessage = {
                    role: 'assistant',
                    content: response.data.data.message,
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, botMessage]);

                // Save sessionId for next messages
                if (response.data.data.sessionId && !sessionId) {
                    setSessionId(response.data.data.sessionId);
                }
            } else {
                throw new Error(response.data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error sending message:', error);

            // Xử lý lỗi 429 (Rate Limit) và 503 (Service Unavailable) với thông báo đặc biệt
            if (error.response?.status === 429 || error.response?.status === 503) {
                const retryAfter = error.response?.data?.retryAfter || 30;
                toast.error(`Chatbot đang quá tải. Vui lòng đợi ${retryAfter} giây rồi thử lại.`, {
                    autoClose: 5000,
                });
            } else {
                toast.error(error.response?.data?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại sau.');
            }

            // Remove user message on error
            setMessages((prev) => prev.filter((msg, idx) => idx !== prev.length - 1));
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = async () => {
        if (sessionId) {
            try {
                await axios.post(`${API_BASE_URL}/api/chatbot/clear`, { sessionId });
            } catch (error) {
                console.error('Error clearing chat:', error);
            }
        }

        setMessages([
            {
                role: 'assistant',
                content: 'Xin chào! Tôi là trợ lý AI của Shopii. Tôi có thể giúp gì cho bạn? 😊',
                timestamp: new Date(),
            },
        ]);
        setSessionId(null);
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center group"
                    aria-label="Mở chatbot"
                >
                    <FaRobot className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-2 -right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-96 h-[650px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-slide-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <FaRobot className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Trợ lý AI Shopii</h3>
                                <p className="text-xs text-blue-100">Đang trực tuyến</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearChat}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                title="Xóa lịch sử chat"
                            >
                                <FaTrash className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                aria-label="Đóng chatbot"
                            >
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((message, index) => (
                            <div
                                key={`msg-${index}-${message.timestamp.getTime()}`}
                                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <FaRobot className="w-5 h-5 text-blue-600" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${message.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-200'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                        {message.content}
                                    </p>
                                    <p
                                        className={`text-xs mt-1 ${message.role === 'user'
                                            ? 'text-blue-100'
                                            : 'text-gray-500'
                                            }`}
                                    >
                                        {formatTime(message.timestamp)}
                                    </p>
                                </div>
                                {message.role === 'user' && (
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <FaUser className="w-5 h-5 text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <FaRobot className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm border border-gray-200">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggested Questions - Compact */}
                    <div className="px-3 pt-1.5 pb-1 bg-gray-50 border-t border-gray-200">
                        <div className="flex flex-wrap gap-1.5">
                            {suggestedQuestions.map((question, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        setInputMessage(question);
                                        inputRef.current?.focus();
                                    }}
                                    className="text-[10px] px-2 py-1 bg-white border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors text-gray-700 whitespace-nowrap"
                                    title={question}
                                >
                                    {question.length > 25 ? `${question.substring(0, 25)}...` : question}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Nhập câu hỏi của bạn..."
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!inputMessage.trim() || isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaPaperPlane className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 text-center">
                            Trợ lý AI có thể mắc lỗi. Vui lòng kiểm tra thông tin quan trọng.
                        </p>
                    </form>
                </div>
            )}

            <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
        </>
    );
};

export default Chatbot;

