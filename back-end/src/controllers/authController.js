const { User } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { sendEmail } = require("../services/emailService");
const crypto = require("crypto"); // để tạo OTP ngẫu nhiên
const passport = require("passport");

// Hàm kiểm tra định dạng email
const validateEmail = (email) => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

// Hàm tạo mật khẩu ngẫu nhiên
const generatePassword = () => {
  const length = 8;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// ------------------ REGISTER ------------------
exports.register = async (req, res) => {
  try {
    const { username, fullname, email, password } = req.body;

    if (!username || !email || !password) return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ success: false, message: "Email hoặc username đã tồn tại" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = new User({ username, fullname, email, password, otp, otpExpires });
    await user.save();

    await sendEmail(email, "Mã OTP đăng ký", `Mã OTP của bạn là: ${otp}. Hết hạn trong 10 phút.`);

    res.status(201).json({ success: true, message: "Đăng ký thành công. Vui lòng kiểm tra email để nhập OTP", email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ------------------ VERIFY OTP ------------------
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email và OTP là bắt buộc" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    if (user.isVerified) return res.status(400).json({ success: false, message: "Tài khoản đã được xác thực" });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: "OTP không đúng" });
    if (user.otpExpires < new Date()) return res.status(400).json({ success: false, message: "OTP đã hết hạn" });

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({ success: true, message: "Đăng ký thành công. Bạn có thể đăng nhập." });
  } catch (error) {
    console.error("Lỗi xác thực OTP:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ------------------ RESEND OTP ------------------
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email là bắt buộc" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    if (user.isVerified) return res.status(400).json({ success: false, message: "Tài khoản đã được xác thực" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Gửi email OTP
    await sendEmail(user.email, "Resend OTP", `Mã OTP mới của bạn là: ${otp}. Hết hạn trong 10 phút.`);

    return res.status(200).json({ success: true, message: "OTP mới đã được gửi tới email của bạn" });
  } catch (error) {
    console.error("Lỗi resend OTP:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};



// ------------------ LOGIN ------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Email hoặc mật khẩu không đúng" });
    if (!user.isVerified) return res.status(400).json({ success: false, message: "Vui lòng xác thực email trước khi đăng nhập" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Email hoặc mật khẩu không đúng" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ success: true, token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    logger.error("Lỗi đăng nhập:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ------------------ LOGIN BY GOOGLE ------------------
exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;
    console.log("Google user:", user); // Thêm dòng này
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    console.log("Google token:", token); // Thêm dòng này
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Google login failed" });
  }
};

// ------------------ FORGOT PASSWORD ------------------
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email là bắt buộc" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: user._id }, { password: hashedPassword });

    await sendEmail(user.email, "Mật khẩu mới của bạn", `Mật khẩu mới của bạn là: ${newPassword}`);
    res.json({ success: true, message: "Mật khẩu mới đã được gửi tới email của bạn" });
  } catch (error) {
    logger.error("Lỗi forgotPassword:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ------------------ CHANGE ROLE ------------------
exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.user.id;

    if (!role) return res.status(400).json({ success: false, message: "Vai trò mới là bắt buộc" });
    if (!["buyer", "seller"].includes(role)) return res.status(400).json({ success: false, message: "Vai trò không hợp lệ" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    user.role = role;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ success: true, message: `Vai trò đã được cập nhật thành ${role}`, token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    logger.error("Lỗi thay đổi vai trò:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ------------------ GET PROFILE ------------------
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Error getting user profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ------------------ UPDATE PROFILE ------------------
exports.updateProfile = async (req, res) => {
  try {
    const { fullname, email, avatarURL } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (email && email !== user.email) {
      if (!validateEmail(email)) return res.status(400).json({ success: false, message: "Invalid email format" });
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) return res.status(400).json({ success: false, message: "Email already in use" });
      user.email = email;
    }

    if (fullname) user.fullname = fullname;
    if (avatarURL) user.avatarURL = avatarURL;

    await user.save();
    const updatedUser = await User.findById(req.user.id).select("-password");

    res.json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (error) {
    logger.error("Error updating user profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ------------------ UPDATE PASSWORD ------------------
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: "Current and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    logger.error("Error updating password:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
