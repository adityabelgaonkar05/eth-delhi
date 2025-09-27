import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import useWalrusProfile from '../hooks/useWalrusProfile';
import { useSocket } from '../context/SocketContext';

/**
 * WalrusStorageTest Component
 * Demonstrates and tests Walrus decentralized storage integration
 */
const WalrusStorageTest = () => {
  const [testAddress, setTestAddress] = useState('0x742d35Cc6634C0532925a3b8D4Bc3db2bE94b3bb');
  const [testProfile, setTestProfile] = useState({
    username: 'TestUser',
    bio: 'Testing Walrus storage integration',
    email: 'test@example.com',
    avatar: '',
    reputation: 100
  });
  const [testResults, setTestResults] = useState([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  
  const { 
    updateUserProfile, 
    getUserProfile, 
    searchPlayers, 
    isLoading, 
    error,
    clearCache 
  } = useWalrusProfile();
  
  const { socket, isConnected } = useSocket();

  // Add test result
  const addTestResult = (testName, success, message, data = null) => {
    const result = {
      id: Date.now(),
      testName,
      success,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [result, ...prev]);
    return result;
  };

  // Test 1: Socket Connection
  const testSocketConnection = async () => {
    try {
      if (!socket || !isConnected) {
        throw new Error('Socket not connected');
      }
      
      addTestResult('Socket Connection', true, 'Socket connected successfully', { 
        socketId: socket.id,
        isConnected 
      });
      return true;
    } catch (error) {
      addTestResult('Socket Connection', false, error.message);
      return false;
    }
  };

  // Test 2: Walrus Profile Storage
  const testProfileStorage = async () => {
    try {
      console.log('🧪 Testing profile storage to Walrus...');
      
      const result = await updateUserProfile(testAddress, testProfile);
      
      addTestResult('Profile Storage', true, 'Profile stored successfully on Walrus', {
        blobId: result.blobId,
        address: testAddress
      });
      return result;
    } catch (error) {
      addTestResult('Profile Storage', false, `Storage failed: ${error.message}`);
      throw error;
    }
  };

  // Test 3: Walrus Profile Retrieval
  const testProfileRetrieval = async (blobId) => {
    try {
      console.log('🧪 Testing profile retrieval from Walrus...');
      
      const profile = await getUserProfile(testAddress, blobId, false); // Don't use cache
      
      // Verify data integrity
      const isValid = profile.username === testProfile.username && 
                     profile.bio === testProfile.bio;
      
      if (!isValid) {
        throw new Error('Retrieved data does not match stored data');
      }
      
      addTestResult('Profile Retrieval', true, 'Profile retrieved successfully from Walrus', {
        source: profile.source,
        blobId: profile.blobId,
        retrievedData: profile
      });
      return profile;
    } catch (error) {
      addTestResult('Profile Retrieval', false, `Retrieval failed: ${error.message}`);
      throw error;
    }
  };

  // Test 4: Player Search
  const testPlayerSearch = async () => {
    try {
      console.log('🧪 Testing player search...');
      
      const searchResult = await searchPlayers(testProfile.username);
      
      addTestResult('Player Search', true, 'Search completed successfully', {
        searchMethod: searchResult.method,
        resultsCount: searchResult.results.length,
        results: searchResult.results
      });
      return searchResult;
    } catch (error) {
      addTestResult('Player Search', false, `Search failed: ${error.message}`);
      throw error;
    }
  };

  // Test 5: Cache Functionality
  const testCacheFunctionality = async () => {
    try {
      console.log('🧪 Testing cache functionality...');
      
      // First call (should hit Walrus)
      const start1 = performance.now();
      await getUserProfile(testAddress, null, true);
      const time1 = performance.now() - start1;
      
      // Second call (should hit cache)
      const start2 = performance.now();
      await getUserProfile(testAddress, null, true);
      const time2 = performance.now() - start2;
      
      const cacheWorking = time2 < time1 * 0.5; // Cache should be much faster
      
      addTestResult('Cache Functionality', cacheWorking, 
        `Cache ${cacheWorking ? 'working' : 'not working'}`, {
        walrusTime: Math.round(time1),
        cacheTime: Math.round(time2),
        speedup: Math.round(time1 / time2) + 'x'
      });
      
      return cacheWorking;
    } catch (error) {
      addTestResult('Cache Functionality', false, `Cache test failed: ${error.message}`);
      throw error;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    try {
      console.log('🚀 Starting Walrus integration tests...');
      
      // Test 1: Socket Connection
      await testSocketConnection();
      
      // Test 2: Store profile on Walrus
      const storeResult = await testProfileStorage();
      
      // Test 3: Retrieve profile from Walrus
      await testProfileRetrieval(storeResult.blobId);
      
      // Test 4: Search functionality
      await testPlayerSearch();
      
      // Test 5: Cache functionality
      await testCacheFunctionality();
      
      addTestResult('Full Test Suite', true, '🎉 All tests completed successfully!');
      
    } catch (error) {
      addTestResult('Full Test Suite', false, `❌ Test suite failed: ${error.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Clear all test results
  const clearTests = () => {
    setTestResults([]);
    clearCache();
  };

  // Generate test data
  const generateRandomTestData = () => {
    const randomId = Math.floor(Math.random() * 1000);
    setTestAddress(`0x742d35Cc6634C0532925a3b8D4Bc3db2bE94b${randomId.toString().padStart(3, '0')}`);
    setTestProfile(prev => ({
      ...prev,
      username: `TestUser${randomId}`,
      bio: `Testing Walrus storage integration - ${new Date().toISOString()}`,
      reputation: Math.floor(Math.random() * 1000)
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🦭 Walrus Storage Integration Test</h1>
        <p className="text-gray-600">
          This test demonstrates the complete Walrus decentralized storage integration
        </p>
      </div>

      {/* Connection Status */}
      <div className={`p-4 rounded-lg mb-6 ${isConnected ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'}`}>
        <h3 className="font-semibold mb-2">Socket Connection Status</h3>
        <p className={isConnected ? 'text-green-700' : 'text-red-700'}>
          {isConnected ? `✅ Connected (Socket ID: ${socket?.id})` : '❌ Not Connected'}
        </p>
      </div>

      {/* Test Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-3">Test Configuration</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Test Address:</label>
            <Input
              value={testAddress}
              onChange={(e) => setTestAddress(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Username:</label>
            <Input
              value={testProfile.username}
              onChange={(e) => setTestProfile(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Bio:</label>
          <Input
            value={testProfile.bio}
            onChange={(e) => setTestProfile(prev => ({ ...prev, bio: e.target.value }))}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={generateRandomTestData} variant="outline" size="sm">
            Generate Random Data
          </Button>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <Button 
            onClick={runAllTests} 
            disabled={isRunningTests || !isConnected}
            className="flex items-center gap-2"
          >
            {isRunningTests && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            🧪 Run All Tests
          </Button>
          
          <Button onClick={clearTests} variant="outline">
            Clear Results
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            ❌ Error: {error}
          </div>
        )}
      </div>

      {/* Test Results */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Test Results ({testResults.length})</h3>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No tests run yet. Click "Run All Tests" to start.
            </div>
          ) : (
            testResults.map((result) => (
              <div 
                key={result.id} 
                className={`p-4 border-b last:border-b-0 ${
                  result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">
                    {result.success ? '✅' : '❌'} {result.testName}
                  </h4>
                  <span className="text-xs text-gray-500">{result.timestamp}</span>
                </div>
                
                <p className={`text-sm mb-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
                
                {result.data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold mb-2">How to Use This Test:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Ensure both backend (port 3001) and Walrus services are running</li>
          <li>Verify socket connection shows as "Connected"</li>
          <li>Modify test data if needed or use "Generate Random Data"</li>
          <li>Click "Run All Tests" to execute the full test suite</li>
          <li>Check results to verify Walrus integration is working</li>
        </ol>
      </div>
    </div>
  );
};

export default WalrusStorageTest;