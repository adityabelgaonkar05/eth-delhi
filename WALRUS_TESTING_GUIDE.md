# 🦭 Walrus Testing Page Guide

## Overview

The Walrus Testing Page is a comprehensive testing interface for Walrus Storage integration. It provides a user-friendly way to test all Walrus functionality including uploads, downloads, metadata retrieval, and more.

## Accessing the Testing Page

### Method 1: Direct URL

Navigate to: `http://localhost:5173/walrus-testing`

### Method 2: Quick Navigation

Click the "🦭 Walrus Testing" button in the Quick Navigation panel (bottom-right corner of the screen).

## Features

### 📊 Test Statistics Dashboard

- **Uploaded Blobs**: Shows total number of blobs uploaded in current session
- **Passed Tests**: Number of successful test executions
- **Failed Tests**: Number of failed test executions
- **Total Tests**: Total number of tests run

### 🚀 Global Controls

- **Run All Tests**: Executes a comprehensive test suite
- **Clear Results**: Clears all test results from the log
- **Download Results**: Exports test results as JSON file

### 📁 Upload Tests Tab

- **File Upload**: Drag & drop or file picker for testing file uploads
- **Text Upload**: Upload text content directly
- **Storage Configuration**: Set epochs and storage type (temporary/permanent)

### 📊 Metadata Tests Tab

- **Get Blob Metadata**: Retrieve metadata for any blob ID
- **Current Blob Display**: Shows detailed information about the current blob
- **Explorer Links**: Direct links to view blobs on Walruscan

### ⬇️ Download Tests Tab

- **Download Blob Content**: Download and save blob content locally
- **Content Type Detection**: Shows MIME type and file size

### 📋 List Tests Tab

- **List Account Blobs**: View all blobs for a specific wallet address
- **Blob Management**: Quick actions for each blob (metadata, download, explorer)

### 💰 Cost Tests Tab

- **Storage Cost Estimation**: Calculate estimated costs for different file sizes
- **Interactive Calculator**: Adjust size, epochs, and storage type
- **Real-time Updates**: See cost changes as you modify parameters

### 📈 Test Results Tab

- **Real-time Log**: Live feed of all test executions
- **Color-coded Results**: Green for pass, red for fail
- **Detailed Information**: Timestamps, test names, and error details
- **Terminal-style Interface**: Easy-to-read console output

## How to Use

### 1. Basic Testing

1. Go to the **Upload Tests** tab
2. Configure storage settings (epochs, permanent/temporary)
3. Upload a test file or text content
4. Check the **Test Results** tab for results

### 2. Comprehensive Testing

1. Click **"🚀 Run All Tests"** button
2. Watch the **Test Results** tab for real-time updates
3. Review all test outcomes
4. Download results if needed

### 3. Individual Feature Testing

1. Navigate to specific tabs (Metadata, Download, List, Cost)
2. Enter required parameters (blob IDs, account addresses)
3. Click test buttons to execute specific tests
4. Monitor results in the Test Results tab

### 4. Cost Estimation

1. Go to **Cost Tests** tab
2. Adjust file size, epochs, and storage type
3. See real-time cost calculations
4. Use for planning storage budgets

## Test Scenarios

### Scenario 1: File Upload Workflow

1. **Upload Tests** → Upload a file
2. **Metadata Tests** → Get metadata for the uploaded blob
3. **Download Tests** → Download the blob content
4. **List Tests** → List all blobs for your account

### Scenario 2: Text Content Workflow

1. **Upload Tests** → Upload text content
2. **Metadata Tests** → Verify metadata
3. **Download Tests** → Download and verify content
4. **Cost Tests** → Calculate storage costs

### Scenario 3: Account Management

1. **List Tests** → Enter your wallet address
2. View all your uploaded blobs
3. Test metadata and download for each blob
4. Use explorer links to verify on Walruscan

## Understanding Test Results

### ✅ PASS Results

- Green text indicates successful test execution
- Includes details about what was accomplished
- Shows relevant data (blob IDs, file sizes, etc.)

### ❌ FAIL Results

- Red text indicates failed test execution
- Includes error messages and failure reasons
- Helps identify issues with Walrus integration

### Test Details

Each test result includes:

- **Timestamp**: When the test was executed
- **Test Name**: Which test was run
- **Result**: Pass or fail status
- **Details**: Additional information about the test

## Troubleshooting

### Common Issues

#### 1. Upload Failures

- Check network connection
- Verify file size limits
- Ensure valid storage configuration

#### 2. Metadata Retrieval Failures

- Verify blob ID is correct
- Check if blob exists on Walruscan
- Ensure blob hasn't expired

#### 3. Download Failures

- Verify blob ID is correct
- Check network connectivity
- Ensure blob content is accessible

#### 4. List Failures

- Verify account address format
- Check if account has any blobs
- Ensure proper wallet connection

### Debug Information

- All test results are logged with timestamps
- Error messages provide specific failure reasons
- Console logs show detailed debugging information
- Results can be exported for further analysis

## Best Practices

### 1. Test Order

- Start with upload tests
- Then test metadata retrieval
- Follow with download tests
- End with list and cost tests

### 2. Data Management

- Use small test files initially
- Clear results between test sessions
- Export results for record keeping
- Use temporary storage for testing

### 3. Error Handling

- Review failed tests carefully
- Check error messages for clues
- Verify network connectivity
- Ensure proper configuration

## Integration with Your App

The testing page uses the same Walrus integration components as your main application:

- **`useWalrus` hook**: Same hook used throughout your app
- **Walrus service**: Same service functions
- **Error handling**: Same error handling patterns
- **State management**: Same state management approach

This ensures that tests accurately reflect how Walrus integration works in your production application.

## Next Steps

1. **Run Initial Tests**: Start with basic upload/download tests
2. **Verify on Walruscan**: Check uploaded blobs on the testnet explorer
3. **Test Edge Cases**: Try different file types and sizes
4. **Monitor Performance**: Watch for timeout or performance issues
5. **Integrate Results**: Use successful test patterns in your main app

---

**Happy testing with Walrus Storage! 🦭**
