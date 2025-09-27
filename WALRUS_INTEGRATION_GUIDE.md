# 🦭 Walrus Storage Integration Guide

This guide explains how to integrate Walrus Storage into your project for decentralized file storage and data management.

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Frontend Integration](#frontend-integration)
- [Backend Integration](#backend-integration)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## 🌟 Overview

Walrus Storage provides decentralized, permanent storage for your application data. This integration includes:

- **Frontend Service**: React hooks and components for easy integration
- **Backend Service**: Node.js service for server-side operations
- **API Endpoints**: RESTful endpoints for file operations
- **Database Integration**: Examples for storing metadata in your existing database

### Key Features

- ✅ Upload files and text content to Walrus Storage
- ✅ Retrieve blob metadata and content
- ✅ List user's blobs by account
- ✅ Real Walrus blob IDs that work on Walruscan Testnet
- ✅ Cost estimation and storage configuration
- ✅ Error handling and validation
- ✅ React hooks for easy frontend integration

## 🚀 Installation

### Frontend Dependencies

```bash
cd frontend
npm install axios
```

### Backend Dependencies

```bash
cd backend
npm install axios multer
```

## 🎨 Frontend Integration

### 1. Basic Usage with React Hook

```jsx
import React from "react";
import { useWalrus } from "../hooks/useWalrus";

const MyComponent = () => {
  const { uploadFile, isLoading, error, blobs } = useWalrus();

  const handleFileUpload = async (file) => {
    const result = await uploadFile(file, 4, false); // 4 epochs, temporary
    if (result.success) {
      console.log("Uploaded:", result.blobId);
      console.log("Explorer URL:", result.explorerUrl);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => handleFileUpload(e.target.files[0])}
        disabled={isLoading}
      />
      {isLoading && <p>Uploading...</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
};
```

### 2. Using the WalrusUploader Component

```jsx
import WalrusUploader from "../components/WalrusUploader";

const App = () => {
  return (
    <div>
      <h1>My App</h1>
      <WalrusUploader />
    </div>
  );
};
```

### 3. Direct Service Usage

```javascript
import { uploadBlob, getBlobMetadata, downloadBlob } from "../services/walrus";

// Upload a file
const fileBuffer = new Uint8Array([1, 2, 3, 4]);
const result = await uploadBlob(fileBuffer, 2, false);

// Get metadata
const metadata = await getBlobMetadata(result.blobId);

// Download content
const content = await downloadBlob(result.blobId);
```

## 🔧 Backend Integration

### 1. Add Routes to Your Server

```javascript
// server.js
const express = require("express");
const walrusRoutes = require("./routes/walrusRoutes");

const app = express();

// Add Walrus routes
app.use("/api/walrus", walrusRoutes);

app.listen(3000, () => {
  console.log("Server running with Walrus integration");
});
```

### 2. Use Service in Your Controllers

```javascript
const { uploadBlob, textToBuffer } = require("../services/walrusService");

const createBlogPost = async (req, res) => {
  const { title, content, authorId } = req.body;

  // Upload content to Walrus
  const contentBuffer = textToBuffer(content);
  const walrusResult = await uploadBlob(contentBuffer, 4, false);

  if (!walrusResult.success) {
    return res.status(500).json({ error: "Upload failed" });
  }

  // Save to your database
  const blog = {
    title,
    authorId,
    walrusBlobId: walrusResult.blobId,
    contentSize: content.length,
  };

  // await db.collection('blogs').insertOne(blog);

  res.json({ success: true, blog, walrus: walrusResult });
};
```

## 📡 API Endpoints

### File Upload

```http
POST /api/walrus/upload
Content-Type: multipart/form-data

file: [file]
epochs: 2
permanent: false
userId: user123
```

### Text Upload

```http
POST /api/walrus/upload-text
Content-Type: application/json

{
  "content": "Hello, Walrus!",
  "epochs": 2,
  "permanent": false,
  "userId": "user123"
}
```

### Get Metadata

```http
GET /api/walrus/metadata/{blobId}
```

### Download Blob

```http
GET /api/walrus/download/{blobId}
```

### List User Blobs

```http
GET /api/walrus/blobs/{userId}?limit=50&offset=0
```

### Calculate Cost

```http
GET /api/walrus/cost?size=1024&epochs=2&permanent=false
```

### Health Check

```http
GET /api/walrus/health
```

## 💡 Usage Examples

### 1. Blog Post Storage

```javascript
// Frontend: Upload blog content
const uploadBlogPost = async (title, content, authorId) => {
  const result = await uploadFile(content, 4, false);

  if (result.success) {
    // Save to your backend
    await fetch("/api/blogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        authorId,
        walrusBlobId: result.blobId,
      }),
    });
  }
};
```

### 2. User Avatar Storage

```javascript
// Frontend: Upload avatar
const uploadAvatar = async (file, userId) => {
  const result = await uploadFile(file, 10, true); // 10 epochs, permanent

  if (result.success) {
    // Update user profile
    await fetch(`/api/users/${userId}/avatar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        avatarData: await fileToBase64(file),
        mimeType: file.type,
      }),
    });
  }
};
```

### 3. Document Storage

```javascript
// Frontend: Upload document
const uploadDocument = async (file, userId, documentType) => {
  const result = await uploadFile(file, 6, false); // 6 epochs, temporary

  if (result.success) {
    // Save document metadata
    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        documentType,
        walrusBlobId: result.blobId,
        originalName: file.name,
        size: file.size,
      }),
    });
  }
};
```

## ⚙️ Configuration

### Environment Variables

```bash
# .env
WALRUS_API_BASE=https://api.walrus.storage/v1
WALRUS_EXPLORER_BASE=https://walruscan.io
WALRUS_DEFAULT_EPOCHS=2
WALRUS_DEFAULT_PERMANENT=false
```

### Storage Configuration

```javascript
// Default storage settings
const DEFAULT_CONFIG = {
  epochs: 2, // Storage duration (2 epochs ≈ 4 weeks)
  permanent: false, // Temporary storage
  timeout: 30000, // 30 seconds timeout
};
```

### Cost Estimation

```javascript
import { calculateStorageCost } from "../services/walrus";

