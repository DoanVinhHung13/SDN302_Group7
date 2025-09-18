const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Tìm user theo googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // 2. Nếu chưa có googleId → kiểm tra email
          const email = profile.emails[0].value.toLowerCase();
          user = await User.findOne({ email });

          if (user) {
            // 2a. User đã tồn tại bằng email → liên kết Google
            user.googleId = profile.id;
            user.fullname = user.fullname || profile.displayName;
            user.avatarURL = user.avatarURL || profile.photos?.[0]?.value;
            await user.save();
          } else {
            // 2b. Chưa có email trong hệ thống → tạo user mới
            user = await User.create({
              googleId: profile.id,
              email,
              fullname: profile.displayName,
              avatarURL: profile.photos?.[0]?.value,
              role: "buyer", // mặc định buyer
              isVerified: true, // vì Google đã xác thực email
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
