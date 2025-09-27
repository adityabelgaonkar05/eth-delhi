# Walrus Backend Integration

This document explains how the frontend walrus functionality is now connected to the backend walrus endpoints.

## Overview

The integration provides a seamless way to interact with Walrus storage through backend API endpoints instead of direct contract interactions. This approach offers several benefits:

- **Simplified frontend code**: No need to handle complex contract interactions
- **Better error handling**: Centralized error handling in the backend
- **Improved performance**: Backend can optimize requests and caching
- **Enhanced security**: Sensitive operations handled server-side

## Backend Endpoints

The following endpoints are available at `/api/walrus/`:

### 1. Upload Content

- **POST** `/api/walrus/upload`
- **Body**: `{ content: string|Array, epochs: number, permanent: boolean }`
- **Response**: Upload result with blobId and metadata

### 2. Retrieve Content

- **GET** `/api/walrus/retrieve/:blobId`
- **Response**: Retrieved content and metadata

### 3. Check Blob Status

- **GET** `/api/walrus/status/:blobId`
- **Response**: Blob status information

### 4. Process Oracle Request

- **POST** `/api/walrus/process-oracle-request`
- **Body**: `{ requestId: string, content: string, epochs: number, permanent: boolean }`
- **Response**: Oracle processing result

### 5. Health Check

- **GET** `/api/walrus/health`
- **Response**: Walrus service health status

## Frontend Integration

### API Service

The `WalrusApiService` class in `frontend/src/services/walrusApi.js` provides methods to interact with the backend endpoints:

```javascript
import walrusApi from "../services/walrusApi";

// Upload content
const result = await walrusApi.uploadToWalrus(content, epochs, permanent);

// Retrieve content
const content = await walrusApi.retrieveFromWalrus(blobId);

// Check status
const status = await walrusApi.checkBlobStatus(blobId);

// Health check
const health = await walrusApi.checkHealth();
```

### Contract Context Integration

The `ContractContext` now includes backend walrus functions that can be used in React components:

```javascript
import { useContracts } from "../context/ContractContext";

function MyComponent() {
  const {
    uploadToWalrusViaBackend,
    retrieveFromWalrusViaBackend,
    checkBlobStatusViaBackend,
    uploadFileToWalrusViaBackend,
    uploadTextToWalrusViaBackend,
    uploadJsonToWalrusViaBackend,
    checkWalrusHealthViaBackend,
  } = useContracts();

  // Use these functions in your component
}
```

### Available Functions

1. **`uploadToWalrusViaBackend(content, epochs, permanent)`**

   - Upload any content to Walrus storage
   - Returns blobId and metadata

2. **`retrieveFromWalrusViaBackend(blobId)`**

   - Retrieve content from Walrus storage
   - Returns content and metadata

3. **`checkBlobStatusViaBackend(blobId)`**

   - Check if a blob exists and get its status
   - Returns status information

4. **`uploadFileToWalrusViaBackend(file, epochs, permanent)`**

   - Upload a file to Walrus storage
   - Convenience method for file uploads

5. **`uploadTextToWalrusViaBackend(text, epochs, permanent)`**

   - Upload text content to Walrus storage
   - Convenience method for text uploads

6. **`uploadJsonToWalrusViaBackend(data, epochs, permanent)`**

   - Upload JSON data to Walrus storage
   - Convenience method for JSON uploads

7. **`checkWalrusHealthViaBackend()`**
   - Check the health of Walrus services
   - Returns health status

## Testing

A test component `WalrusTest.jsx` is available to test the integration:

1. Import and use the component in your app
2. Test uploading text and JSON data
3. Test retrieving content using blob IDs
4. Check service health status

## Environment Variables

Make sure to set the following environment variable in your frontend:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## Usage Examples

### Upload Text Content

```javascript
const { uploadTextToWalrusViaBackend } = useContracts();

const handleUpload = async () => {
  try {
    const result = await uploadTextToWalrusViaBackend(
      "Hello, Walrus Storage!",
      1, // epochs
      false // permanent
    );
    console.log("Upload successful:", result.blobId);
  } catch (error) {
    console.error("Upload failed:", error);
  }
};
```

### Upload JSON Data

```javascript
const { uploadJsonToWalrusViaBackend } = useContracts();

const handleUploadJson = async () => {
  try {
    const data = { message: "Test data", timestamp: new Date() };
    const result = await uploadJsonToWalrusViaBackend(data);
    console.log("JSON upload successful:", result.blobId);
  } catch (error) {
    console.error("JSON upload failed:", error);
  }
};
```

### Retrieve Content

```javascript
const { retrieveFromWalrusViaBackend } = useContracts();

const handleRetrieve = async (blobId) => {
  try {
    const result = await retrieveFromWalrusViaBackend(blobId);
    console.log("Retrieved content:", result.content);
  } catch (error) {
    console.error("Retrieval failed:", error);
  }
};
```

## Error Handling

All functions include comprehensive error handling and logging. Check the browser console for detailed error messages and operation logs.

## Migration from Direct Contract Calls

If you were previously using direct contract calls, you can now use the backend functions instead:

**Before (Direct Contract):**

```javascript
const result = await uploadToWalrus(walrusContract, fileBytes, storageTier);
```

**After (Backend API):**

```javascript
const result = await uploadToWalrusViaBackend(content, epochs, permanent);
```

The backend approach is simpler and doesn't require contract instances or gas payments.
