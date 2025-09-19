// paymentController.js
const axios = require('axios');
const crypto = require('crypto'); // Thêm để tính signature
const { Payment, Order, OrderItem } = require('../models');
const { updateOrderAfterPayment } = require('../services/paymentVerificationService');

/**
 * Tạo yêu cầu thanh toán mới
 */
const createPayment = async (req, res) => {
  try {
    const { orderId, method, replaceExisting } = req.body;
    const userId = req.user.id;

    // Kiểm tra phương thức thanh toán hợp lệ
    if (!['COD', 'VietQR', 'PayOS', 'PayPal'].includes(method)) {
      return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ.' });
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    if (order.buyerId.toString() !== userId) {
      return res.status(403).json({ message: 'Bạn không có quyền thanh toán cho đơn hàng này' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Đơn hàng không ở trạng thái có thể thanh toán' });
    }

    // Kiểm tra xem đã có payment chưa
    const existingPayment = await Payment.findOne({ orderId });
    
    // Nếu có bản ghi thanh toán cũ và có yêu cầu thay thế, xóa bản ghi cũ
    if (existingPayment) {
      if (replaceExisting) {
        console.log(`Replacing existing payment record for order ${orderId}`);
        await Payment.deleteOne({ _id: existingPayment._id });
      } else {
        return res.status(400).json({ message: 'Đơn hàng này đã có bản ghi thanh toán' });
      }
    }

    // Tạo payment mới
    const payment = new Payment({
      orderId,
      userId,
      amount: order.totalPrice,
      method,
      status: 'pending',
    });

    if (method === 'COD') {
      await payment.save();
      return res.status(201).json({
        message: 'Đã tạo yêu cầu thanh toán COD thành công',
        payment,
      });
    } else if (method === 'VietQR') {
      await payment.save();

      try {
        // Check required environment variables
        if (!process.env.BANK_ACCOUNT_NO || !process.env.BANK_ACCOUNT_NAME || 
            !process.env.BANK_ACQ_ID || !process.env.VIETQR_CLIENT_ID || 
            !process.env.VIETQR_API_KEY) {
          console.error('Thiếu cấu hình VietQR. Vui lòng kiểm tra các biến môi trường BANK_* và VIETQR_*');
          payment.status = 'failed';
          await payment.save();
          return res.status(500).json({ message: 'Lỗi cấu hình cổng thanh toán VietQR.' });
        }

        const vietQR_API_URL = 'https://api.vietqr.io/v2/generate';
        
        // Sử dụng BASE_URL từ biến môi trường hoặc mặc định từ request
        const BASE_URL = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        console.log('Using BASE_URL for callbacks:', BASE_URL);
        
        const callbackUrl = `${BASE_URL}/api/buyers/payments/vietqr/callback`;
        console.log('Callback URL:', callbackUrl);

        // Chuyển đổi giá trị sang số nguyên VND (không có dấu thập phân)
        const amountInVnd = Math.round(order.totalPrice);
        
        // Log giá trị gửi đi
        console.log('Sending to VietQR API - Amount:', amountInVnd, 'Original:', order.totalPrice);

        // Save transaction reference for easier lookup
        payment.transactionId = orderId.toString();
        await payment.save();

        const response = await axios.post(vietQR_API_URL, {
          accountNo: process.env.BANK_ACCOUNT_NO,
          accountName: process.env.BANK_ACCOUNT_NAME,
          acqId: parseInt(process.env.BANK_ACQ_ID),
          amount: amountInVnd,
          addInfo: orderId,
          format: 'text',
          template: 'compact',
          callbackUrl, // Đăng ký callback URL
        }, {
          headers: {
            'x-client-id': process.env.VIETQR_CLIENT_ID,
            'x-api-key': process.env.VIETQR_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        const responseData = response.data;
        console.log('VietQR API response:', JSON.stringify(responseData, null, 2));

        if (responseData.code !== '00') {
          console.error('Lỗi khi tạo mã QR từ VietQR API:', responseData.desc);
          payment.status = 'failed';
          await payment.save();
          return res.status(500).json({ message: 'Không thể tạo mã thanh toán QR.', details: responseData.desc });
        }

        // Validate the QR data contains the necessary information
        if (!responseData.data || !responseData.data.qrDataURL) {
          console.error('VietQR API response missing QR data:', responseData);
          payment.status = 'failed';
          await payment.save();
          return res.status(500).json({ message: 'Dữ liệu QR không hợp lệ từ VietQR API.' });
        }

        return res.status(201).json({
          message: 'Đã tạo yêu cầu thanh toán VietQR thành công',
          payment,
          qrData: responseData.data
        });
      } catch (apiError) {
        console.error('Lỗi gọi API VietQR:', apiError.response ? apiError.response.data : apiError.message);
        payment.status = 'failed';
        await payment.save();
        return res.status(502).json({ message: 'Lỗi giao tiếp với cổng thanh toán VietQR.' });
      }
    } else if (method === 'PayOS') {
      await payment.save();

      try {
        // Kiểm tra các environment variables cần thiết cho PayOS
        if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
          console.error('Thiếu cấu hình PayOS. Vui lòng kiểm tra các biến môi trường PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY');
          payment.status = 'failed';
          await payment.save();
          return res.status(500).json({ message: 'Lỗi cấu hình cổng thanh toán PayOS.' });
        }

        const PAYOS_API_URL = 'https://api-merchant.payos.vn/v2/payment-requests'; // URL API chính thức của PayOS
        
        // Sử dụng BASE_URL từ biến môi trường hoặc mặc định từ request
        const BASE_URL = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        console.log('Using BASE_URL for callbacks:', BASE_URL);
        
        const returnUrl = `${BASE_URL}/api/buyers/payments/payos/callback`;
        const cancelUrl = `${BASE_URL}/api/buyers/payments/payos/cancel`;
        
        console.log('Return URL:', returnUrl);
        console.log('Cancel URL:', cancelUrl);

        // Tạo orderCode là số nguyên dương
        const numericOrderCode = Date.now(); // Sử dụng timestamp là số nguyên dương
        
        // Giới hạn description tối đa 25 ký tự
        const shortDescription = `Thanh toán #${numericOrderCode % 10000}`; // Rút gọn mô tả
        
        // Chuyển đổi giá trị sang số nguyên VND (không có dấu thập phân)
        const amountInVnd = Math.round(order.totalPrice);
        console.log('Sending to PayOS API - Amount:', amountInVnd, 'Original:', order.totalPrice);
        
        // Tính signature theo tài liệu PayOS với dữ liệu mới
        const rawSignature = `amount=${amountInVnd}&cancelUrl=${cancelUrl}&description=${shortDescription}&orderCode=${numericOrderCode}&returnUrl=${returnUrl}`;
        const signature = crypto.createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY)
          .update(rawSignature)
          .digest('hex');

        const paymentData = {
          orderCode: numericOrderCode, // Sử dụng mã số thay vì chuỗi
          amount: amountInVnd,
          description: shortDescription, // Sử dụng mô tả đã rút gọn
          returnUrl,
          cancelUrl,
          signature,
        };

        // Lưu orderCode vào payment để có thể tra cứu sau này
        payment.transactionId = numericOrderCode.toString();
        await payment.save();
        
        console.log('PayOS payment data:', JSON.stringify(paymentData, null, 2));

        const response = await axios.post(PAYOS_API_URL, paymentData, {
          headers: {
            'x-client-id': process.env.PAYOS_CLIENT_ID,
            'x-api-key': process.env.PAYOS_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        const responseData = response.data;
        console.log('PayOS API response:', JSON.stringify(responseData, null, 2));

        if (responseData.code !== '00') {
          console.error('Lỗi khi tạo thanh toán PayOS:', responseData.desc);
          payment.status = 'failed';
          await payment.save();
          return res.status(500).json({ message: 'Không thể tạo thanh toán PayOS.', details: responseData.desc });
        }

        // Validate that checkoutUrl is present
        if (!responseData.data || !responseData.data.checkoutUrl) {
          console.error('PayOS API response missing checkout URL:', responseData);
          payment.status = 'failed';
          await payment.save();
          return res.status(500).json({ message: 'Dữ liệu không hợp lệ từ PayOS API.' });
        }

        return res.status(201).json({
          message: 'Đã tạo yêu cầu thanh toán PayOS thành công',
          payment,
          paymentUrl: responseData.data.checkoutUrl // Trả về URL thanh toán PayOS
        });
      } catch (apiError) {
        console.error('Lỗi gọi API PayOS:', apiError.response ? apiError.response.data : apiError.message);
        payment.status = 'failed';
        await payment.save();
        return res.status(502).json({ message: 'Lỗi giao tiếp với cổng thanh toán PayOS.' });
      }
    } else if (method === 'PayPal') {
      await payment.save();

      try {
        // PayPal giả lập - tạo payment URL giả
        const paypalPaymentId = `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Lưu transactionId cho PayPal
        payment.transactionId = paypalPaymentId;
        await payment.save();

        // Tạo URL thanh toán PayPal giả lập
        const BASE_URL = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const paypalUrl = `${BASE_URL}/api/buyers/payments/paypal/simulate?paymentId=${paypalPaymentId}&orderId=${orderId}&amount=${order.totalPrice}`;

        return res.status(201).json({
          message: 'Đã tạo yêu cầu thanh toán PayPal thành công',
          payment,
          paymentUrl: paypalUrl,
          paypalPaymentId: paypalPaymentId
        });
      } catch (apiError) {
        console.error('Lỗi tạo thanh toán PayPal:', apiError);
        payment.status = 'failed';
        await payment.save();
        return res.status(500).json({ message: 'Lỗi tạo thanh toán PayPal.' });
      }
    }
  } catch (error) {
    console.error('Lỗi tạo thanh toán:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Nhận callback từ VietQR và cập nhật trạng thái thanh toán
 */
const vietQRCallback = async (req, res) => {
  try {
    console.log('VietQR callback received with body:', req.body);
    console.log('VietQR callback received with params:', req.query);
    
    const { orderId, status, transactionId } = req.body;

    if (!orderId) {
      console.error('Missing orderId in VietQR callback');
      return res.status(400).json({ message: 'Missing orderId parameter' });
    }

    // Tìm payment theo orderId hoặc transactionId
    let payment;
    
    console.log('Looking for payment with orderId:', orderId);
    payment = await Payment.findOne({ orderId });
    
    // Nếu không tìm thấy bằng orderId và có transactionId, thử tìm bằng transactionId
    if (!payment && transactionId) {
      console.log('Payment not found by orderId, trying with transactionId:', transactionId);
      payment = await Payment.findOne({ transactionId: transactionId.toString() });
    }
    
    if (!payment) {
      console.error('Không tìm thấy thanh toán cho orderId:', orderId);
      // Thử tìm tất cả các thanh toán gần đây để debug
      const recentPayments = await Payment.find().sort({ createdAt: -1 }).limit(5);
      console.log('Recent payments:', JSON.stringify(recentPayments, null, 2));
      return res.status(404).json({ message: 'Không tìm thấy thanh toán' });
    }
    
    console.log('Payment found:', payment._id, 'Current status:', payment.status);

    // Cập nhật trạng thái thanh toán
    if (status === 'SUCCESS') {
      // Kiểm tra xem payment đã được cập nhật thành paid chưa
      if (payment.status === 'paid') {
        console.log(`Payment ${payment._id} already marked as paid, skipping payment update`);
        
        // Kiểm tra và cập nhật trạng thái đơn hàng nếu cần
        const order = await Order.findById(payment.orderId);
        if (order && order.status === 'pending') {
          console.log(`Order still pending despite paid payment, forcing update for orderId: ${payment.orderId}`);
          try {
            order.status = 'processing';
            await order.save();
            console.log(`Order status forcefully updated to: ${order.status}`);
            
            // Cập nhật order items
            const orderItems = await OrderItem.find({ 
              orderId: payment.orderId,
              status: "pending"
            });
            for (const item of orderItems) {
              item.status = "shipping";
              await item.save();
            }
            console.log(`Updated ${orderItems.length} order items to shipping`);
          } catch (orderError) {
            console.error(`Failed to update order status: ${orderError.message}`);
          }
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Payment already processed successfully',
          paymentStatus: payment.status
        });
      }
      
      payment.status = 'paid';
      payment.paidAt = new Date();
      if (transactionId) {
        payment.transactionId = transactionId;
      }
      await payment.save();
      
      // Cập nhật đơn hàng
      try {
        await updateOrderAfterPayment(payment.orderId);
        console.log('Order updated successfully for orderId:', payment.orderId);
        
        // Kiểm tra lại trạng thái đơn hàng sau khi cập nhật
        const order = await Order.findById(payment.orderId);
        if (order && order.status === 'pending') {
          console.log(`Warning: Order status still pending after update attempt. Forcing update for orderId: ${payment.orderId}`);
          order.status = 'processing';
          await order.save();
          console.log(`Order status forcefully updated to: ${order.status}`);
        }
      } catch (orderError) {
        console.error('Error updating order:', orderError);
      }
      
      console.log(`Cập nhật trạng thái thanh toán thành công cho orderId: ${orderId}, status: ${payment.status}`);
    } else {
      payment.status = 'failed';
      await payment.save();
      console.log(`Cập nhật trạng thái thanh toán thất bại cho orderId: ${orderId}, status: ${payment.status}`);
    }

    return res.status(200).json({ 
      success: true,
      message: 'Cập nhật trạng thái thanh toán thành công',
      paymentStatus: payment.status
    });
  } catch (error) {
    console.error('Lỗi xử lý callback VietQR:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi xử lý callback' 
    });
  }
};

/**
 * Nhận callback từ PayOS và cập nhật trạng thái thanh toán
 */
const payosCallback = async (req, res) => {
  try {
    console.log('PayOS callback received with params:', req.query);
    console.log('PayOS callback received with body:', req.body);
    
    const { orderCode, status } = req.query;

    if (!orderCode) {
      console.error('Missing orderCode in PayOS callback');
      return res.status(400).json({ message: 'Missing orderCode parameter' });
    }

    console.log('Looking for payment with transactionId:', orderCode);
    
    // Tìm payment theo transactionId (orderCode)
    let payment = await Payment.findOne({ transactionId: orderCode.toString() });
    
    // Nếu không tìm thấy bằng transactionId, thử tìm bằng orderId
    if (!payment) {
      console.log('Payment not found by transactionId, trying with orderId');
      payment = await Payment.findOne({ orderId: orderCode });
    }
    
    if (!payment) {
      console.error('Không tìm thấy thanh toán cho orderCode:', orderCode);
      // Thử tìm tất cả các thanh toán gần đây để debug
      const recentPayments = await Payment.find().sort({ createdAt: -1 }).limit(5);
      console.log('Recent payments:', JSON.stringify(recentPayments, null, 2));
      return res.status(404).json({ message: 'Không tìm thấy thanh toán' });
    }

    console.log('Payment found:', payment._id, 'Current status:', payment.status);

    // Cập nhật trạng thái thanh toán - hỗ trợ nhiều kiểu status khác nhau từ PayOS
    if (status === 'PAID' || status === 'SUCCESS' || status === '00') {
      // Kiểm tra xem payment đã được cập nhật thành paid chưa
      if (payment.status === 'paid') {
        console.log(`Payment ${payment._id} already marked as paid, skipping payment update`);
        
        // Kiểm tra và cập nhật trạng thái đơn hàng nếu cần
        const order = await Order.findById(payment.orderId);
        if (order && order.status === 'pending') {
          console.log(`Order still pending despite paid payment, forcing update for orderId: ${payment.orderId}`);
          try {
            order.status = 'processing';
            await order.save();
            console.log(`Order status forcefully updated to: ${order.status}`);
            
            // Cập nhật order items
            const orderItems = await OrderItem.find({ 
              orderId: payment.orderId,
              status: "pending"
            });
            for (const item of orderItems) {
              item.status = "shipping";
              await item.save();
            }
            console.log(`Updated ${orderItems.length} order items to shipping`);
          } catch (orderError) {
            console.error(`Failed to update order status: ${orderError.message}`);
          }
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Payment already processed successfully',
          status: payment.status
        });
      }
      
      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save();
      

      
      console.log('Payment status updated to paid');
    } else {
      payment.status = 'failed';
      await payment.save();
      console.log('Payment status updated to failed');
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Payment status updated successfully',
      status: payment.status
    });
  } catch (error) {
    console.error('Error in PayOS callback:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PayPal giả lập - xử lý thanh toán
 */
const paypalSimulate = async (req, res) => {
  try {
    const { paymentId, orderId, amount } = req.query;
    
    if (!paymentId || !orderId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Tìm payment
    const payment = await Payment.findOne({ 
      transactionId: paymentId,
      orderId: orderId 
    });
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Trả về trang thanh toán PayPal giả lập
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>PayPal Payment Simulation</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .header { background: #0070ba; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { border: 1px solid #ddd; padding: 30px; border-radius: 0 0 8px 8px; }
            .amount { font-size: 24px; font-weight: bold; color: #0070ba; margin: 20px 0; }
            .button { background: #0070ba; color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin: 10px; }
            .button:hover { background: #005ea6; }
            .button.cancel { background: #6c757d; }
            .button.cancel:hover { background: #545b62; }
            .info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>PayPal</h1>
            <p>Complete your payment</p>
        </div>
        <div class="content">
            <h2>Payment Details</h2>
            <div class="info">
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Amount:</strong> <span class="amount">$${amount}</span></p>
            </div>
            
            <p>This is a simulated PayPal payment. Click "Pay Now" to complete the payment or "Cancel" to cancel.</p>
            
            <div style="text-align: center; margin-top: 30px;">
                <button class="button" onclick="completePayment()">Pay Now</button>
                <button class="button cancel" onclick="cancelPayment()">Cancel</button>
            </div>
        </div>
        
        <script>
            function completePayment() {
                // Gọi API để hoàn thành thanh toán
                fetch('/api/buyers/payments/paypal/complete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        paymentId: '${paymentId}',
                        orderId: '${orderId}',
                        status: 'success'
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Payment completed successfully!');
                        window.close();
                        // Thông báo cho parent window
                        if (window.opener) {
                            window.opener.postMessage({type: 'PAYPAL_SUCCESS', orderId: '${orderId}'}, '*');
                        }
                    } else {
                        alert('Payment failed: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Payment failed due to an error');
                });
            }
            
            function cancelPayment() {
                // Gọi API để hủy thanh toán
                fetch('/api/buyers/payments/paypal/complete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        paymentId: '${paymentId}',
                        orderId: '${orderId}',
                        status: 'cancelled'
                    })
                })
                .then(response => response.json())
                .then(data => {
                    alert('Payment cancelled');
                    window.close();
                    // Thông báo cho parent window
                    if (window.opener) {
                        window.opener.postMessage({type: 'PAYPAL_CANCELLED', orderId: '${orderId}'}, '*');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    window.close();
                });
            }
        </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error in PayPal simulation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PayPal giả lập - hoàn thành thanh toán
 */
const paypalComplete = async (req, res) => {
  try {
    const { paymentId, orderId, status } = req.body;
    
    if (!paymentId || !orderId || !status) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Tìm payment
    const payment = await Payment.findOne({ 
      transactionId: paymentId,
      orderId: orderId 
    });
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (status === 'success') {
      // Cập nhật payment thành paid
      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save();
      
      // Cập nhật đơn hàng
      try {
        await updateOrderAfterPayment(payment.orderId);
        console.log('Order updated successfully for PayPal payment:', payment.orderId);
        
        // Gửi email thông báo cho buyer
        const Order = require('../models/Order');
        const User = require('../models/User');
        const { sendEmail } = require('../utils/email');
        
        const order = await Order.findById(payment.orderId).populate('buyerId');
        if (order && order.buyerId && order.buyerId.email) {
          try {
            const emailSubject = 'Payment Successful - Order Confirmation';
            const emailText = `Dear ${order.buyerId.username},\n\nYour payment has been processed successfully!\nOrder ID: ${order._id}\nAmount: $${payment.amount}\n\nYour order is now being processed. Thank you for shopping with us!\n\nBest regards,\nShopii Team`;
            await sendEmail(order.buyerId.email, emailSubject, emailText);
            console.log('Payment confirmation email sent to:', order.buyerId.email);
          } catch (emailError) {
            console.error('Failed to send payment confirmation email:', emailError);
          }
        }
      } catch (orderError) {
        console.error('Error updating order:', orderError);
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Payment completed successfully',
        paymentStatus: payment.status
      });
    } else if (status === 'cancelled') {
      // Cập nhật payment thành failed
      payment.status = 'failed';
      await payment.save();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Payment cancelled',
        paymentStatus: payment.status
      });
    } else {
      return res.status(400).json({ message: 'Invalid status' });
    }
  } catch (error) {
    console.error('Error completing PayPal payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Kiểm tra trạng thái thanh toán của đơn hàng
 */
const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    console.log(`Checking payment status for orderId: ${orderId}, userId: ${userId}`);

    // Tìm thanh toán theo orderId
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      console.error(`Payment not found for orderId: ${orderId}`);
      return res.status(404).json({ message: 'Không tìm thấy thông tin thanh toán' });
    }

    // Kiểm tra quyền truy cập
    if (payment.userId.toString() !== userId) {
      console.error(`Access denied: payment.userId (${payment.userId}) doesn't match userId (${userId})`);
      return res.status(403).json({ message: 'Bạn không có quyền xem thông tin thanh toán này' });
    }

    console.log(`Payment found: ${payment._id}, method: ${payment.method}, status: ${payment.status}`);

    // Tìm đơn hàng để lấy thêm thông tin
    const order = await Order.findById(orderId);
    if (order) {
      console.log(`Order found: ${order._id}, status: ${order.status}`);
    } else {
      console.log(`Order not found for orderId: ${orderId}`);
    }

    // Tách biệt phần response từ logic xử lý
    return res.status(200).json({
      payment: {
        id: payment._id,
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        transactionId: payment.transactionId
      },
      order: order ? {
        id: order._id,
        status: order.status
      } : null
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái thanh toán:', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  createPayment,
  vietQRCallback,
  payosCallback,
  paypalSimulate,
  paypalComplete,
  checkPaymentStatus
};