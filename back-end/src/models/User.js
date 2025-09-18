const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    googleId: { type: String, unique: true, sparse: true }, // OAuth

    username: {
      type: String,
      unique: true,
      sparse: true,
      required: function () {
        return !this.googleId; // bắt buộc nếu không có googleId
      },
      trim: true,
    },

    fullname: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // chuẩn hóa email
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId; // bắt buộc nếu không có googleId
      },
    },

    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },

    avatarURL: { type: String },

    action: { type: String, enum: ["lock", "unlock"], default: "unlock" },

    // OTP verification
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

// Mã hóa mật khẩu trước khi lưu (chỉ khi có password)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// So sánh mật khẩu khi đăng nhập
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false; // user google thì bỏ qua
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
