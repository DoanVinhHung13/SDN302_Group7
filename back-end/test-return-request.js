const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:9999/api';
const TEST_USER_TOKEN = 'your_jwt_token_here';

const testReturnRequest = {
  orderItemId: '60d21b4667d0d8992e610c91', // Thay bằng ID thật
  reason: 'defective_product',
  description: 'Sản phẩm bị lỗi, không hoạt động đúng như mô tả',
  type: 'return',
  images: [
    {
      url: 'https://example.com/image1.jpg',
      publicId: 'test_image_1'
    }
  ]
};

async function testReturnRequestSystem() {
  console.log('🧪 Testing Return Request System...\n');
  
  try {
    // Test 1: Create return request
    console.log('1. Testing Create Return Request...');
    const createResponse = await axios.post(`${BASE_URL}/buyers/return-requests`, testReturnRequest, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.log('✅ Create return request:', createResponse.data.success ? 'Success' : 'Failed');
    
    const returnRequestId = createResponse.data.data?._id;
    
    // Test 2: Get user return requests
    console.log('\n2. Testing Get User Return Requests...');
    const listResponse = await axios.get(`${BASE_URL}/buyers/return-requests`, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.log('✅ Return requests count:', listResponse.data.data?.length || 0);
    
    // Test 3: Get return request detail
    if (returnRequestId) {
      console.log('\n3. Testing Get Return Request Detail...');
      const detailResponse = await axios.get(`${BASE_URL}/buyers/return-requests/${returnRequestId}`, {
        headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
      });
      console.log('✅ Return request detail:', detailResponse.data.success ? 'Success' : 'Failed');
      console.log('   Status:', detailResponse.data.data?.status);
      console.log('   Priority:', detailResponse.data.data?.priority);
    }
    
    console.log('\n🎉 Return Request System Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    console.log('Response status:', error.response?.status);
  }
}

async function testReturnRequestModel() {
  console.log('\n🧪 Testing Return Request Model Logic...\n');
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const { ReturnRequest } = require('./src/models');
    
    // Test priority calculation
    console.log('1. Testing Priority Calculation...');
    
    // Debug: Check if ReturnRequest is loaded correctly
    console.log('ReturnRequest type:', typeof ReturnRequest);
    console.log('ReturnRequest methods:', Object.getOwnPropertyNames(ReturnRequest.prototype));
    
    const returnRequest = new ReturnRequest({
      orderItemId: new mongoose.Types.ObjectId(),
      orderId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(),
      reason: 'defective_product',
      description: 'Test description',
      status: 'pending'
    });
    
    // Save first to get createdAt
    await returnRequest.save();
    
    // Debug: Check if method exists
    console.log('calculatePriority method exists:', typeof returnRequest.calculatePriority);
    
    if (typeof returnRequest.calculatePriority === 'function') {
      // Test high value order
      const highPriority = returnRequest.calculatePriority(1500000); // 1.5M VND
      console.log('✅ High value priority:', highPriority === 'high' ? 'PASS' : 'FAIL');
      
      // Test normal value order
      const normalPriority = returnRequest.calculatePriority(600000); // 600K VND
      console.log('✅ Normal value priority:', normalPriority === 'normal' ? 'PASS' : 'FAIL');
      
      // Test low value order
      const lowPriority = returnRequest.calculatePriority(300000); // 300K VND
      console.log('✅ Low value priority:', lowPriority === 'low' ? 'PASS' : 'FAIL');
    } else {
      console.log('❌ calculatePriority method not found');
      // Try direct import
      const ReturnRequestDirect = require('./src/models/ReturnRequest');
      const directInstance = new ReturnRequestDirect({
        orderItemId: new mongoose.Types.ObjectId(),
        orderId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        sellerId: new mongoose.Types.ObjectId(),
        reason: 'defective_product',
        description: 'Test description',
        status: 'pending'
      });
      await directInstance.save();
      
      if (typeof directInstance.calculatePriority === 'function') {
        console.log('✅ Direct import works - method found');
        const testPriority = directInstance.calculatePriority(1500000);
        console.log('✅ Priority test with direct import:', testPriority === 'high' ? 'PASS' : 'FAIL');
      } else {
        console.log('❌ Method still not found with direct import');
      }
    }
    
    console.log('\n2. Testing Timeline Auto-Update...');
    returnRequest.status = 'seller_approved';
    await returnRequest.save();
    
    console.log('✅ Timeline entries:', returnRequest.timeline.length > 0 ? 'PASS' : 'FAIL');
    console.log('   Latest status:', returnRequest.timeline[returnRequest.timeline.length - 1]?.status);
    
    await mongoose.disconnect();
    console.log('\n🎉 Return Request Model Test Completed!');
    
  } catch (error) {
    console.error('❌ Model test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting Return Request System Tests...\n');
  
  testReturnRequestModel()
    .then(() => {
      console.log('\n' + '='.repeat(50));
      console.log('💡 To test API endpoints:');
      console.log('1. Start your server: npm start');
      console.log('2. Create a test order with delivered status');
      console.log('3. Get orderItemId from the order');
      console.log('4. Update testReturnRequest.orderItemId in this file');
      console.log('5. Get a valid JWT token and update TEST_USER_TOKEN');
      console.log('6. Run: node test-return-request.js api');
    });
}

module.exports = { testReturnRequestSystem, testReturnRequestModel };