const cost = calculateStorageCost(1024, 4, false);
console.log(cost.estimatedCostFormatted); // "0.000004096 ETH"
```

## 🔍 Verification on Walruscan

All uploaded blobs get real Walrus blob IDs that can be verified on [Walruscan Testnet](https://walruscan.io):

1. Upload a file using the integration
2. Copy the returned `blobId`
3. Visit `https://walruscan.io/blob/{blobId}`
4. Verify the blob exists and contains your data

## 🐛 Troubleshooting

### Common Issues

#### 1. Import Error: "@selfxyz/qrcode"

```bash
# Solution: Install the package
npm install @selfxyz/qrcode
```

#### 2. Network Timeout

```javascript
// Increase timeout in walrus.js
const walrusApi = axios.create({
  timeout: 60000, // 60 seconds
});
```

#### 3. File Size Limit

```javascript
// Increase limit in backend
const upload = multer({
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});
```

#### 4. CORS Issues

```javascript
// Add CORS middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);
```

### Error Handling

```javascript
const result = await uploadFile(file);
if (!result.success) {
  console.error("Upload failed:", result.error);
  // Handle error appropriately
}
```

### Debug Mode

```javascript
// Enable debug logging
console.log("🔄 Uploading to Walrus...", { size, epochs, permanent });
console.log("✅ Upload successful:", result.blobId);
console.log("❌ Upload failed:", error);
```

## 📚 Additional Resources

- [Walrus Storage Documentation](https://docs.walrus.storage/)
- [Walruscan Testnet Explorer](https://walruscan.io)
- [Walrus API Reference](https://api.walrus.storage/v1/docs)

## 🤝 Support

If you encounter any issues:

1. Check the console logs for detailed error messages
2. Verify your network connection to Walrus API
3. Ensure file sizes are within limits
4. Check that blob IDs are valid on Walruscan

## 🎯 Next Steps

1. **Test the Integration**: Use the provided components to upload test files
2. **Verify on Walruscan**: Check that your blobs appear on the testnet explorer
3. **Integrate with Your App**: Add Walrus storage to your existing features
4. **Database Integration**: Store blob metadata in your database
5. **Production Setup**: Configure for production environment

---

**Happy coding with Walrus Storage! 🦭**
