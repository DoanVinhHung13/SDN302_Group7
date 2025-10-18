const Product = require('../models/Product');
const Store = require('../models/Store');
const User = require('../models/User');
const Review = require('../models/Review');
const Inventory = require('../models/Inventory');

const listAllProducts = async (req, res) => {
  try {
    // --- Query params ---
    const {
      categories,
      search,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    // Base query
    const query = { isAuction: true };

    // Filter by category
    if (categories) {
      const categoryIds = categories.split(',');
      query.categoryId = { $in: categoryIds };
    }

    // Filter by search keyword
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sorting options
    let sortOptions = {};
    switch (sort) {
      case 'price_asc':
        sortOptions.price = 1;
        break;
      case 'price_desc':
        sortOptions.price = -1;
        break;
      case 'name_asc':
        sortOptions.title = 1;
        break;
      case 'name_desc':
        sortOptions.title = -1;
        break;
      default:
        sortOptions.createdAt = -1;
        break;
    }

    // Count total items
    const totalItems = await Product.countDocuments(query);
    const skip = (Number(page) - 1) * Number(limit);

    // Get products
    const products = await Product.find(query)
      .populate('categoryId')
      .populate('sellerId')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    // Get all stores to filter by status
    const stores = await Store.find({});
    const storeMap = {};
    stores.forEach(store => {
      storeMap[store.sellerId.toString()] = store;
    });

    // Get all reviews to calculate ratings
    const reviews = await Review.find({ parentId: null });

    // Create a map for product ratings
    const productRatings = {};
    reviews.forEach(review => {
      const productId = review.productId.toString();
      if (!productRatings[productId]) {
        productRatings[productId] = { totalRating: 0, count: 0 };
      }
      productRatings[productId].totalRating += review.rating || 0;
      productRatings[productId].count += 1;
    });

    // Filter out products from rejected stores and locked users
    const filteredProducts = products.filter(product => {
      if (product.sellerId && product.sellerId.action === 'lock') return false;

      const sellerIdStr = product.sellerId
        ? product.sellerId._id.toString()
        : null;
      if (
        sellerIdStr &&
        storeMap[sellerIdStr] &&
        storeMap[sellerIdStr].status === 'rejected'
      ) {
        return false;
      }
      return true;
    });

    // Add rating information to products
    const productsWithRatings = filteredProducts.map(product => {
      const productObj = product.toObject();
      const productId = productObj._id.toString();

      if (productRatings[productId]) {
        productObj.rating =
          productRatings[productId].totalRating /
          productRatings[productId].count;
        productObj.reviewCount = productRatings[productId].count;
      } else {
        productObj.rating = 0;
        productObj.reviewCount = 0;
      }

      return productObj;
    });

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.status(200).json({
      success: true,
      data: productsWithRatings,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const getProductDetail = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .populate('categoryId')
      .populate('sellerId');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const store = await Store.findOne({ sellerId: product.sellerId._id });
    const inventory = await Inventory.findOne({ productId });

    const reviews = await Review.find({ productId, parentId: null })
      .populate('reviewerId', 'username fullname avatarURL')
      .sort({ createdAt: -1 });

    const reviewIds = reviews.map(r => r._id);
    const replies = await Review.find({ parentId: { $in: reviewIds } }).populate(
      'reviewerId',
      'username fullname avatarURL'
    );

    const repliesMap = {};
    replies.forEach(reply => {
      if (!repliesMap[reply.parentId]) repliesMap[reply.parentId] = [];
      repliesMap[reply.parentId].push(reply);
    });

    const reviewsWithReplies = reviews.map(r => {
      const obj = r.toObject();
      obj.replies = repliesMap[r._id] || [];
      return obj;
    });

    let averageRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce(
        (sum, r) => sum + (r.rating || 0),
        0
      );
      averageRating = totalRating / reviews.length;
    }

    res.status(200).json({
      success: true,
      data: {
        product,
        store,
        inventory: inventory || { quantity: 0 },
        reviews: reviewsWithReplies,
        averageRating,
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  listAllProducts,
  getProductDetail,
};
