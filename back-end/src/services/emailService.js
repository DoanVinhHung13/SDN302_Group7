// services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Debug environment variables (chỉ dùng khi phát triển, xóa trước production)
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '[REDACTED]' : 'undefined');

// Tạo transporter SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Cho phép self-signed certificate
  },
});

// Hàm gửi email
const sendEmail = async (to, subject, text, html = null) => {
  try {
    const mailOptions = {
      from: `"Tran Anh Blue" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html, // Nếu có HTML, sẽ dùng HTML body
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

module.exports = { sendEmail };
