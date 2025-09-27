import React, { useState, useRef } from "react";
import { useWalrus } from "../hooks/useWalrus";

/**
 * WalrusUploader Component
 *
 * A comprehensive file upload component that integrates with Walrus Storage.
 * Supports file uploads, metadata viewing, and blob management.
 *
 * Features:
 * - Drag & drop file upload
 * - Text content upload
 * - Storage duration configuration
 * - Real-time upload progress
 * - Blob metadata display
 * - Explorer links to Walruscan
 */
const WalrusUploader = () => {
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

  const [dragActive, setDragActive] = useState(false);
  const [uploadType, setUploadType] = useState("file"); // 'file' or 'text'
  const [textContent, setTextContent] = useState("");
  const [epochs, setEpochs] = useState(2);
  const [permanent, setPermanent] = useState(false);
  const [account, setAccount] = useState("");
  const [selectedBlob, setSelectedBlob] = useState(null);

  const fileInputRef = useRef(null);

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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Upload file
  const handleFileUpload = async (file) => {
    clearError();
    const result = await uploadFile(file, epochs, permanent);

    if (result.success) {
      console.log("✅ Upload successful:", result);
    }
  };

  // Upload text content
  const handleTextUpload = async () => {
    if (!textContent.trim()) {
      alert("Please enter some text content");
      return;
    }

    clearError();
    const result = await uploadFile(textContent, epochs, permanent);

    if (result.success) {
      setTextContent("");
      console.log("✅ Text upload successful:", result);
    }
  };

  // Get blob metadata
  const handleGetMetadata = async (blobId) => {
    clearError();
    const result = await getMetadata(blobId);

    if (result.success) {
      setSelectedBlob(result);
    }
  };

  // Download blob
  const handleDownload = async (blobId) => {
    clearError();
    const result = await downloadFile(blobId);

    if (result.success) {
      // Create download link
      const blob = new Blob([result.content], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `walrus-blob-${blobId.slice(0, 8)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // List account blobs
  const handleListBlobs = async () => {
    if (!account.trim()) {
      alert("Please enter an account address");
      return;
    }

    clearError();
    const result = await listAccountBlobs(account);

    if (result.success) {
      console.log("✅ Blobs listed:", result.blobs.length);
    }
  };

  // Calculate estimated cost
  const estimatedCost = calculateStorageCost(1024, epochs, permanent);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
        <h2 className="text-3xl font-bold mb-6 text-center">
          🦭 Walrus Storage Uploader
        </h2>

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

        {/* Upload Type Selection */}
        <div className="mb-6">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setUploadType("file")}
              className={`px-4 py-2 rounded-lg font-bold ${
                uploadType === "file"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              📁 Upload File
            </button>
            <button
              onClick={() => setUploadType("text")}
              className={`px-4 py-2 rounded-lg font-bold ${
                uploadType === "text"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              📝 Upload Text
            </button>
          </div>
        </div>

        {/* Storage Configuration */}
        <div className="bg-gray-50 border-3 border-gray-300 p-4 rounded-xl mb-6">
          <h3 className="text-lg font-bold mb-4">Storage Configuration</h3>

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
              <p className="text-xs text-gray-600 mt-1">
                1 epoch ≈ 2 weeks. Current: {epochs} epochs (≈
                {Math.round(epochs * 2)} weeks)
              </p>
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

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Estimated Cost:</strong>{" "}
              {estimatedCost.estimatedCostFormatted}
              <br />
              <span className="text-xs">{estimatedCost.note}</span>
            </p>
          </div>
        </div>

        {/* File Upload */}
        {uploadType === "file" && (
          <div
            className={`border-3 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="text-6xl">📁</div>
              <div>
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
                  {isLoading ? "⏳ Uploading..." : "📁 Choose File"}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
          </div>
        )}

        {/* Text Upload */}
        {uploadType === "text" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">
                Text Content
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter your text content here..."
                rows="6"
                className="w-full p-3 border-3 border-gray-300 rounded-lg"
                disabled={isLoading}
              />
            </div>

            <button
              onClick={handleTextUpload}
              disabled={isLoading || !textContent.trim()}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              {isLoading ? "⏳ Uploading..." : "📝 Upload Text"}
            </button>
          </div>
        )}

        {/* Account Blob Listing */}
        <div className="mt-8 bg-purple-50 border-3 border-purple-300 p-4 rounded-xl">
          <h3 className="text-lg font-bold mb-4">🔍 List Account Blobs</h3>

          <div className="flex space-x-4">
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Enter wallet address (0x...)"
              className="flex-1 p-3 border-3 border-gray-300 rounded-lg"
              disabled={isLoading}
            />
            <button
              onClick={handleListBlobs}
              disabled={isLoading || !account.trim()}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              {isLoading ? "⏳ Loading..." : "🔍 List Blobs"}
            </button>
          </div>
        </div>
      </div>

      {/* Current Blob Display */}
      {currentBlob && (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
          <h3 className="text-2xl font-bold mb-4">📄 Current Blob Details</h3>

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
                  <strong>Size:</strong> {formatFileSize(currentBlob.size)}
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

              <div className="flex space-x-2">
                <button
                  onClick={() => handleGetMetadata(currentBlob.blobId)}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  📊 Get Metadata
                </button>

                <button
                  onClick={() => handleDownload(currentBlob.blobId)}
                  disabled={isLoading}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  ⬇️ Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blobs List */}
      {blobs.length > 0 && (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
          <h3 className="text-2xl font-bold mb-4">
            📋 Uploaded Blobs ({blobs.length})
          </h3>

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
                      {blob.epochs && <span>Epochs: {blob.epochs}</span>}
                      {blob.uploadTime && (
                        <span>
                          Uploaded: {new Date(blob.uploadTime).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleGetMetadata(blob.blobId)}
                      disabled={isLoading}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-bold"
                    >
                      📊
                    </button>

                    <button
                      onClick={() => handleDownload(blob.blobId)}
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
  );
};

export default WalrusUploader;
