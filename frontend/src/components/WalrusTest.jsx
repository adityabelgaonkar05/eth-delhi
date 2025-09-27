import React, { useState } from "react";
import { useContracts } from "../context/ContractContext";

const WalrusTest = () => {
  const {
    uploadToWalrusViaBackend,
    retrieveFromWalrusViaBackend,
    checkBlobStatusViaBackend,
    uploadTextToWalrusViaBackend,
    uploadJsonToWalrusViaBackend,
    checkWalrusHealthViaBackend,
  } = useContracts();

  const [testText, setTestText] = useState("Hello, Walrus Storage!");
  const [testJson, setTestJson] = useState(
    JSON.stringify(
      { message: "Test JSON data", timestamp: new Date().toISOString() },
      null,
      2
    )
  );
  const [blobId, setBlobId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTest = async (testFunction, ...args) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await testFunction(...args);
      setResult(response);
      console.log("Test result:", response);
    } catch (err) {
      setError(err.message);
      console.error("Test error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadText = () => {
    handleTest(uploadTextToWalrusViaBackend, testText, 1, false);
  };

  const handleUploadJson = () => {
    try {
      const jsonData = JSON.parse(testJson);
      handleTest(uploadJsonToWalrusViaBackend, jsonData, 1, false);
    } catch (err) {
      setError("Invalid JSON format");
    }
  };

  const handleRetrieve = () => {
    if (!blobId.trim()) {
      setError("Please enter a blob ID");
      return;
    }
    handleTest(retrieveFromWalrusViaBackend, blobId);
  };

  const handleCheckStatus = () => {
    if (!blobId.trim()) {
      setError("Please enter a blob ID");
      return;
    }
    handleTest(checkBlobStatusViaBackend, blobId);
  };

  const handleHealthCheck = () => {
    handleTest(checkWalrusHealthViaBackend);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Walrus Backend Integration Test
      </h2>

      {/* Health Check */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Health Check</h3>
        <button
          onClick={handleHealthCheck}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check Walrus Health"}
        </button>
      </div>

      {/* Upload Text */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Upload Text</h3>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="w-full p-3 border rounded mb-3"
          rows={3}
          placeholder="Enter text to upload..."
        />
        <button
          onClick={handleUploadText}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload Text"}
        </button>
      </div>

      {/* Upload JSON */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Upload JSON</h3>
        <textarea
          value={testJson}
          onChange={(e) => setTestJson(e.target.value)}
          className="w-full p-3 border rounded mb-3 font-mono text-sm"
          rows={6}
          placeholder="Enter JSON data to upload..."
        />
        <button
          onClick={handleUploadJson}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload JSON"}
        </button>
      </div>

      {/* Retrieve and Status Check */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Retrieve & Status Check</h3>
        <input
          type="text"
          value={blobId}
          onChange={(e) => setBlobId(e.target.value)}
          className="w-full p-3 border rounded mb-3"
          placeholder="Enter blob ID..."
        />
        <div className="flex gap-3">
          <button
            onClick={handleRetrieve}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "Retrieving..." : "Retrieve Content"}
          </button>
          <button
            onClick={handleCheckStatus}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h4 className="font-semibold">Error:</h4>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h4 className="font-semibold">Result:</h4>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h4 className="font-semibold mb-2">Instructions:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>
            First, check the health status to ensure the backend is connected
          </li>
          <li>Upload some text or JSON data to get a blob ID</li>
          <li>
            Copy the blob ID from the result and use it to retrieve or check
            status
          </li>
          <li>Check the browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
};

export default WalrusTest;
