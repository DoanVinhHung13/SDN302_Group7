const express = require("express");
const adminRouter = require("./admin");
const sellerRouter = require("./seller");
const router = express.Router();
const authController = require("../controllers/authController");
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const categoryController = require('../controllers/categoryController');
const buyerRouter = require("./buyerRouter");
const chatRouter = require("./chatRouter");
const userController = require("../controllers/userController");
const imageRoutes = require("../routes/imageRoutes");
const { authMiddleware } = require("../middleware/auth.middleware");
const passport = require("passport");

router.use("/admin", adminRouter);
router.use("/seller", sellerRouter);

// Routes cho đăng ký và xác thực email
router.post("/register", authController.register); // Đăng ký
router.post("/verify-otp", authController.verifyOTP);
router.post("/resend-otp", authController.resendOTP);     // (Tuỳ chọn) Gửi lại OTP nếu hết hạn

// Routes đăng nhập và quên mật khẩu
router.post("/login", authController.login);  

// Google Login
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google Callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  authController.googleCallback 
);


router.post("/forgot-password", authController.forgotPassword); // Quên mật khẩu

// User profile routes
router.get("/profile", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, authController.updateProfile);
router.put("/profile/password", authMiddleware, authController.updatePassword);

// User search routes
router.get("/users/search", authMiddleware, userController.searchUsers);
router.get("/users/:id", authMiddleware, userController.getUserById);

router.use("/buyers", buyerRouter);
router.use("/chat", chatRouter);
router.use("/images", authMiddleware, imageRoutes);
router.get('/products', productController.listAllProducts);
router.get('/categories', categoryController.listAllCategories);
// Public route for product reviews
router.get('/products/:productId/reviews', reviewController.getProductReviews);

// Protected route for product details with all related information
router.get('/products/:productId/detail', authMiddleware, productController.getProductDetail);

module.exports = router;