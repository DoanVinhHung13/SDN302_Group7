// front-end/src/pages/Watchlist.jsx

import React, { useState, useEffect, useCallback } from 'react'; 
// Đảm bảo đường dẫn import WatchlistService là đúng so với vị trí của file này (pages/)
import WatchlistService from '../../../services/api/WatchlistService'; 
import { MdOutlineClose } from "react-icons/md"; 
import { toast } from 'react-toastify'; 
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaEye } from "react-icons/fa"; 

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9999';

const Watchlist = () => {
    const [watchlistItems, setWatchlistItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Hàm xác định nguồn ảnh dựa trên dữ liệu BE
    const getProductImageSource = (image) => {
        if (!image) {
            return "https://via.placeholder.com/200?text=No+Image";
        }
        // KIỂM TRA: Nếu là URL tuyệt đối, dùng nó.
        if (image.startsWith('http://') || image.startsWith('https://')) {
            return image;
        }
        // Nếu là tên file cục bộ, dùng API_BASE_URL
        return `${API_BASE_URL}/uploads/${image}`;
    };

    // Hàm để tải danh sách yêu thích
    const fetchWatchlist = useCallback(async () => {
        try {
            const response = await WatchlistService.getWatchlist();
            setWatchlistItems(response.watchlist);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch watchlist:", err);
            setError("Lỗi khi tải danh sách yêu thích. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWatchlist();
    }, [fetchWatchlist]);

    // Hàm xóa sản phẩm khỏi Watchlist
    const handleRemoveFromWatchlist = async (productId) => {
        try {
            // Gọi API toggleWatchlist để xóa sản phẩm
            await WatchlistService.toggleWatchlist(productId);
            toast.success("Đã xóa sản phẩm khỏi danh sách yêu thích!");
            // Sau khi xóa thành công, tải lại danh sách
            fetchWatchlist(); 
        } catch (err) {
            console.error("Failed to remove from watchlist:", err);
            toast.error("Lỗi khi xóa sản phẩm. Vui lòng thử lại.");
        }
    };
    
    // Hàm xử lý lỗi ảnh
    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = "https://via.placeholder.com/200?text=No+Image";
    };


    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto py-10 text-center flex justify-center items-center h-[50vh]">
                <span className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mr-3"></span>
                Đang tải danh sách yêu thích...
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto py-10 text-red-600 text-center">
                {error}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-extrabold mb-6 text-gray-800 border-b-4 border-blue-500/50 pb-2 inline-block">
                Danh sách Yêu thích ({watchlistItems.length})
            </h1>

            {watchlistItems.length === 0 ? (
                <div className="text-gray-500 text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mt-8">
                    <p className="text-2xl font-semibold mb-2">Trái tim cô đơn...</p>
                    <p className="text-lg">Hãy duyệt qua các sản phẩm và thêm những món bạn thích!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                    {watchlistItems.map((product) => (
                        <div key={product._id} className="relative bg-white border border-gray-200 rounded-xl shadow-lg flex flex-col overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                            
                            {/* Nút xóa */}
                            <button 
                                onClick={() => handleRemoveFromWatchlist(product._id)}
                                className="absolute top-3 right-3 z-10 p-1 bg-white rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 shadow-md"
                                aria-label="Remove from watchlist"
                            >
                                <MdOutlineClose size={20} />
                            </button>

                            {/* Hình ảnh sản phẩm */}
                            <Link to={`/auth/product/${product._id}`} className="block">
                                <div className="w-full h-48 flex items-center justify-center overflow-hidden bg-gray-50 p-4">
                                    {product.image ? (
                                        <img 
                                            src={getProductImageSource(product.image)} 
                                            alt={product.title} 
                                            className="max-w-full max-h-full object-contain transition-transform duration-500 hover:scale-105" 
                                            onError={handleImageError}
                                        />
                                    ) : (
                                        <span className="text-gray-400">Không có ảnh</span>
                                    )}
                                </div>
                            </Link>

                            {/* Thông tin sản phẩm */}
                            <div className="p-4 flex flex-col flex-grow">
                                <Link to={`/auth/product/${product._id}`} className="hover:text-blue-600 transition-colors duration-200">
                                    <h2 className="text-lg font-semibold text-gray-800 line-clamp-2">{product.title}</h2>
                                </Link>
                                {/* Giả định sellerId đã được populate với trường username */}
                                <p className="text-gray-500 text-sm mt-1 mb-2">Bán bởi: {product.sellerId?.username || 'Chưa rõ'}</p> 

                                <div className="mt-auto flex justify-between items-center pt-2 border-t border-gray-100">
                                    <p className="text-red-600 text-xl font-extrabold">${product.price ? product.price.toFixed(2) : 'N/A'}</p>
                                    
                                    <div className="flex gap-2">
                                        <Link to={`/auth/product/${product._id}`}>
                                            <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="Xem chi tiết">
                                                <FaEye size={18} />
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Watchlist;