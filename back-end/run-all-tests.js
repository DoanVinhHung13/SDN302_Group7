const { testVoucherValidation } = require('./test-voucher-system');
const { testReturnRequestModel } = require('./test-return-request');
const { testNotificationService } = require('./test-notification-system');

async function runAllTests() {
  console.log('🚀 Running All System Tests...\n');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Voucher System
    console.log('\n📋 VOUCHER SYSTEM TESTS');
    console.log('='.repeat(30));
    await testVoucherValidation();
    
    // Test 2: Return Request System  
    console.log('\n📋 RETURN REQUEST SYSTEM TESTS');
    console.log('='.repeat(30));
    await testReturnRequestModel();
    
    // Test 3: Notification System
    console.log('\n📋 NOTIFICATION SYSTEM TESTS');
    console.log('='.repeat(30));
    await testNotificationService();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    
    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log('✅ Voucher validation logic - PASSED');
    console.log('✅ Voucher discount calculation - PASSED');
    console.log('✅ Return request priority system - PASSED');
    console.log('✅ Return request timeline tracking - PASSED');
    console.log('✅ Notification creation - PASSED');
    console.log('✅ Notification read/unread system - PASSED');
    
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };