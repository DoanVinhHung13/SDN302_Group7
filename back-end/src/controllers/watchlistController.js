// controllers/watchlistController.js

const User = require('../models/User'); 
const Product = require('../models/Product'); 
const mongoose = require('mongoose');

// Hàm lấy Watchlist của người dùng hiện tại
const getWatchlist = async (req, res) => {
    try {
        const userId = req.user.id; 
        
        const user = await User.findById(userId)
            .select('watchlist')
            .populate('watchlist', 'title image price sellerId'); // Lấy chi tiết sản phẩm

        if (!user) {
            // Trường hợp User không tồn tại (Rất hiếm)
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ 
            success: true, 
            watchlist: user.watchlist 
        });

    } catch (error) {
        // Lỗi này xảy ra khi token hết hạn hoặc lỗi DB
        console.error('Error fetching watchlist:', error);
        res.status(500).json({ error: 'Internal server error. Failed to load watchlist.' });
    }
};

// Hàm thêm/Xóa sản phẩm vào Watchlist (SỬ DỤNG $addToSet và $pull)
const toggleWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        // 1. Kiểm tra tính hợp lệ của Product ID
        if (!mongoose.Types.ObjectId.isValid(productId)) {
             return res.status(400).json({ error: 'Invalid Product ID format.' });
        }
        
        const productObjectId = new mongoose.Types.ObjectId(productId);
        
        // 2. Lấy User và kiểm tra trạng thái
        // Sử dụng findByIdAndUpdate sau, nên ta chỉ cần lấy watchlist hiện tại để kiểm tra
        const user = await User.findById(userId).select('watchlist');
        
        // Kiểm tra xem sản phẩm có tồn tại không (Tuyệt đối cần thiết)
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // 3. So sánh các ObjectId trong mảng
        const isWatching = user.watchlist.some(id => id.equals(productObjectId));
        let message;
        let updateOperation;

        if (isWatching) {
            // HÀNH ĐỘNG XÓA: Sử dụng $pull
            updateOperation = { $pull: { watchlist: productObjectId } };
            message = 'Product removed from watchlist.';
        } else {
            // HÀNH ĐỘNG THÊM: Sử dụng $addToSet (để tránh ID bị thêm nhiều lần)
            updateOperation = { $addToSet: { watchlist: productObjectId } };
            message = 'Product added to watchlist.';
        }

        // 4. Cập nhật trực tiếp vào DB (Atomic Update)
        await User.findByIdAndUpdate(userId, updateOperation, { new: true, runValidators: true });

        res.status(200).json({ 
            success: true, 
            message, 
            isWatching: !isWatching // Trạng thái mới (ngược lại với trạng thái cũ)
        });

    } catch (error) {
        // Ghi log lỗi chi tiết để debug lỗi Mongoose/JSON DB
        console.error('Error toggling watchlist (Atomic Update Failed):', error);
        res.status(500).json({ error: 'Internal server error. Check logs for details.' });
    }
};

// 🌟 EXPORT CÁC HÀM 🌟
module.exports = {
    getWatchlist,
    toggleWatchlist
};