// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./UserRegistry.sol";
import "./SelfProtocolIntegration.sol";
import "./WalrusStorage.sol";

/**
 * @title BlogManagerWithWalrus
 * @dev Manages blog content with real Self Protocol human verification and Walrus storage
 * @notice Blog creation and interaction requires Self Protocol verification, content stored on Walrus
 */
contract BlogManagerWithWalrus is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AUTHOR_ROLE = keccak256("AUTHOR_ROLE");

    // State variables
    SelfProtocolIntegration public selfProtocol;
    UserRegistry public userRegistry;
    WalrusStorage public walrusStorage;

    struct BlogPost {
        uint256 id;
        address author;
        string title;
        string walrusBlobId;        // Real Walrus blob ID for content
        string walrusMetadataId;    // Walrus blob ID for metadata
        uint256 publishedAt;
        uint256 likes;
        uint256 views;
        bool isActive;
        bool isPremium;
        uint256 contentSize;        // Size of content in bytes
        WalrusStorage.StorageTier tier; // Storage tier used
    }

    struct BlogMetadata {
        string description;
        string[] tags;
        string category;
        string thumbnailBlobId;     // Walrus blob ID for thumbnail
        uint256 estimatedReadTime;
        string language;
        bool allowComments;
        uint256 premiumPrice;       // Price for premium content access
    }

    struct Comment {
        uint256 id;
        uint256 blogId;
        address author;
        string walrusBlobId;        // Comment stored on Walrus
        uint256 timestamp;
        bool isActive;
        uint256 likes;
    }

    struct BlogStats {
        uint256 totalViews;
        uint256 uniqueViewers;
        uint256 totalLikes;
        uint256 totalComments;
        uint256 totalShares;
        mapping(address => bool) viewers;
        mapping(address => bool) likers;
    }

    // Storage mappings
    mapping(uint256 => BlogPost) public blogPosts;
    mapping(uint256 => BlogMetadata) public blogMetadata;
    mapping(uint256 => Comment[]) public blogComments;
    mapping(uint256 => BlogStats) private blogStats;
    mapping(uint256 => mapping(address => bool)) public hasLiked;
    mapping(uint256 => mapping(address => bool)) public hasViewed;
    mapping(uint256 => mapping(address => bool)) public hasPurchased; // For premium content
    mapping(address => uint256[]) public authorBlogs;
    mapping(string => uint256) public walrusBlobToBlogId; // Reverse mapping
    
    uint256 public nextBlogId = 1;
    uint256 public nextCommentId = 1;
    uint256 public totalBlogs;
    uint256 public publishingFee = 100 ether; // 100 FLOW tokens
    uint256 public walrusStorageBudget = 10 ether; // Budget for Walrus storage per blog

    // Events
    event BlogPublished(
        uint256 indexed blogId, 
        address indexed author, 
        string title, 
        string walrusBlobId,
        string walrusMetadataId
    );
    event BlogContentStored(uint256 indexed blogId, string walrusBlobId, uint256 contentSize);
    event BlogMetadataStored(uint256 indexed blogId, string metadataId);
    event BlogLiked(uint256 indexed blogId, address indexed liker);
    event BlogViewed(uint256 indexed blogId, address indexed viewer);
    event CommentAdded(uint256 indexed blogId, uint256 indexed commentId, address indexed commenter, string walrusBlobId);
    event PremiumContentPurchased(uint256 indexed blogId, address indexed purchaser, uint256 price);
    event BlogContentExtended(uint256 indexed blogId, uint256 additionalEpochs);
    event SelfProtocolUpdated(address oldProtocol, address newProtocol);
    event WalrusStorageUpdated(address oldStorage, address newStorage);
    event PublishingFeeUpdated(uint256 oldFee, uint256 newFee);

    // Errors
    error InvalidAddress();
    error VerificationRequired();
    error BlogNotFound();
    error BlogNotActive();
    error AlreadyLiked();
    error InsufficientPayment();
    error NotBlogAuthor();
    error EmptyContent();
    error WalrusStorageError();
    error PremiumContentNotPurchased();
    error ContentTooLarge();

    constructor(
        address _userRegistry,
        address _selfProtocol,
        address _walrusStorage
    ) {
        require(_userRegistry != address(0), "UserRegistry address cannot be zero");
        require(_selfProtocol != address(0), "SelfProtocol address cannot be zero");
        require(_walrusStorage != address(0), "WalrusStorage address cannot be zero");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        userRegistry = UserRegistry(_userRegistry);
        selfProtocol = SelfProtocolIntegration(_selfProtocol);
        walrusStorage = WalrusStorage(payable(_walrusStorage));
    }

    /**
     * @notice Publish a new blog post with content stored on Walrus
     * @dev Requires Self Protocol verification, stores content and metadata on Walrus
     */
    function publishBlog(
        string memory _title,
        bytes calldata _content,
        BlogMetadata memory _metadata,
        bool _isPremium,
        WalrusStorage.StorageTier _storageTier
    ) external payable whenNotPaused nonReentrant {
        // Verify human status with Self Protocol
        if (!selfProtocol.isUserVerified(msg.sender)) revert VerificationRequired();
        if (bytes(_title).length == 0 || _content.length == 0) revert EmptyContent();
        if (_content.length > 13 * 1024 * 1024 * 1024) revert ContentTooLarge();

        uint256 walrusContentCost = walrusStorage.calculateStorageCost(_content.length, _storageTier);
        uint256 totalCost = publishingFee + walrusContentCost;
        if (msg.value < totalCost) revert InsufficientPayment();

        uint256 blogId = nextBlogId++;
        string memory walrusBlobId = _storeBlogContent(_content, _storageTier, !_isPremium, walrusContentCost);
        (string memory metadataId, uint256 metadataCost) = _storeBlogMetadata(_metadata, _storageTier, msg.value, totalCost);
        _createBlogPost(blogId, _title, walrusBlobId, metadataId, _isPremium, _content.length, _storageTier, _metadata);

        // Refund excess payment
        uint256 actualCost = totalCost;
        if (bytes(metadataId).length > 0) actualCost += metadataCost;
        if (msg.value > actualCost) payable(msg.sender).transfer(msg.value - actualCost);

        emit BlogPublished(blogId, msg.sender, _title, walrusBlobId, metadataId);
        emit BlogContentStored(blogId, walrusBlobId, _content.length);
        if (bytes(metadataId).length > 0) emit BlogMetadataStored(blogId, metadataId);
    }

    function _storeBlogContent(
        bytes calldata _content,
        WalrusStorage.StorageTier _storageTier,
        bool _isPublic,
        uint256 walrusContentCost
    ) internal returns (string memory walrusBlobId) {
        try walrusStorage.storeBlob{value: walrusContentCost}(_content, _storageTier, _isPublic) returns (string memory blobId) {
            walrusBlobId = blobId;
        } catch {
            revert WalrusStorageError();
        }
    }

    function _storeBlogMetadata(
        BlogMetadata memory _metadata,
        WalrusStorage.StorageTier _storageTier,
        uint256 msgValue,
        uint256 totalCost
    ) internal returns (string memory metadataId, uint256 metadataCost) {
        bytes memory metadataJson = _encodeMetadata(_metadata);
        metadataCost = walrusStorage.calculateStorageCost(metadataJson.length, _storageTier);
        metadataId = "";
        if (msgValue >= totalCost + metadataCost) {
            try walrusStorage.storeBlob{value: metadataCost}(metadataJson, _storageTier, true) returns (string memory blobId) {
                metadataId = blobId;
            } catch {
                metadataId = "";
            }
        }
    }

    function _createBlogPost(
        uint256 blogId,
        string memory _title,
        string memory walrusBlobId,
        string memory metadataId,
        bool _isPremium,
        uint256 contentLength,
        WalrusStorage.StorageTier _storageTier,
        BlogMetadata memory _metadata
    ) internal {
        blogPosts[blogId] = BlogPost({
            id: blogId,
            author: msg.sender,
            title: _title,
            walrusBlobId: walrusBlobId,
            walrusMetadataId: metadataId,
            publishedAt: block.timestamp,
            likes: 0,
            views: 0,
            isActive: true,
            isPremium: _isPremium,
            contentSize: contentLength,
            tier: _storageTier
        });
        blogMetadata[blogId] = _metadata;
        authorBlogs[msg.sender].push(blogId);
        walrusBlobToBlogId[walrusBlobId] = blogId;
        totalBlogs++;
        BlogStats storage stats = blogStats[blogId];
        stats.totalViews = 0;
        stats.uniqueViewers = 0;
        stats.totalLikes = 0;
        stats.totalComments = 0;
        stats.totalShares = 0;
    }

    /**
     * @notice Retrieve blog content from Walrus
     * @dev Checks premium access and retrieves content from Walrus storage
     */
    function getBlogContent(uint256 _blogId) external view returns (
        bytes memory content,
        string memory metadata
    ) {
        BlogPost storage blog = blogPosts[_blogId];
        if (blog.id == 0) revert BlogNotFound();
        if (!blog.isActive) revert BlogNotActive();

        // Check premium access
        if (blog.isPremium && blog.author != msg.sender && !hasPurchased[_blogId][msg.sender]) {
            revert PremiumContentNotPurchased();
        }

        // Retrieve from Walrus
        return walrusStorage.retrieveBlob(blog.walrusBlobId);
    }

    /**
     * @notice Get blog metadata from Walrus
     */
    function getBlogMetadataFromWalrus(uint256 _blogId) external view returns (
        bytes memory metadata
    ) {
        BlogPost storage blog = blogPosts[_blogId];
        if (blog.id == 0) revert BlogNotFound();
        if (bytes(blog.walrusMetadataId).length == 0) {
            return new bytes(0);
        }

        (bytes memory metadataBytes,) = walrusStorage.retrieveBlob(blog.walrusMetadataId);
        return metadataBytes;
    }

    /**
     * @notice Purchase access to premium blog content
     */
    function purchasePremiumAccess(uint256 _blogId) external payable whenNotPaused {
        BlogPost storage blog = blogPosts[_blogId];
        if (blog.id == 0) revert BlogNotFound();
        if (!blog.isActive) revert BlogNotActive();
        if (!blog.isPremium) return; // Not premium, no payment needed

        BlogMetadata storage metadata = blogMetadata[_blogId];
        if (msg.value < metadata.premiumPrice) {
            revert InsufficientPayment();
        }

        hasPurchased[_blogId][msg.sender] = true;

        // Transfer payment to author (minus platform fee)
        uint256 platformFee = (metadata.premiumPrice * 5) / 100; // 5% platform fee
        uint256 authorPayment = metadata.premiumPrice - platformFee;
        
        payable(blog.author).transfer(authorPayment);
        // Platform fee stays in contract

        // Refund excess
        if (msg.value > metadata.premiumPrice) {
            payable(msg.sender).transfer(msg.value - metadata.premiumPrice);
        }

        emit PremiumContentPurchased(_blogId, msg.sender, metadata.premiumPrice);
    }

    /**
     * @notice Like a blog post
     * @dev Requires Self Protocol verification
     */
    function likeBlog(uint256 _blogId) external whenNotPaused {
        // Verify human status with Self Protocol
        if (!selfProtocol.isUserVerified(msg.sender)) {
            revert VerificationRequired();
        }

        BlogPost storage blog = blogPosts[_blogId];
        if (blog.id == 0) revert BlogNotFound();
        if (!blog.isActive) revert BlogNotActive();
        if (hasLiked[_blogId][msg.sender]) revert AlreadyLiked();

        hasLiked[_blogId][msg.sender] = true;
        blog.likes++;

        BlogStats storage stats = blogStats[_blogId];
        if (!stats.likers[msg.sender]) {
            stats.likers[msg.sender] = true;
            stats.totalLikes++;
        }

        emit BlogLiked(_blogId, msg.sender);
    }

    /**
     * @notice View a blog post (tracking analytics)
     */
    function viewBlog(uint256 _blogId) external whenNotPaused {
        BlogPost storage blog = blogPosts[_blogId];
        if (blog.id == 0) revert BlogNotFound();
        if (!blog.isActive) revert BlogNotActive();

        if (!hasViewed[_blogId][msg.sender]) {
            hasViewed[_blogId][msg.sender] = true;
            blog.views++;

            BlogStats storage stats = blogStats[_blogId];
            if (!stats.viewers[msg.sender]) {
                stats.viewers[msg.sender] = true;
                stats.uniqueViewers++;
            }
            stats.totalViews++;

            emit BlogViewed(_blogId, msg.sender);
        }
    }

    /**
     * @notice Add a comment to a blog post (stored on Walrus)
     */
    function addComment(
        uint256 _blogId,
        bytes calldata _commentContent
    ) external payable whenNotPaused nonReentrant {
        // Verify human status with Self Protocol
        if (!selfProtocol.isUserVerified(msg.sender)) {
            revert VerificationRequired();
        }

        BlogPost storage blog = blogPosts[_blogId];
        if (blog.id == 0) revert BlogNotFound();
        if (!blog.isActive) revert BlogNotActive();

        BlogMetadata storage metadata = blogMetadata[_blogId];
        if (!metadata.allowComments) return;

        if (_commentContent.length == 0) {
            revert EmptyContent();
        }

        // Store comment on Walrus
        uint256 commentCost = walrusStorage.calculateStorageCost(
            _commentContent.length, 
            WalrusStorage.StorageTier.EPHEMERAL // Comments use ephemeral storage
        );
        
        if (msg.value < commentCost) {
            revert InsufficientPayment();
        }

        string memory commentBlobId;
        try walrusStorage.storeBlob{value: commentCost}(
            _commentContent,
            WalrusStorage.StorageTier.EPHEMERAL,
            true // Comments are public
        ) returns (string memory blobId) {
            commentBlobId = blobId;
        } catch {
            revert WalrusStorageError();
        }

        uint256 commentId = nextCommentId++;
        
        Comment memory newComment = Comment({
            id: commentId,
            blogId: _blogId,
            author: msg.sender,
            walrusBlobId: commentBlobId,
            timestamp: block.timestamp,
            isActive: true,
            likes: 0
        });

        blogComments[_blogId].push(newComment);
        blogStats[_blogId].totalComments++;

        // Refund excess payment
        if (msg.value > commentCost) {
            payable(msg.sender).transfer(msg.value - commentCost);
        }

        emit CommentAdded(_blogId, commentId, msg.sender, commentBlobId);
    }

    /**
     * @notice Extend blog content storage duration on Walrus
     */
    function extendBlogStorage(uint256 _blogId, uint256 _additionalPeriod) external payable {
        BlogPost storage blog = blogPosts[_blogId];
        if (blog.id == 0) revert BlogNotFound();
        if (blog.author != msg.sender) revert NotBlogAuthor();

        try walrusStorage.extendBlobStorage{value: msg.value}(blog.walrusBlobId, _additionalPeriod) {
            emit BlogContentExtended(_blogId, _additionalPeriod / 2 weeks); // Convert to epochs
        } catch {
            revert WalrusStorageError();
        }
    }

    /**
     * @notice Get comprehensive blog statistics
     */
    function getBlogStats(uint256 _blogId) external view returns (
        uint256 totalViews,
        uint256 uniqueViewers,
        uint256 totalLikes,
        uint256 totalComments,
        uint256 totalShares
    ) {
        BlogStats storage stats = blogStats[_blogId];
        return (
            stats.totalViews,
            stats.uniqueViewers,
            stats.totalLikes,
            stats.totalComments,
            stats.totalShares
        );
    }

    /**
     * @notice Get blogs by author with pagination
     */
    function getBlogsByAuthor(
        address _author,
        uint256 _offset,
        uint256 _limit
    ) external view returns (uint256[] memory blogIds) {
        uint256[] memory allBlogs = authorBlogs[_author];
        
        if (_offset >= allBlogs.length) {
            return new uint256[](0);
        }
        
        uint256 end = _offset + _limit;
        if (end > allBlogs.length) {
            end = allBlogs.length;
        }
        
        blogIds = new uint256[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            blogIds[i - _offset] = allBlogs[i];
        }
        
        return blogIds;
    }

    /**
     * @notice Get blog by Walrus blob ID
     */
    function getBlogByWalrusId(string calldata _walrusBlobId) external view returns (uint256 blogId) {
        return walrusBlobToBlogId[_walrusBlobId];
    }

    // Admin functions
    function updateSelfProtocol(address _newSelfProtocol) external onlyRole(ADMIN_ROLE) {
        if (_newSelfProtocol == address(0)) revert InvalidAddress();
        
        address oldProtocol = address(selfProtocol);
        selfProtocol = SelfProtocolIntegration(_newSelfProtocol);
        emit SelfProtocolUpdated(oldProtocol, _newSelfProtocol);
    }

    function updateWalrusStorage(address _newWalrusStorage) external onlyRole(ADMIN_ROLE) {
        if (_newWalrusStorage == address(0)) revert InvalidAddress();
        
        address oldStorage = address(walrusStorage);
        walrusStorage = WalrusStorage(payable(_newWalrusStorage));
        emit WalrusStorageUpdated(oldStorage, _newWalrusStorage);
    }

    function updatePublishingFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        uint256 oldFee = publishingFee;
        publishingFee = _newFee;
        emit PublishingFeeUpdated(oldFee, _newFee);
    }

    function withdrawFunds() external onlyRole(ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Internal functions
    function _encodeMetadata(BlogMetadata memory _metadata) internal pure returns (bytes memory) {
        // Simple JSON encoding for metadata
        return abi.encode(
            _metadata.description,
            _metadata.tags,
            _metadata.category,
            _metadata.thumbnailBlobId,
            _metadata.estimatedReadTime,
            _metadata.language,
            _metadata.allowComments,
            _metadata.premiumPrice
        );
    }

    receive() external payable {}
}