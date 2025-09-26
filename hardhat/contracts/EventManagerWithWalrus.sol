    struct VideoPremiereParams {
        string title;
        string description;
        uint256 premiereTime;
        bytes videoData;
        bytes thumbnailData;
        bytes trailerData;
        string videoTitle;
        string videoDescription;
        uint256 videoDuration;
        uint256 maxParticipants;
    }

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./UserRegistry.sol";
import "./EventNFTWithWalrus.sol";
import "./SelfProtocolIntegration.sol";
import "./WalrusStorage.sol";

/**
 * @title EventManagerWithWalrus
 * @dev Manages events with Self Protocol verification and Walrus storage for video premieres
 * @notice Event creation requires Self Protocol verification, video files stored on Walrus
 */
contract EventManagerWithWalrus is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    // State variables
    SelfProtocolIntegration public selfProtocol;
    UserRegistry public userRegistry;
    EventNFTWithWalrus public eventNFT;
    WalrusStorage public walrusStorage;

    struct Event {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 maxParticipants;
        uint256 currentParticipants;
        bool isActive;
        bool requiresVerification;
        EventType eventType;
        string metadataWalrusId;     // Event metadata on Walrus
    }

    struct VideoPremiereEvent {
        uint256 eventId;
        string videoWalrusId;        // Main video file on Walrus
        string thumbnailWalrusId;    // Thumbnail on Walrus
        string trailerWalrusId;      // Trailer/preview on Walrus
        uint256 videoDuration;       // Duration in seconds
        string videoTitle;
        string videoDescription;
        uint256 premiereTime;        // When video goes live
        bool isLive;
        uint256 viewCount;
        mapping(address => bool) hasWatched;
        mapping(address => uint256) watchTime; // Track watch duration
    }

    struct LiveStreamEvent {
        uint256 eventId;
        string streamKey;            // For external streaming platforms
        string streamWalrusId;       // Stream metadata on Walrus
        bool isLive;
        uint256 startTime;
        uint256 viewerCount;
        mapping(address => bool) currentViewers;
    }

    struct GameTournament {
        uint256 eventId;
        string gameTitle;
        uint256 prizePool;
        uint256 entryFee;
        string rulesWalrusId;        // Tournament rules on Walrus
        mapping(address => bool) isRegistered;
        mapping(address => uint256) playerScores;
        address[] leaderboard;
        bool tournamentEnded;
    }

    struct ArtShowcase {
        uint256 eventId;
        string showcaseWalrusId;     // Art collection metadata on Walrus
        mapping(uint256 => string) artworkWalrusIds; // Individual artworks
        uint256 artworkCount;
        mapping(address => bool) hasVoted;
        mapping(uint256 => uint256) artworkVotes;
        uint256 winningArtwork;
    }

    enum EventType {
        GENERAL,
        VIDEO_PREMIERE,
        LIVE_STREAM,
        GAME_TOURNAMENT,
        ART_SHOWCASE,
        VIRTUAL_MEETUP
    }

    // Storage mappings
    mapping(uint256 => Event) public events;
    mapping(uint256 => VideoPremiereEvent) public videoPremieres;
    mapping(uint256 => LiveStreamEvent) public liveStreams;
    mapping(uint256 => GameTournament) public gameTournaments;
    mapping(uint256 => ArtShowcase) public artShowcases;
    mapping(uint256 => mapping(address => bool)) public hasParticipated;
    mapping(address => uint256[]) public userEvents;
    mapping(string => uint256) public walrusIdToEventId; // Reverse mapping
    
    uint256 public nextEventId = 1;
    uint256 public totalEvents;
    uint256 public eventCreationFee = 50 ether; // 50 FLOW tokens

    // Events
    event EventCreated(uint256 indexed eventId, address indexed creator, string title, EventType eventType);
    event VideoPremiereCreated(uint256 indexed eventId, string videoWalrusId, string thumbnailWalrusId);
    event VideoStoredOnWalrus(uint256 indexed eventId, string walrusId, uint256 fileSize);
    event EventJoined(uint256 indexed eventId, address indexed participant);
    event EventCompleted(uint256 indexed eventId);
    event VideoPremiereLaunched(uint256 indexed eventId, uint256 premiereTime);
    event VideoWatched(uint256 indexed eventId, address indexed viewer, uint256 watchDuration);
    event TournamentRegistered(uint256 indexed eventId, address indexed player);
    event ArtworkSubmitted(uint256 indexed eventId, uint256 indexed artworkId, string walrusId);
    event SelfProtocolUpdated(address oldProtocol, address newProtocol);
    event WalrusStorageUpdated(address oldStorage, address newStorage);

    // Errors
    error InvalidAddress();
    error VerificationRequired();
    error EventNotFound();
    error EventNotActive();
    error EventFull();
    error AlreadyParticipated();
    error EventNotStarted();
    error EventEnded();
    error InsufficientPayment();
    error NotEventCreator();
    error WalrusStorageError();
    error InvalidEventType();
    error VideoTooLarge();
    error InvalidTimestamp();

    constructor(
        address _userRegistry,
        address _selfProtocol,
        address _eventNFT,
        address _walrusStorage
    ) {
        require(_userRegistry != address(0), "UserRegistry address cannot be zero");
        require(_selfProtocol != address(0), "SelfProtocol address cannot be zero");
        require(_eventNFT != address(0), "EventNFT address cannot be zero");
        require(_walrusStorage != address(0), "WalrusStorage address cannot be zero");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(CREATOR_ROLE, msg.sender);

        userRegistry = UserRegistry(_userRegistry);
        selfProtocol = SelfProtocolIntegration(_selfProtocol);
        eventNFT = EventNFTWithWalrus(payable(_eventNFT));
        walrusStorage = WalrusStorage(payable(_walrusStorage));
    }

    /**
     * @notice Create a video premiere event with video stored on Walrus
     * @dev Stores video file, thumbnail, and metadata on Walrus network
     */
    function createVideoPremiereEvent(VideoPremiereParams memory params) external payable whenNotPaused nonReentrant {
        if (!selfProtocol.isVerifiedHuman(msg.sender)) revert VerificationRequired();
        if (params.premiereTime <= block.timestamp) revert InvalidTimestamp();
        if (params.videoData.length == 0 || params.videoData.length > 5 * 1024 * 1024 * 1024) revert VideoTooLarge();

        (uint256 videoStorageCost, uint256 thumbnailStorageCost, uint256 trailerStorageCost) = _calculateStorageCosts(params.videoData.length, params.thumbnailData.length, params.trailerData.length);
        uint256 totalCost = eventCreationFee + videoStorageCost + thumbnailStorageCost + trailerStorageCost;
        if (msg.value < totalCost) revert InsufficientPayment();

        uint256 eventId = nextEventId++;
        (string memory videoWalrusId, string memory thumbnailWalrusId, string memory trailerWalrusId) = _storeAllBlobs(params, videoStorageCost, thumbnailStorageCost, trailerStorageCost);

        _createVideoPremiereEvent(eventId, params, videoWalrusId, thumbnailWalrusId, trailerWalrusId);

        userEvents[msg.sender].push(eventId);
        walrusIdToEventId[videoWalrusId] = eventId;
        totalEvents++;

        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit EventCreated(eventId, msg.sender, params.title, EventType.VIDEO_PREMIERE);
        emit VideoPremiereCreated(eventId, videoWalrusId, thumbnailWalrusId);
        emit VideoStoredOnWalrus(eventId, videoWalrusId, params.videoData.length);
    }

    function _storeAllBlobs(VideoPremiereParams memory params, uint256 videoStorageCost, uint256 thumbnailStorageCost, uint256 trailerStorageCost) internal returns (string memory, string memory, string memory) {
        string memory videoWalrusId = _storeVideo(params.videoData, videoStorageCost);
        string memory thumbnailWalrusId = _storeThumbnail(params.thumbnailData, thumbnailStorageCost);
        string memory trailerWalrusId = _storeTrailer(params.trailerData, trailerStorageCost);
        return (videoWalrusId, thumbnailWalrusId, trailerWalrusId);
    }

    function _createVideoPremiereEvent(
        uint256 eventId,
        VideoPremiereParams memory params,
        string memory videoWalrusId,
        string memory thumbnailWalrusId,
        string memory trailerWalrusId
    ) internal {
        events[eventId] = Event({
            id: eventId,
            creator: msg.sender,
            title: params.title,
            description: params.description,
            startTime: params.premiereTime,
            endTime: params.premiereTime + params.videoDuration + 1 hours,
            maxParticipants: params.maxParticipants,
            currentParticipants: 0,
            isActive: true,
            requiresVerification: true,
            eventType: EventType.VIDEO_PREMIERE,
            metadataWalrusId: ""
        });

        VideoPremiereEvent storage premiere = videoPremieres[eventId];
        premiere.eventId = eventId;
        premiere.videoWalrusId = videoWalrusId;
        premiere.thumbnailWalrusId = thumbnailWalrusId;
        premiere.trailerWalrusId = trailerWalrusId;
        premiere.videoDuration = params.videoDuration;
        premiere.videoTitle = params.videoTitle;
        premiere.videoDescription = params.videoDescription;
        premiere.premiereTime = params.premiereTime;
        premiere.isLive = false;
        premiere.viewCount = 0;
    }

    function _calculateStorageCosts(uint256 videoLen, uint256 thumbLen, uint256 trailerLen) internal view returns (uint256, uint256, uint256) {
        uint256 videoStorageCost = walrusStorage.calculateStorageCost(videoLen, WalrusStorage.StorageTier.STANDARD);
        uint256 thumbnailStorageCost = walrusStorage.calculateStorageCost(thumbLen, WalrusStorage.StorageTier.STANDARD);
        uint256 trailerStorageCost = 0;
        if (trailerLen > 0) {
            trailerStorageCost = walrusStorage.calculateStorageCost(trailerLen, WalrusStorage.StorageTier.STANDARD);
        }
        return (videoStorageCost, thumbnailStorageCost, trailerStorageCost);
    }

    function _storeVideo(bytes memory _videoData, uint256 videoStorageCost) internal returns (string memory) {
        try walrusStorage.storeBlob{value: videoStorageCost}(_videoData, WalrusStorage.StorageTier.STANDARD, false) returns (string memory blobId) {
            return blobId;
        } catch {
            revert WalrusStorageError();
        }
    }

    function _storeThumbnail(bytes memory _thumbnailData, uint256 thumbnailStorageCost) internal returns (string memory) {
        try walrusStorage.storeBlob{value: thumbnailStorageCost}(_thumbnailData, WalrusStorage.StorageTier.STANDARD, true) returns (string memory blobId) {
            return blobId;
        } catch {
            revert WalrusStorageError();
        }
    }

    function _storeTrailer(bytes memory _trailerData, uint256 trailerStorageCost) internal returns (string memory) {
        if (_trailerData.length == 0) {
            return "";
        }
        try walrusStorage.storeBlob{value: trailerStorageCost}(_trailerData, WalrusStorage.StorageTier.STANDARD, true) returns (string memory blobId) {
            return blobId;
        } catch {
            return "";
        }
    }

    /**
     * @notice Launch a video premiere (make video public)
     */
    function launchVideoPremiere(uint256 _eventId) external {
        Event storage eventData = events[_eventId];
        if (eventData.id == 0) revert EventNotFound();
        if (eventData.creator != msg.sender) revert NotEventCreator();
        if (eventData.eventType != EventType.VIDEO_PREMIERE) revert InvalidEventType();

        VideoPremiereEvent storage premiere = videoPremieres[_eventId];
        if (block.timestamp < premiere.premiereTime) revert EventNotStarted();

        premiere.isLive = true;

        // TODO: In a full implementation, we would make the video blob public on Walrus here
        // This could be done through the oracle by calling setBlobAttribute or similar

        emit VideoPremiereLaunched(_eventId, premiere.premiereTime);
    }

    /**
     * @notice Join a video premiere event
     */
    function joinVideoPremiere(uint256 _eventId) external whenNotPaused {
        // Verify human status with Self Protocol
        if (!selfProtocol.isVerifiedHuman(msg.sender)) {
            revert VerificationRequired();
        }

        Event storage eventData = events[_eventId];
        if (eventData.id == 0) revert EventNotFound();
        if (!eventData.isActive) revert EventNotActive();
        if (eventData.eventType != EventType.VIDEO_PREMIERE) revert InvalidEventType();
        if (hasParticipated[_eventId][msg.sender]) revert AlreadyParticipated();
        if (eventData.currentParticipants >= eventData.maxParticipants) revert EventFull();

        hasParticipated[_eventId][msg.sender] = true;
        eventData.currentParticipants++;
        userEvents[msg.sender].push(_eventId);

        emit EventJoined(_eventId, msg.sender);
    }

    /**
     * @notice Get video content from Walrus (for premiere participants)
     */
    function getVideoContent(uint256 _eventId) external view returns (
        bytes memory videoContent,
        string memory metadata
    ) {
        Event storage eventData = events[_eventId];
        if (eventData.id == 0) revert EventNotFound();
        if (eventData.eventType != EventType.VIDEO_PREMIERE) revert InvalidEventType();

        VideoPremiereEvent storage premiere = videoPremieres[_eventId];
        
        // Check if user can access video
        if (!premiere.isLive && eventData.creator != msg.sender) {
            revert EventNotStarted();
        }

        if (!hasParticipated[_eventId][msg.sender] && eventData.creator != msg.sender) {
            revert VerificationRequired();
        }

        // Retrieve video from Walrus
        return walrusStorage.retrieveBlob(premiere.videoWalrusId);
    }

    /**
     * @notice Get thumbnail for video premiere
     */
    function getVideoThumbnail(uint256 _eventId) external view returns (
        bytes memory thumbnailData,
        string memory metadata
    ) {
        Event storage eventData = events[_eventId];
        if (eventData.id == 0) revert EventNotFound();
        if (eventData.eventType != EventType.VIDEO_PREMIERE) revert InvalidEventType();

        VideoPremiereEvent storage premiere = videoPremieres[_eventId];
        return walrusStorage.retrieveBlob(premiere.thumbnailWalrusId);
    }

    /**
     * @notice Record video watch time for analytics
     */
    function recordVideoWatch(uint256 _eventId, uint256 _watchDuration) external {
        if (!hasParticipated[_eventId][msg.sender]) {
            revert VerificationRequired();
        }

        VideoPremiereEvent storage premiere = videoPremieres[_eventId];
        if (!premiere.hasWatched[msg.sender]) {
            premiere.hasWatched[msg.sender] = true;
            premiere.viewCount++;
        }

        premiere.watchTime[msg.sender] = _watchDuration;

        emit VideoWatched(_eventId, msg.sender, _watchDuration);
    }

    /**
     * @notice Create a general event (non-video)
     */
    function createEvent(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _maxParticipants,
        bool _requiresVerification,
        EventType _eventType
    ) external payable whenNotPaused nonReentrant {
        // Verify human status with Self Protocol
        if (!selfProtocol.isVerifiedHuman(msg.sender)) {
            revert VerificationRequired();
        }

        if (_startTime <= block.timestamp || _endTime <= _startTime) {
            revert InvalidTimestamp();
        }

        if (msg.value < eventCreationFee) {
            revert InsufficientPayment();
        }

        uint256 eventId = nextEventId++;

        events[eventId] = Event({
            id: eventId,
            creator: msg.sender,
            title: _title,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            maxParticipants: _maxParticipants,
            currentParticipants: 0,
            isActive: true,
            requiresVerification: _requiresVerification,
            eventType: _eventType,
            metadataWalrusId: ""
        });

        userEvents[msg.sender].push(eventId);
        totalEvents++;

        // Refund excess payment
        if (msg.value > eventCreationFee) {
            payable(msg.sender).transfer(msg.value - eventCreationFee);
        }

        emit EventCreated(eventId, msg.sender, _title, _eventType);
    }

    /**
     * @notice Get event details including Walrus content
     */
    function getEventDetails(uint256 _eventId) external view returns (
        Event memory eventData,
        bool isVideoPremiere,
        string memory videoWalrusId,
        string memory thumbnailWalrusId,
        bool isLive
    ) {
        Event memory eventInfo = events[_eventId];
        if (eventInfo.id == 0) revert EventNotFound();

        if (eventInfo.eventType == EventType.VIDEO_PREMIERE) {
            VideoPremiereEvent storage premiere = videoPremieres[_eventId];
            return (
                eventInfo,
                true,
                premiere.videoWalrusId,
                premiere.thumbnailWalrusId,
                premiere.isLive
            );
        }

        return (eventInfo, false, "", "", false);
    }

    /**
     * @notice Get events by creator
     */
    function getEventsByCreator(address _creator) external view returns (uint256[] memory) {
        return userEvents[_creator];
    }

    /**
     * @notice Get event by Walrus video ID
     */
    function getEventByWalrusId(string calldata _walrusId) external view returns (uint256) {
        return walrusIdToEventId[_walrusId];
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

    function updateEventCreationFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        eventCreationFee = _newFee;
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

    receive() external payable {}
}