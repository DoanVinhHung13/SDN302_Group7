const Voucher = require('../models/Voucher');

// @desc    Create a new voucher
// @route   POST /api/vouchers
// @access  Private/Admin
const createVoucher = async (req, res, next) => {
  try {
    const { code, discount, expirationDate, minOrderValue, usageLimit, maxDiscount } = req.body;

    const voucher = new Voucher({
      code,
      discount,
      expirationDate,
      minOrderValue,
      usageLimit,
      maxDiscount,
    });

    const createdVoucher = await voucher.save();
    res.status(201).json(createdVoucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all vouchers
// @route   GET /api/vouchers
// @access  Private/Admin
const getVouchers = async (req, res, next) => {
  try {
    const vouchers = await Voucher.find({});
    res.json(vouchers);
  } catch (error) {
    next(error);
  }
};

// @desc    Get voucher by ID
// @route   GET /api/vouchers/:id
// @access  Private/Admin
const getVoucherById = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (voucher) {
      res.json(voucher);
    } else {
      res.status(404).json({ message: 'Voucher not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update a voucher
// @route   PUT /api/vouchers/:id
// @access  Private/Admin
const updateVoucher = async (req, res, next) => {
  try {
    const { code, discount, expirationDate, minOrderValue, usageLimit, maxDiscount, isActive } = req.body;

    const voucher = await Voucher.findById(req.params.id);

    if (voucher) {
      voucher.code = code || voucher.code;
      voucher.discount = discount || voucher.discount;
      voucher.expirationDate = expirationDate || voucher.expirationDate;
      voucher.minOrderValue = minOrderValue || voucher.minOrderValue;
      voucher.usageLimit = usageLimit || voucher.usageLimit;
      voucher.maxDiscount = maxDiscount || voucher.maxDiscount;
      voucher.isActive = isActive !== undefined ? isActive : voucher.isActive;

      const updatedVoucher = await voucher.save();
      res.json(updatedVoucher);
    } else {
      res.status(404).json({ message: 'Voucher not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a voucher
// @route   DELETE /api/vouchers/:id
// @access  Private/Admin
const deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (voucher) {
      await voucher.remove();
      res.json({ message: 'Voucher removed' });
    } else {
      res.status(404).json({ message: 'Voucher not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle voucher active status
// @route   PUT /api/vouchers/:id/toggle-active
// @access  Private/Admin
const toggleVoucherActive = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (voucher) {
      voucher.isActive = !voucher.isActive;
      const updatedVoucher = await voucher.save();
      res.json(updatedVoucher);
    } else {
      res.status(404).json({ message: 'Voucher not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Tìm kiếm và validate voucher theo mã code
// @route   GET /api/vouchers/code/:code
// @access  Private (Buyer/Seller)
const getVoucherByCode = async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const userId = req.user.id;
    const { orderValue, productIds } = req.query;

    // Tìm voucher và populate các trường cần thiết
    const voucher = await Voucher.findOne({ code })
      .populate('applicableProducts', 'title price')
      .populate('applicableCategories', 'name')
      .populate('applicableStores', 'name');

    if (!voucher) {
      return res.status(404).json({ 
        success: false,
        message: 'Mã giảm giá không tồn tại',
        code: 'VOUCHER_NOT_FOUND'
      });
    }

    // Nếu có thông tin đơn hàng, validate chi tiết
    if (orderValue && productIds) {
      const products = productIds.split(',').map(id => ({ _id: id }));
      const validation = voucher.isValidForUser(userId, products, parseFloat(orderValue));
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
          code: 'VOUCHER_INVALID',
          voucher: {
            code: voucher.code,
            title: voucher.title,
            description: voucher.description,
            discountType: voucher.discountType,
            discount: voucher.discount,
            maxDiscount: voucher.maxDiscount,
            minOrderValue: voucher.minOrderValue
          }
        });
      }

      // Tính toán discount amount
      const discountAmount = voucher.calculateDiscount(parseFloat(orderValue));
      
      return res.json({
        success: true,
        message: 'Mã giảm giá hợp lệ',
        voucher: {
          _id: voucher._id,
          code: voucher.code,
          title: voucher.title,
          description: voucher.description,
          discountType: voucher.discountType,
          discount: voucher.discount,
          maxDiscount: voucher.maxDiscount,
          minOrderValue: voucher.minOrderValue,
          discountAmount,
          remainingUsage: voucher.usageLimit - voucher.usedCount,
          expirationDate: voucher.expirationDate
        }
      });
    }

    // Trả về thông tin cơ bản nếu không có thông tin đơn hàng
    res.json({
      success: true,
      message: 'Tìm thấy mã giảm giá',
      voucher: {
        _id: voucher._id,
        code: voucher.code,
        title: voucher.title,
        description: voucher.description,
        discountType: voucher.discountType,
        discount: voucher.discount,
        maxDiscount: voucher.maxDiscount,
        minOrderValue: voucher.minOrderValue,
        remainingUsage: voucher.usageLimit - voucher.usedCount,
        expirationDate: voucher.expirationDate,
        isActive: voucher.isActive
      }
    });

  } catch (error) {
    console.error('Error in getVoucherByCode:', error);
    next(error);
  }
};

// @desc    Lấy danh sách voucher công khai cho user
// @route   GET /api/vouchers/public
// @access  Public
const getPublicVouchers = async (req, res, next) => {
  try {
    const now = new Date();
    const { category, store, limit = 10, page = 1 } = req.query;
    
    let query = {
      isActive: true,
      isPublic: true,
      startDate: { $lte: now },
      expirationDate: { $gt: now },
      usedCount: { $lt: '$usageLimit' }
    };

    // Filter by category
    if (category) {
      query.applicableCategories = category;
    }

    // Filter by store
    if (store) {
      query.applicableStores = store;
    }

    const vouchers = await Voucher.find(query)
      .populate('applicableCategories', 'name')
      .populate('applicableStores', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('code title description discountType discount maxDiscount minOrderValue expirationDate remainingUsage');

    const total = await Voucher.countDocuments(query);

    res.json({
      success: true,
      vouchers: vouchers.map(v => ({
        ...v.toObject(),
        remainingUsage: v.usageLimit - v.usedCount
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error in getPublicVouchers:', error);
    next(error);
  }
};

// @desc    Apply voucher to order (sử dụng voucher)
// @route   POST /api/vouchers/apply
// @access  Private
const applyVoucher = async (req, res, next) => {
  try {
    const { code, orderId, orderValue, productIds, shippingFee = 0 } = req.body;
    const userId = req.user.id;

    const voucher = await Voucher.findOne({ code: code.toUpperCase() });
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Mã giảm giá không tồn tại'
      });
    }

    // Validate voucher
    const products = productIds.map(id => ({ _id: id }));
    const validation = voucher.isValidForUser(userId, products, orderValue);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Calculate discount
    const discountAmount = voucher.calculateDiscount(orderValue, shippingFee);

    // Update voucher usage
    voucher.usedCount += 1;
    voucher.usageHistory.push({
      userId,
      orderId,
      discountAmount,
      usedAt: new Date()
    });

    await voucher.save();

    res.json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công',
      discountAmount,
      voucher: {
        code: voucher.code,
        title: voucher.title,
        discountType: voucher.discountType
      }
    });

  } catch (error) {
    console.error('Error in applyVoucher:', error);
    next(error);
  }
};


module.exports = {
  createVoucher,
  getVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  toggleVoucherActive,
  getVoucherByCode,
  getPublicVouchers,
  applyVoucher
};