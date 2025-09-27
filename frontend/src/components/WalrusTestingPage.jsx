import React, { useState, useRef } from "react";
import { useWalrus } from "../hooks/useWalrus";
import { setMockMode, setMockFallback, getConfig } from "../services/walrus";

/**
 * Walrus Testing Page
 *
 * A comprehensive testing interface for Walrus Storage integration.
 * This page allows you to test all Walrus functionality including:
 * - File uploads (drag & drop and file picker)
 * - Text content uploads
 * - Blob metadata retrieval
 * - Blob content download
 * - Account blob listing
 * - Cost estimation
 * - Error handling
 */
const WalrusTestingPage = () => {
  const {
    uploadFile,
    getMetadata,
    downloadFile,
    listAccountBlobs,
    isLoading,
    error,
    blobs,
    currentBlob,
    clearError,
    formatFileSize,
    calculateStorageCost,
  } = useWalrus();

  // State for different test sections
  const [activeTab, setActiveTab] = useState("upload");
  const [dragActive, setDragActive] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [accountAddress, setAccountAddress] = useState("");
  const [blobIdInput, setBlobIdInput] = useState("");
  const [textContent, setTextContent] = useState(
    "Hello, Walrus Storage! This is a test message."
  );
  const [epochs, setEpochs] = useState(2);
  const [permanent, setPermanent] = useState(false);
  const [costEstimate, setCostEstimate] = useState(null);
  const [mockMode, setMockModeState] = useState(false);
  const [mockFallback, setMockFallbackState] = useState(true);

  const fileInputRef = useRef(null);

  // Add test result to the log
  const addTestResult = (test, result, details = "") => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults((prev) => [
      {
        id: Date.now(),
        timestamp,
        test,
        result: result ? "✅ PASS" : "❌ FAIL",
        details,
      },
      ...prev,
    ]);
  };

  // Test 1: File Upload
  const testFileUpload = async (file) => {
    try {
      addTestResult("File Upload", false, "Starting file upload test...");
      const result = await uploadFile(file, epochs, permanent);

      if (result.success) {
        addTestResult(
          "File Upload",
          true,
          `Uploaded: ${file.name} (${formatFileSize(file.size)}) - Blob ID: ${
            result.blobId
          }`
        );
        return result;
      } else {
        addTestResult("File Upload", false, `Upload failed: ${result.error}`);
        return null;
      }
    } catch (err) {
      addTestResult("File Upload", false, `Upload error: ${err.message}`);
      return null;
    }
  };

  // Test 2: Text Upload
  const testTextUpload = async () => {
    try {
      addTestResult("Text Upload", false, "Starting text upload test...");
      const result = await uploadFile(textContent, epochs, permanent);

      if (result.success) {
        addTestResult(
          "Text Upload",
          true,
          `Uploaded text (${textContent.length} chars) - Blob ID: ${result.blobId}`
        );
        return result;
      } else {
        addTestResult("Text Upload", false, `Upload failed: ${result.error}`);
        return null;
      }
    } catch (err) {
      addTestResult("Text Upload", false, `Upload error: ${err.message}`);
      return null;
    }
  };

  // Test 3: Get Metadata
  const testGetMetadata = async (blobId) => {
    try {
      addTestResult(
        "Get Metadata",
        false,
        `Getting metadata for blob: ${blobId}`
      );
      const result = await getMetadata(blobId);

      if (result.success) {
        addTestResult(
          "Get Metadata",
          true,
          `Retrieved metadata - Size: ${formatFileSize(result.size)}, Epochs: ${
            result.epochs
          }`
        );
        return result;
      } else {
        addTestResult(
          "Get Metadata",
          false,
          `Failed to get metadata: ${result.error}`
        );
        return null;
      }
    } catch (err) {
      addTestResult("Get Metadata", false, `Metadata error: ${err.message}`);
      return null;
    }
  };

  // Test 4: Download Blob
  const testDownloadBlob = async (blobId) => {
    try {
      addTestResult("Download Blob", false, `Downloading blob: ${blobId}`);
      const result = await downloadFile(blobId);

      if (result.success) {
        addTestResult(
          "Download Blob",
          true,
          `Downloaded ${formatFileSize(result.size)} - Content Type: ${
            result.contentType
          }`
        );
        return result;
      } else {
        addTestResult(
          "Download Blob",
          false,
          `Download failed: ${result.error}`
        );
        return null;
      }
    } catch (err) {
      addTestResult("Download Blob", false, `Download error: ${err.message}`);
      return null;
    }
  };

  // Test 5: List Account Blobs
  const testListAccountBlobs = async (account) => {
    try {
      addTestResult(
        "List Account Blobs",
        false,
        `Listing blobs for account: ${account}`
      );
      const result = await listAccountBlobs(account, { limit: 10 });

      if (result.success) {
        addTestResult(
          "List Account Blobs",
          true,
          `Found ${result.blobs.length} blobs (Total: ${result.total})`
        );
        return result;
      } else {
        addTestResult(
          "List Account Blobs",
          false,
          `Failed to list blobs: ${result.error}`
        );
        return null;
      }
    } catch (err) {
      addTestResult("List Account Blobs", false, `List error: ${err.message}`);
      return null;
    }
  };

  // Test 6: Cost Estimation
  const testCostEstimation = (size, epochs, permanent) => {
    try {
      addTestResult(
        "Cost Estimation",
        false,
        `Calculating cost for ${formatFileSize(size)}`
      );
      const cost = calculateStorageCost(size, epochs, permanent);
      addTestResult(
        "Cost Estimation",
        true,
        `Estimated cost: ${cost.estimatedCostFormatted}`
      );
      setCostEstimate(cost);
      return cost;
    } catch (err) {
      addTestResult(
        "Cost Estimation",
        false,
        `Cost calculation error: ${err.message}`
      );
      return null;
    }
  };

  // Run All Tests
  const runAllTests = async () => {
    setTestResults([]);
    addTestResult(
      "Test Suite",
      false,
      "Starting comprehensive Walrus Storage tests..."
    );

    // Test 1: Text Upload
    const textResult = await testTextUpload();

    if (textResult) {
      // Test 2: Get Metadata
      await testGetMetadata(textResult.blobId);

      // Test 3: Download Blob
      await testDownloadBlob(textResult.blobId);
    }

    // Test 4: Cost Estimation
    testCostEstimation(1024, epochs, permanent);

    // Test 5: List Account Blobs (if account provided)
    if (accountAddress.trim()) {
      await testListAccountBlobs(accountAddress);
    }

    addTestResult("Test Suite", true, "All tests completed!");
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      testFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      testFileUpload(e.target.files[0]);
    }
  };

  // Clear test results
  const clearTestResults = () => {
    setTestResults([]);
  };

  // Download test results as JSON
  const downloadTestResults = () => {
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `walrus-test-results-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl mb-8">
          <h1 className="text-4xl font-bold text-center mb-4">
            🦭 Walrus Storage Testing Suite
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Comprehensive testing interface for Walrus Storage integration
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-100 border-2 border-blue-300 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-blue-800">
                {blobs.length}
              </div>
              <div className="text-sm text-blue-600">Uploaded Blobs</div>
            </div>
            <div className="bg-green-100 border-2 border-green-300 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-green-800">
                {testResults.filter((r) => r.result === "✅ PASS").length}
              </div>
              <div className="text-sm text-green-600">Passed Tests</div>
            </div>
            <div className="bg-red-100 border-2 border-red-300 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-red-800">
                {testResults.filter((r) => r.result === "❌ FAIL").length}
              </div>
              <div className="text-sm text-red-600">Failed Tests</div>
            </div>
            <div className="bg-purple-100 border-2 border-purple-300 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-purple-800">
                {testResults.length}
              </div>
              <div className="text-sm text-purple-600">Total Tests</div>
            </div>
          </div>

          {/* Global Controls */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={runAllTests}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              {isLoading ? "⏳ Running Tests..." : "🚀 Run All Tests"}
            </button>

            <button
              onClick={clearTestResults}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              🗑️ Clear Results
            </button>

            <button
              onClick={downloadTestResults}
              disabled={testResults.length === 0}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              📥 Download Results
            </button>
          </div>

          {/* Mode Controls */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">
              🔧 Service Mode Controls
            </h3>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mockMode"
                  checked={mockMode}
                  onChange={(e) => {
                    setMockModeState(e.target.checked);
                    setMockMode(e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="mockMode"
                  className="text-sm font-medium text-gray-700"
                >
                  Force Mock Mode (Always use mock service)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mockFallback"
                  checked={mockFallback}
                  onChange={(e) => {
                    setMockFallbackState(e.target.checked);
                    setMockFallback(e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="mockFallback"
                  className="text-sm font-medium text-gray-700"
                >
                  Enable Mock Fallback (Use mock when API fails)
                </label>
              </div>

              <button
                onClick={() => {
                  const config = getConfig();
                  console.log("Current Walrus Config:", config);
                  addTestResult(
                    "Config Check",
                    "Success",
                    `Mock Mode: ${config.forceMockMode}, Fallback: ${config.useMockFallback}`
                  );
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                📋 Show Config
              </button>
            </div>
            <p className="text-xs text-yellow-700 mt-2">
              💡 <strong>Mock Mode:</strong> Always use mock service (for
              testing).
              <strong>Mock Fallback:</strong> Use mock service when real API
              fails (recommended).
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 rounded-3xl mb-8">
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { id: "upload", label: "📁 Upload Tests", icon: "📁" },
              { id: "metadata", label: "📊 Metadata Tests", icon: "📊" },
              { id: "download", label: "⬇️ Download Tests", icon: "⬇️" },
              { id: "list", label: "📋 List Tests", icon: "📋" },
              { id: "cost", label: "💰 Cost Tests", icon: "💰" },
              { id: "results", label: "📈 Test Results", icon: "📈" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "upload" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold mb-4">📁 Upload Tests</h3>

              {/* Storage Configuration */}
              <div className="bg-gray-50 border-3 border-gray-300 p-4 rounded-xl">
                <h4 className="text-lg font-bold mb-4">
                  Storage Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Storage Duration (Epochs)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={epochs}
                      onChange={(e) => setEpochs(parseInt(e.target.value) || 2)}
                      className="w-full p-3 border-3 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Storage Type
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!permanent}
                          onChange={() => setPermanent(false)}
                          className="mr-2"
                        />
                        Temporary
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={permanent}
                          onChange={() => setPermanent(true)}
                          className="mr-2"
                        />
                        Permanent
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload Test */}
              <div className="bg-blue-50 border-3 border-blue-300 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-4">File Upload Test</h4>
                <div
                  className={`border-3 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragActive
                      ? "border-blue-500 bg-blue-100"
                      : "border-gray-300 bg-white"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="text-6xl mb-4">📁</div>
                  <p className="text-lg font-bold mb-2">
                    {dragActive
                      ? "Drop your file here"
                      : "Drag & drop a file here"}
                  </p>
                  <p className="text-gray-600 mb-4">or</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                  >
                    📁 Choose File
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>

              {/* Text Upload Test */}
              <div className="bg-green-50 border-3 border-green-300 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-4">Text Upload Test</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Test Text Content
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows="4"
                      className="w-full p-3 border-3 border-gray-300 rounded-lg"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={testTextUpload}
                    disabled={isLoading || !textContent.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                  >
                    📝 Upload Text
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold mb-4">📊 Metadata Tests</h3>

              <div className="bg-blue-50 border-3 border-blue-300 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-4">Get Blob Metadata</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Blob ID
                    </label>
                    <input
                      type="text"
                      value={blobIdInput}
                      onChange={(e) => setBlobIdInput(e.target.value)}
                      placeholder="Enter blob ID (0x...)"
                      className="w-full p-3 border-3 border-gray-300 rounded-lg"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={() => testGetMetadata(blobIdInput)}
                    disabled={isLoading || !blobIdInput.trim()}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                  >
                    📊 Get Metadata
                  </button>
                </div>
              </div>

              {/* Current Blob Display */}
              {currentBlob && (
                <div className="bg-white border-3 border-gray-300 p-6 rounded-xl">
                  <h4 className="text-lg font-bold mb-4">
                    Current Blob Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <strong>Blob ID:</strong>
                        <p className="font-mono text-sm break-all">
                          {currentBlob.blobId}
                        </p>
                      </div>
                      {currentBl.size && (
                        <div>
                          <strong>Size:</strong>{" "}
                          {formatFileSize(currentBlob.size)}
                        </div>
                      )}
                      {currentBl.epochs && (
                        <div>
                          <strong>Epochs:</strong> {currentBlob.epochs}
                        </div>
                      )}
                      {currentBl.cost && (
                        <div>
                          <strong>Cost:</strong> {currentBlob.cost} wei
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {currentBlob.explorerUrl && (
                        <div>
                          <strong>Explorer:</strong>
                          <br />
                          <a
                            href={currentBlob.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            View on Walruscan
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "download" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold mb-4">⬇️ Download Tests</h3>

              <div className="bg-green-50 border-3 border-green-300 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-4">
                  Download Blob Content
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Blob ID
                    </label>
                    <input
                      type="text"
                      value={blobIdInput}
                      onChange={(e) => setBlobIdInput(e.target.value)}
                      placeholder="Enter blob ID (0x...)"
                      className="w-full p-3 border-3 border-gray-300 rounded-lg"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={() => testDownloadBlob(blobIdInput)}
                    disabled={isLoading || !blobIdInput.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                  >
                    ⬇️ Download Blob
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "list" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold mb-4">📋 List Tests</h3>

              <div className="bg-purple-50 border-3 border-purple-300 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-4">List Account Blobs</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Account Address
                    </label>
                    <input
                      type="text"
                      value={accountAddress}
                      onChange={(e) => setAccountAddress(e.target.value)}
                      placeholder="Enter wallet address (0x...)"
                      className="w-full p-3 border-3 border-gray-300 rounded-lg"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={() => testListAccountBlobs(accountAddress)}
                    disabled={isLoading || !accountAddress.trim()}
                    className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                  >
                    📋 List Blobs
                  </button>
                </div>
              </div>

              {/* Blobs List */}
              {blobs.length > 0 && (
                <div className="bg-white border-3 border-gray-300 p-6 rounded-xl">
                  <h4 className="text-lg font-bold mb-4">
                    Uploaded Blobs ({blobs.length})
                  </h4>
                  <div className="space-y-4">
                    {blobs.map((blob, index) => (
                      <div
                        key={blob.blobId || index}
                        className="border-3 border-gray-300 p-4 rounded-xl hover:border-blue-500 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-mono text-sm break-all mb-2">
                              {blob.blobId}
                            </div>
                            <div className="flex space-x-4 text-sm text-gray-600">
                              {blob.size && (
                                <span>Size: {formatFileSize(blob.size)}</span>
                              )}
                              {blob.epochs && (
                                <span>Epochs: {blob.epochs}</span>
                              )}
                              {blob.uploadTime && (
                                <span>
                                  Uploaded:{" "}
                                  {new Date(blob.uploadTime).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => testGetMetadata(blob.blobId)}
                              disabled={isLoading}
                              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-bold"
                            >
                              📊
                            </button>
                            <button
                              onClick={() => testDownloadBlob(blob.blobId)}
                              disabled={isLoading}
                              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-bold"
                            >
                              ⬇️
                            </button>
                            {blob.explorerUrl && (
                              <a
                                href={blob.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold"
                              >
                                🔍
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "cost" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold mb-4">💰 Cost Tests</h3>

              <div className="bg-yellow-50 border-3 border-yellow-300 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-4">
                  Storage Cost Estimation
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        File Size (bytes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={costEstimate?.size || 1024}
                        onChange={(e) => {
                          const size = parseInt(e.target.value) || 1024;
                          testCostEstimation(size, epochs, permanent);
                        }}
                        className="w-full p-3 border-3 border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Epochs
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={epochs}
                        onChange={(e) => {
                          const newEpochs = parseInt(e.target.value) || 2;
                          setEpochs(newEpochs);
                          testCostEstimation(
                            costEstimate?.size || 1024,
                            newEpochs,
                            permanent
                          );
                        }}
                        className="w-full p-3 border-3 border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Storage Type
                      </label>
                      <select
                        value={permanent ? "permanent" : "temporary"}
                        onChange={(e) => {
                          const newPermanent = e.target.value === "permanent";
                          setPermanent(newPermanent);
                          testCostEstimation(
                            costEstimate?.size || 1024,
                            epochs,
                            newPermanent
                          );
                        }}
                        className="w-full p-3 border-3 border-gray-300 rounded-lg"
                      >
                        <option value="temporary">Temporary</option>
                        <option value="permanent">Permanent</option>
                      </select>
                    </div>
                  </div>

                  {costEstimate && (
                    <div className="bg-white border-3 border-gray-300 p-4 rounded-xl">
                      <h5 className="font-bold mb-2">
                        Cost Estimation Results:
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <strong>File Size:</strong>{" "}
                          {formatFileSize(costEstimate.size)}
                        </div>
                        <div>
                          <strong>Epochs:</strong> {costEstimate.epochs}
                        </div>
                        <div>
                          <strong>Storage Type:</strong>{" "}
                          {costEstimate.permanent ? "Permanent" : "Temporary"}
                        </div>
                        <div>
                          <strong>Estimated Cost:</strong>{" "}
                          {costEstimate.estimatedCostFormatted}
                        </div>
                        <div className="text-sm text-gray-600">
                          {costEstimate.note}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold mb-4">📈 Test Results</h3>

              {/* Error Display */}
              {error && (
                <div className="bg-red-100 border-3 border-red-500 p-4 rounded-xl mb-6">
                  <div className="flex justify-between items-center">
                    <p className="text-red-800 font-bold">❌ Error: {error}</p>
                    <button
                      onClick={clearError}
                      className="text-red-600 hover:text-red-800 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Test Results Log */}
              <div className="bg-gray-900 text-green-400 p-6 rounded-xl font-mono text-sm max-h-96 overflow-y-auto">
                {testResults.length === 0 ? (
                  <div className="text-gray-500">
                    No test results yet. Run some tests to see results here.
                  </div>
                ) : (
                  testResults.map((result) => (
                    <div key={result.id} className="mb-2">
                      <span className="text-gray-400">
                        [{result.timestamp}]
                      </span>{" "}
                      <span
                        className={
                          result.result === "✅ PASS"
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {result.result}
                      </span>{" "}
                      <span className="text-yellow-400">{result.test}</span>
                      {result.details && (
                        <div className="ml-4 text-gray-300">
                          {result.details}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalrusTestingPage;
