/**
 * Walrus Integration Example
 *
 * This file demonstrates how to integrate Walrus Storage into your existing backend.
 * Copy the relevant parts into your main server file.
 */

const express = require("express");
const cors = require("cors");
const walrusRoutes = require("../routes/walrusRoutes");

// Example server setup
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Add Walrus routes
app.use("/api/walrus", walrusRoutes);

// Example: Add to your existing routes
app.use("/api", (req, res, next) => {
  console.log("API request:", req.method, req.path);
  next();
});

// Example: Blog post with Walrus storage
app.post("/api/blogs", async (req, res) => {
  try {
    const { title, content, authorId, metadata } = req.body;

    // Upload blog content to Walrus
    const { uploadBlob, textToBuffer } = require("../services/walrusService");

    const contentBuffer = textToBuffer(content);
    const walrusResult = await uploadBlob(contentBuffer, 4, false); // 4 epochs, temporary

    if (!walrusResult.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to store content in Walrus",
      });
    }

    // Save blog metadata to your database
    const blogRecord = {
      title,
      authorId,
      walrusBlobId: walrusResult.blobId,
      walrusObjectId: walrusResult.objectId,
      contentSize: content.length,
      storageEpochs: 4,
      permanent: false,
      explorerUrl: walrusResult.explorerUrl,
      metadata: metadata || {},
      createdAt: new Date(),
    };

    // Example database save (adapt to your database)
    // const result = await db.collection('blogs').insertOne(blogRecord);

    res.json({
      success: true,
      message: "Blog created successfully",
      blog: {
        id: "generated-id", // result.insertedId if using database
        title,
        authorId,
        walrusBlobId: walrusResult.blobId,
        explorerUrl: walrusResult.explorerUrl,
        createdAt: blogRecord.createdAt,
      },
      walrus: walrusResult,
    });
  } catch (error) {
    console.error("Blog creation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create blog",
    });
  }
});

// Example: Get blog content from Walrus
app.get("/api/blogs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get blog metadata from your database
    // const blog = await db.collection('blogs').findOne({ _id: id });

    // Example blog data
    const blog = {
      _id: id,
      title: "Sample Blog",
      walrusBlobId: "0x1234...",
      authorId: "user123",
    };

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found",
      });
    }

    // Get content from Walrus
    const { downloadBlob } = require("../services/walrusService");
    const walrusResult = await downloadBlob(blog.walrusBlobId);

    if (!walrusResult.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to retrieve content from Walrus",
      });
    }

    // Convert buffer back to text
    const content = walrusResult.content.toString("utf8");

    res.json({
      success: true,
      blog: {
        id: blog._id,
        title: blog.title,
        content,
        authorId: blog.authorId,
        walrusBlobId: blog.walrusBlobId,
        explorerUrl: walrusResult.explorerUrl,
        contentSize: walrusResult.size,
      },
    });
  } catch (error) {
    console.error("Blog retrieval error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve blog",
    });
  }
});

// Example: User profile with avatar stored in Walrus
app.post("/api/users/:userId/avatar", async (req, res) => {
  try {
    const { userId } = req.params;
    const { avatarData, mimeType } = req.body; // Base64 encoded image data

    if (!avatarData) {
      return res.status(400).json({
        success: false,
        error: "Avatar data is required",
      });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(avatarData, "base64");

    // Upload to Walrus
    const { uploadBlob } = require("../services/walrusService");
    const walrusResult = await uploadBlob(buffer, 10, true); // 10 epochs, permanent

    if (!walrusResult.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to upload avatar to Walrus",
      });
    }

    // Update user record in database
    const updateData = {
      avatarWalrusBlobId: walrusResult.blobId,
      avatarWalrusObjectId: walrusResult.objectId,
      avatarSize: buffer.length,
      avatarMimeType: mimeType || "image/jpeg",
      avatarExplorerUrl: walrusResult.explorerUrl,
      updatedAt: new Date(),
    };

    // Example database update (adapt to your database)
    // await db.collection('users').updateOne(
    //   { _id: userId },
    //   { $set: updateData }
    // );

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      avatar: {
        blobId: walrusResult.blobId,
        size: buffer.length,
        mimeType: mimeType || "image/jpeg",
        explorerUrl: walrusResult.explorerUrl,
      },
      walrus: walrusResult,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload avatar",
    });
  }
});

// Example: Get user avatar from Walrus
app.get("/api/users/:userId/avatar", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user data from database
    // const user = await db.collection('users').findOne({ _id: userId });

    // Example user data
    const user = {
      _id: userId,
      avatarWalrusBlobId: "0x5678...",
      avatarMimeType: "image/jpeg",
    };

    if (!user || !user.avatarWalrusBlobId) {
      return res.status(404).json({
        success: false,
        error: "Avatar not found",
      });
    }

    // Get avatar from Walrus
    const { downloadBlob } = require("../services/walrusService");
    const walrusResult = await downloadBlob(user.avatarWalrusBlobId);

    if (!walrusResult.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to retrieve avatar from Walrus",
      });
    }

    // Set appropriate headers and send image
    res.set({
      "Content-Type": user.avatarMimeType,
      "Content-Length": walrusResult.size,
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    });

    res.send(walrusResult.content);
  } catch (error) {
    console.error("Avatar retrieval error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve avatar",
    });
  }
});

// Example: List all user's Walrus blobs
app.get("/api/users/:userId/walrus-blobs", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Get user's blobs from database
    const { getUserBlobsFromDatabase } = require("../services/walrusService");

    // Example database query (adapt to your database)
    // const result = await getUserBlobsFromDatabase(db, userId, {
    //   limit: parseInt(limit),
    //   offset: parseInt(offset),
    // });

    // For now, return empty result
    const result = {
      success: true,
      blobs: [],
      total: 0,
      hasMore: false,
    };

    res.json({
      success: true,
      userId,
      blobs: result.blobs,
      pagination: {
        total: result.total,
        hasMore: result.hasMore,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("List user blobs error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list user blobs",
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: error.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `🦭 Walrus Storage API available at http://localhost:${PORT}/api/walrus`
  );
  console.log(`📊 Health check: http://localhost:${PORT}/api/walrus/health`);
});

module.exports = app;
