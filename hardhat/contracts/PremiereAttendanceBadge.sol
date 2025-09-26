// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./WalrusStorage.sol";

/**
 * @title PremiereAttendanceBadge
 * @dev NFT badges for video premiere attendance with Walrus metadata storage
 * @notice Specialized NFT contract for minting attendance badges for video premieres
 */
contract PremiereAttendanceBadge is ERC721URIStorage, AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    WalrusStorage public walrusStorage;
    
    struct BadgeMetadata {
        uint256 tokenId;
        uint256 premiereId;
        string premiereTitle;
        string videoWalrusHash;
        string thumbnailWalrusHash;
        uint256 mintedAt;
        address attendee;
        string metadataWalrusId;
    }
    
    // Storage
    mapping(uint256 => BadgeMetadata) public badgeMetadata;
    mapping(uint256 => uint256[]) public premiereTokens; // premiereId => tokenIds
    mapping(address => uint256[]) public attendeeBadges;  // attendee => tokenIds
    
    uint256 private _tokenIdCounter = 1;
    
    // Events
    event AttendanceBadgeMinted(
        uint256 indexed tokenId,
        uint256 indexed premiereId,
        address indexed attendee,
        string metadataWalrusId
    );
    
    constructor(address _walrusStorage) ERC721("Premiere Attendance Badge", "PAB") {
        require(_walrusStorage != address(0), "Invalid WalrusStorage address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        walrusStorage = WalrusStorage(payable(_walrusStorage));
    }
    
    /**
     * @notice Mint attendance badge for premiere attendee
     * @param _attendee Address of the attendee
     * @param _premiereId ID of the premiere
     * @param _premiereTitle Title of the premiere
     * @param _videoWalrusHash Walrus hash of the premiere video
     * @param _thumbnailWalrusHash Walrus hash of the thumbnail
     * @return tokenId The minted token ID
     */
    function mintAttendanceBadge(
        address _attendee,
        uint256 _premiereId,
        string calldata _premiereTitle,
        string calldata _videoWalrusHash,
        string calldata _thumbnailWalrusHash
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(_attendee != address(0), "Invalid attendee address");
        require(bytes(_premiereTitle).length > 0, "Invalid premiere title");
        require(bytes(_videoWalrusHash).length > 0, "Invalid video hash");
        
        tokenId = _tokenIdCounter++;
        
        // Create metadata JSON
        bytes memory metadata = _createBadgeMetadata(
            tokenId,
            _premiereId,
            _premiereTitle,
            _videoWalrusHash,
            _thumbnailWalrusHash,
            _attendee
        );
        
        // Store metadata on Walrus
        string memory metadataWalrusId = walrusStorage.storeBlob{value: 0.01 ether}(
            metadata,
            WalrusStorage.StorageTier.STANDARD,
            true
        );
        
        // Store badge information
        badgeMetadata[tokenId] = BadgeMetadata({
            tokenId: tokenId,
            premiereId: _premiereId,
            premiereTitle: _premiereTitle,
            videoWalrusHash: _videoWalrusHash,
            thumbnailWalrusHash: _thumbnailWalrusHash,
            mintedAt: block.timestamp,
            attendee: _attendee,
            metadataWalrusId: metadataWalrusId
        });
        
        premiereTokens[_premiereId].push(tokenId);
        attendeeBadges[_attendee].push(tokenId);
        
        // Mint the NFT
        _safeMint(_attendee, tokenId);
        
        // Set token URI to Walrus gateway URL
        string memory tokenURI = string(abi.encodePacked(
            "https://aggregator.walrus.org/v1/",
            metadataWalrusId
        ));
        _setTokenURI(tokenId, tokenURI);
        
        emit AttendanceBadgeMinted(tokenId, _premiereId, _attendee, metadataWalrusId);
        
        return tokenId;
    }
    
    /**
     * @notice Batch mint badges for multiple attendees
     * @param _attendees Array of attendee addresses
     * @param _premiereId ID of the premiere
     * @param _premiereTitle Title of the premiere
     * @param _videoWalrusHash Walrus hash of the premiere video
     * @param _thumbnailWalrusHash Walrus hash of the thumbnail
     * @return tokenIds Array of minted token IDs
     */
    function batchMintAttendanceBadges(
        address[] calldata _attendees,
        uint256 _premiereId,
        string calldata _premiereTitle,
        string calldata _videoWalrusHash,
        string calldata _thumbnailWalrusHash
    ) external payable onlyRole(MINTER_ROLE) returns (uint256[] memory tokenIds) {
        require(_attendees.length > 0, "No attendees provided");
        require(_attendees.length <= 100, "Too many attendees in batch");
        
        uint256 requiredValue = _attendees.length * 0.01 ether; // Estimated cost per metadata
        require(msg.value >= requiredValue, "Insufficient payment for metadata storage");
        
        tokenIds = new uint256[](_attendees.length);
        
        for (uint256 i = 0; i < _attendees.length; i++) {
            if (_attendees[i] != address(0)) {
                try this.mintAttendanceBadge(
                    _attendees[i],
                    _premiereId,
                    _premiereTitle,
                    _videoWalrusHash,
                    _thumbnailWalrusHash
                ) returns (uint256 tokenId) {
                    tokenIds[i] = tokenId;
                } catch {
                    // Skip failed mints, continue with others
                    tokenIds[i] = 0;
                }
            }
        }
        
        // Refund excess payment
        uint256 remainingBalance = address(this).balance;
        if (remainingBalance > 0) {
            payable(msg.sender).transfer(remainingBalance);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Create JSON metadata for the badge
     */
    function _createBadgeMetadata(
        uint256 _tokenId,
        uint256 _premiereId,
        string calldata _premiereTitle,
        string calldata _videoWalrusHash,
        string calldata _thumbnailWalrusHash,
        address _attendee
    ) internal view returns (bytes memory) {
        return abi.encodePacked(
            '{"name":"Premiere Attendance Badge #', _toString(_tokenId), '",',
            '"description":"Badge for attending the premiere: ', _premiereTitle, '",',
            '"image":"https://aggregator.walrus.org/v1/', _thumbnailWalrusHash, '",',
            '"animation_url":"https://aggregator.walrus.org/v1/', _videoWalrusHash, '",',
            '"attributes":[',
                '{"trait_type":"Premiere ID","value":', _toString(_premiereId), '},',
                '{"trait_type":"Premiere Title","value":"', _premiereTitle, '"},',
                '{"trait_type":"Attendee","value":"', _toHexString(uint256(uint160(_attendee)), 20), '"},',
                '{"trait_type":"Minted At","value":', _toString(block.timestamp), '},',
                '{"trait_type":"Video Hash","value":"', _videoWalrusHash, '"},',
                '{"trait_type":"Badge Type","value":"Attendance"}',
            ']}'
        );
    }
    
    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Convert address to hex string
     */
    function _toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = bytes1(uint8(48 + uint256(value & 0xf)));
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }
    
    // View functions
    
    /**
     * @notice Get badge metadata
     */
    function getBadgeMetadata(uint256 _tokenId) external view returns (BadgeMetadata memory) {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        return badgeMetadata[_tokenId];
    }
    
    /**
     * @notice Get all badges for a premiere
     */
    function getPremiereBadges(uint256 _premiereId) external view returns (uint256[] memory) {
        return premiereTokens[_premiereId];
    }
    
    /**
     * @notice Get all badges for an attendee
     */
    function getAttendeeBadges(address _attendee) external view returns (uint256[] memory) {
        return attendeeBadges[_attendee];
    }
    
    /**
     * @notice Check if an address attended a specific premiere
     */
    function hasAttendedPremiere(address _attendee, uint256 _premiereId) external view returns (bool) {
        uint256[] memory badges = attendeeBadges[_attendee];
        for (uint256 i = 0; i < badges.length; i++) {
            if (badgeMetadata[badges[i]].premiereId == _premiereId) {
                return true;
            }
        }
        return false;
    }
    
    // Admin functions
    
    /**
     * @notice Update Walrus storage contract
     */
    function updateWalrusStorage(address _newWalrusStorage) external onlyRole(ADMIN_ROLE) {
        require(_newWalrusStorage != address(0), "Invalid address");
        walrusStorage = WalrusStorage(payable(_newWalrusStorage));
    }
    
    /**
     * @notice Grant minter role
     */
    function grantMinterRole(address _account) external onlyRole(ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, _account);
    }
    
    /**
     * @notice Revoke minter role
     */
    function revokeMinterRole(address _account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, _account);
    }
    
    /**
     * @notice Withdraw contract balance
     */
    function withdraw() external onlyRole(ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    // Required overrides
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual 
        override(ERC721URIStorage, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}