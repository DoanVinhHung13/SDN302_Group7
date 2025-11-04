const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Test configuration
const BASE_URL = 'http://localhost:9999/api';
const TEST_USER_TOKEN = 'your_jwt_token_here'; // Thay bằng token thật

// Test data
const testVoucher = {
  code: 'TEST2024',
  title: 'Test Voucher 2024',
  description: 'Voucher test cho hệ thống',
  discount: 10,
  discountType: 'percentage',
  maxDiscount: 50000,
  minOrderValue: 100000,
  usageLimit: 100,
  usageLimitPerUser: 1,
  expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  isActive: true,
  isPublic: true
};

async function testVoucherSystem() {
  console.log('🧪 Testing Voucher System...\n');
  
  try {
    // Test 1: Create voucher (Admin only)
    console.log('1. Testing Create Voucher (Admin)...');
    const createResponse = await axios.post(`${BASE_URL}/admin/vouchers`, testVoucher, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.log('✅ Create voucher:', createResponse.data.code || 'Success');
    
    // Test 2: Get public vouchers
    console.log('\n2. Testing Get Public Vouchers...');
    const publicResponse = await axios.get(`${BASE_URL}/vouchers/public?limit=5`);
    console.log('✅ Public vouchers count:', publicResponse.data.vouchers?.length || 0);
    
    // Test 3: Validate voucher by code
    console.log('\n3. Testing Validate Voucher...');
    const validateResponse = await axios.get(
      `${BASE_URL}/buyers/vouchers/code/${testVoucher.code}?orderValue=150000&productIds=60d21b4667d0d8992e610c8d`,
      { headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` } }
    );
    console.log('✅ Voucher validation:', validateResponse.data.success ? 'Valid' : 'Invalid');
    console.log('   Discount amount:', validateResponse.data.voucher?.discountAmount || 0);
    
    // Test 4: Apply voucher
    console.log('\n4. Testing Apply Voucher...');
    const applyData = {
      code: testVoucher.code,
      orderId: '60d21b4667d0d8992e610c90',
      orderValue: 150000,
      productIds: ['60d21b4667d0d8992e610c8d']
    };
    
    const applyResponse = await axios.post(`${BASE_URL}/buyers/vouchers/apply`, applyData, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.log('✅ Apply voucher:', applyResponse.data.success ? 'Success' : 'Failed');
    
    console.log('\n🎉 Voucher System Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    console.log('Response status:', error.response?.status);
    console.log('Response data:', error.response?.data);
  }
}

async function testVoucherValidation() {
  console.log('\n🧪 Testing Voucher Validation Logic...\n');
  
  // Connect to MongoDB to test model methods
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const Voucher = require('./src/models/Voucher');
    
    // Create test voucher
    const voucher = new Voucher({
      code: 'TESTVALIDATION',
      title: 'Test Validation',
      description: 'Test validation logic',
      discount: 15,
      discountType: 'percentage',
      maxDiscount: 100000,
      minOrderValue: 200000,
      usageLimit: 10,
      usageLimitPerUser: 2,
      startDate: new Date(),
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    // Test validation methods
    console.log('1. Testing validation for valid order...');
    const validResult = voucher.isValidForUser('user123', [{ _id: 'product1' }], 250000);
    console.log('✅ Valid order result:', validResult.valid ? 'PASS' : 'FAIL');
    
    console.log('\n2. Testing validation for insufficient order value...');
    const invalidResult = voucher.isValidForUser('user123', [{ _id: 'product1' }], 150000);
    console.log('✅ Invalid order result:', !invalidResult.valid ? 'PASS' : 'FAIL');
    console.log('   Message:', invalidResult.message);
    
    console.log('\n3. Testing discount calculation...');
    const discountAmount = voucher.calculateDiscount(250000);
    const expectedDiscount = Math.min((250000 * 15) / 100, 100000); // 37500
    console.log('✅ Discount calculation:', discountAmount === expectedDiscount ? 'PASS' : 'FAIL');
    console.log(`   Calculated: ${discountAmount}, Expected: ${expectedDiscount}`);
    
    await mongoose.disconnect();
    console.log('\n🎉 Voucher Validation Test Completed!');
    
  } catch (error) {
    console.error('❌ Validation test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting Voucher System Tests...\n');
  
  // Test validation logic first (doesn't require server)
  testVoucherValidation()
    .then(() => {
      console.log('\n' + '='.repeat(50));
      console.log('💡 To test API endpoints:');
      console.log('1. Start your server: npm start');
      console.log('2. Get a valid JWT token from login');
      console.log('3. Replace TEST_USER_TOKEN in this file');
      console.log('4. Run: node test-voucher-system.js api');
    });
}

// Export for use in other tests
module.exports = { testVoucherSystem, testVoucherValidation };