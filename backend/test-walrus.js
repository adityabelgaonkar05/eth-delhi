/**
 * Walrus Storage Backend Test
 * Tests the Walrus integration directly on the backend
 */

const WalrusUserService = require('./services/WalrusUserService');

async function runWalrusTests() {
  console.log('🦭 Starting Walrus Backend Tests...\n');
  
  const walrusService = new WalrusUserService();
  
  // Test data
  const testAddress = '0x742d35Cc6634C0532925a3b8D4Bc3db2bE94b3bb';
  const testProfile = {
    username: 'BackendTestUser',
    bio: 'Testing Walrus from backend',
    email: 'backend@test.com',
    reputation: 500,
    avatar: '',
    joinedAt: Date.now(),
    lastActive: Date.now()
  };

  try {
    // Test 1: Store profile
    console.log('📝 Test 1: Storing user profile...');
    const blobId = await walrusService.updateUserProfile(testAddress, null, testProfile);
    console.log(`✅ Profile stored successfully! Blob ID: ${blobId}\n`);

    // Test 2: Retrieve profile
    console.log('📖 Test 2: Retrieving user profile...');
    const retrievedProfile = await walrusService.getUserProfile(blobId);
    console.log('✅ Profile retrieved successfully!');
    console.log('Retrieved data:', JSON.stringify(retrievedProfile, null, 2));
    console.log('');

    // Test 3: Data integrity check
    console.log('🔍 Test 3: Checking data integrity...');
    const isValid = retrievedProfile.username === testProfile.username &&
                   retrievedProfile.bio === testProfile.bio &&
                   retrievedProfile.email === testProfile.email;
    
    if (isValid) {
      console.log('✅ Data integrity check passed!\n');
    } else {
      throw new Error('Data integrity check failed - retrieved data doesn\'t match stored data');
    }

    // Test 4: Search functionality
    console.log('🔍 Test 4: Testing search functionality...');
    const searchResults = await walrusService.searchUsersByUsername('BackendTestUser');
    console.log(`✅ Search completed! Found ${searchResults.length} results`);
    console.log('Search results:', JSON.stringify(searchResults, null, 2));
    console.log('');

    // Test 5: Cache functionality
    console.log('💾 Test 5: Testing cache functionality...');
    const start1 = performance.now();
    await walrusService.getUserProfile(blobId);
    const time1 = performance.now() - start1;
    
    const start2 = performance.now();
    await walrusService.getUserProfile(blobId); // Should hit cache
    const time2 = performance.now() - start2;
    
    console.log(`✅ Cache test completed!`);
    console.log(`   First call (Walrus): ${Math.round(time1)}ms`);
    console.log(`   Second call (Cache): ${Math.round(time2)}ms`);
    console.log(`   Speed improvement: ${Math.round(time1 / time2)}x faster\n`);

    // Test 6: Update existing profile
    console.log('🔄 Test 6: Updating existing profile...');
    const updatedProfile = {
      ...testProfile,
      bio: 'Updated bio from backend test',
      reputation: 750,
      lastActive: Date.now()
    };
    
    const newBlobId = await walrusService.updateUserProfile(testAddress, blobId, updatedProfile);
    console.log(`✅ Profile updated successfully! New Blob ID: ${newBlobId}\n`);

    // Test 7: Retrieve updated profile
    console.log('📖 Test 7: Retrieving updated profile...');
    const finalProfile = await walrusService.getUserProfile(newBlobId);
    console.log('✅ Updated profile retrieved successfully!');
    
    const updateValid = finalProfile.bio === updatedProfile.bio &&
                       finalProfile.reputation === updatedProfile.reputation;
    
    if (updateValid) {
      console.log('✅ Update integrity check passed!\n');
    } else {
      throw new Error('Update integrity check failed');
    }

    console.log('🎉 All Walrus backend tests passed successfully!');
    console.log('\nTest Summary:');
    console.log('- ✅ Profile storage');
    console.log('- ✅ Profile retrieval');
    console.log('- ✅ Data integrity');
    console.log('- ✅ Search functionality');
    console.log('- ✅ Cache performance');
    console.log('- ✅ Profile updates');
    console.log('- ✅ Update integrity');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runWalrusTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = runWalrusTests;