const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:9999/api';
const TEST_USER_TOKEN = 'your_jwt_token_here';

async function testNotificationSystem() {
  console.log('🧪 Testing Notification System...\n');
  
  try {
    // Test 1: Get notifications
    console.log('1. Testing Get Notifications...');
    const notificationsResponse = await axios.get(`${BASE_URL}/buyers/notifications?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.log('✅ Get notifications:', notificationsResponse.data.success ? 'Success' : 'Failed');
    console.log('   Total notifications:', notificationsResponse.data.notifications?.length || 0);
    console.log('   Unread count:', notificationsResponse.data.unreadCount || 0);
    
    // Test 2: Get unread count
    console.log('\n2. Testing Get Unread Count...');
    const unreadResponse = await axios.get(`${BASE_URL}/buyers/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.log('✅ Unread count:', unreadResponse.data.success ? 'Success' : 'Failed');
    console.log('   Count:', unreadResponse.data.unreadCount);
    
    // Test 3: Mark all as read
    console.log('\n3. Testing Mark All As Read...');
    const markAllResponse = await axios.put(`${BASE_URL}/buyers/notifications/mark-all-read`, {}, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.log('✅ Mark all as read:', markAllResponse.data.success ? 'Success' : 'Failed');
    console.log('   Modified count:', markAllResponse.data.modifiedCount);
    
    console.log('\n🎉 Notification System Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    console.log('Response status:', error.response?.status);
  }
}

async function testNotificationService() {
  console.log('\n🧪 Testing Notification Service Logic...\n');
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const NotificationService = require('./src/services/notificationService');
    const { Notification } = require('./src/models');
    
    const testUserId = new mongoose.Types.ObjectId();
    const testOrderId = new mongoose.Types.ObjectId();
    
    // Test 1: Order status notification
    console.log('1. Testing Order Status Notification...');
    await NotificationService.notifyOrderStatusChange(
      testUserId,
      testOrderId,
      'delivered',
      'ORD-12345'
    );
    
    const orderNotification = await Notification.findOne({
      userId: testUserId,
      type: 'order_status'
    });
    console.log('✅ Order notification:', orderNotification ? 'PASS' : 'FAIL');
    
    // Test 2: Payment success notification
    console.log('\n2. Testing Payment Success Notification...');
    await NotificationService.notifyPaymentSuccess(
      testUserId,
      testOrderId,
      500000,
      'ORD-12345'
    );
    
    const paymentNotification = await Notification.findOne({
      userId: testUserId,
      type: 'payment_success'
    });
    console.log('✅ Payment notification:', paymentNotification ? 'PASS' : 'FAIL');
    
    // Test 3: Voucher expiring notification
    console.log('\n3. Testing Voucher Expiring Notification...');
    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    await NotificationService.notifyVoucherExpiring(
      testUserId,
      'TESTVOUCHER',
      expirationDate
    );
    
    const voucherNotification = await Notification.findOne({
      userId: testUserId,
      type: 'voucher_expiring'
    });
    console.log('✅ Voucher notification:', voucherNotification ? 'PASS' : 'FAIL');
    
    // Test 4: Unread count
    console.log('\n4. Testing Unread Count...');
    const unreadCount = await Notification.getUnreadCount(testUserId);
    console.log('✅ Unread count calculation:', unreadCount >= 0 ? 'PASS' : 'FAIL');
    console.log('   Count:', unreadCount);
    
    // Test 5: Mark as read
    console.log('\n5. Testing Mark As Read...');
    const notificationIds = await Notification.find({ userId: testUserId }).distinct('_id');
    const markResult = await Notification.markAsRead(testUserId, notificationIds);
    console.log('✅ Mark as read:', markResult.modifiedCount > 0 ? 'PASS' : 'FAIL');
    
    // Cleanup test data
    await Notification.deleteMany({ userId: testUserId });
    console.log('✅ Cleanup completed');
    
    await mongoose.disconnect();
    console.log('\n🎉 Notification Service Test Completed!');
    
  } catch (error) {
    console.error('❌ Service test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting Notification System Tests...\n');
  
  testNotificationService()
    .then(() => {
      console.log('\n' + '='.repeat(50));
      console.log('💡 To test API endpoints:');
      console.log('1. Start your server: npm start');
      console.log('2. Login to get a valid JWT token');
      console.log('3. Update TEST_USER_TOKEN in this file');
      console.log('4. Run: node test-notification-system.js api');
    });
}

module.exports = { testNotificationSystem, testNotificationService };