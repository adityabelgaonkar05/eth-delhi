// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SelfProtocolVerificationRegistry
 * @dev Registry for Self Protocol verification results from real backend verification
 * @notice Stores verification results after backend uses real Self Protocol SDK
 * 
 * ARCHITECTURE:
 * 1. User scans QR code generated with real Self Protocol SDK
 * 2. Backend verifies proof using Self Protocol core SelfBackendVerifier
 * 3. Backend calls this contract to store verification results
 * 4. Other contracts can query verification status
 * 
 * This is the correct approach as Self Protocol verification must happen off-chain
 * using their official SDK, then results are stored on-chain for other contracts.
 */
contract SelfProtocolIntegration is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    // Self Protocol document types
    uint256 public constant PASSPORT_DOC = 1;
    uint256 public constant EU_ID_CARD = 2;
    
    // Verification result from Self Protocol SDK
    struct VerificationResult {
        bool isVerified;
        uint256 verifiedAt;
        uint256 documentType; // 1=passport, 2=EU ID card
        string selfProtocolId; // ID from Self Protocol system
        bytes32 proofHash; // Hash of the ZK proof for integrity
        // Disclosed information (only if user consented)
        SelfDisclosures disclosures;
        // Verification quality metrics
        uint256 verificationScore; // Quality score from Self Protocol
        bool ofacScreeningPassed;
        uint256 expiresAt; // When verification expires (if applicable)
    }

    // User disclosures from Self Protocol
    struct SelfDisclosures {
        bool ageVerified;
        uint256 minimumAge; // Minimum age proven (not exact age)
        string nationality; // Only if disclosed
        string gender; // Only if disclosed  
        bool hasName; // Whether name was verified (not stored for privacy)
        bool documentValid; // Whether document passed validation
        uint256 documentExpiryYear; // Year only for privacy
    }

    // Configuration for Self Protocol integration
    struct ProtocolConfig {
        string appScope; // Your app's Self Protocol scope
        uint256 minimumAge; // Minimum age requirement
        bool requireOfacScreening; // Whether OFAC screening required
        string[] excludedCountries; // Countries not allowed
        uint256 verificationValidityPeriod; // How long verifications are valid
        bool requireNationalityDisclosure;
        bool requireGenderDisclosure;
    }

    // State variables
    mapping(address => VerificationResult) public verifications;
    mapping(string => address) public selfIdToAddress; // Self Protocol ID to address
    mapping(bytes32 => bool) public usedProofHashes; // Prevent proof replay
    address[] public verifiedUsers;
    
    ProtocolConfig public config;
    uint256 public totalVerifications;
    uint256 public validVerifications; // Currently valid verifications

    // Backend tracking for security
    mapping(address => bool) public authorizedBackends;
    mapping(address => uint256) public backendVerificationCount;
    uint256 public maxVerificationsPerBackend = 1000; // Rate limiting

    // Events
    event UserVerified(
        address indexed user,
        uint256 indexed documentType,
        string selfProtocolId,
        uint256 verificationScore,
        uint256 timestamp
    );
    event VerificationExpired(address indexed user, uint256 timestamp);
    event VerificationRevoked(address indexed user, string reason);
    event BackendAuthorized(address indexed backend, bool authorized);
    event ConfigUpdated(uint256 minimumAge, bool requireOfac);
    event VerificationUpdated(address indexed user, uint256 newScore);

    // Errors
    error UserAlreadyVerified();
    error UserNotVerified();
    error InvalidBackend();
    error ProofAlreadyUsed();
    error VerificationHasExpired();
    error AgeRequirementNotMet();
    error CountryNotAllowed();
    error OfacScreeningRequired();
    error InvalidConfiguration();
    error BackendRateLimited();

    constructor(ProtocolConfig memory _config) {
        // Set owner
        address owner = 0x4C3F5A84041e562928394D63B3E339Be70dBCcC1;
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(ADMIN_ROLE, owner);
        _grantRole(BACKEND_ROLE, owner);

        config = _config;
    }

    /**
     * @notice Submit verification result from backend after Self Protocol verification
     * @param user User address being verified
     * @param selfProtocolResult Result from SelfBackendVerifier.verify()
     * @param proofHash Hash of the ZK proof for integrity checking
     * @dev Called by authorized backend after successful Self Protocol SDK verification
     */
    function submitVerification(
        address user,
        VerificationResult calldata selfProtocolResult,
        bytes32 proofHash
    ) external onlyRole(BACKEND_ROLE) whenNotPaused nonReentrant {
        // Security checks
        if (verifications[user].isVerified) {
            revert UserAlreadyVerified();
        }
        if (usedProofHashes[proofHash]) {
            revert ProofAlreadyUsed();
        }
        if (backendVerificationCount[msg.sender] >= maxVerificationsPerBackend) {
            revert BackendRateLimited();
        }

        // Validate verification meets requirements
        _validateVerificationRequirements(selfProtocolResult);

        // Store verification result
        verifications[user] = VerificationResult({
            isVerified: true,
            verifiedAt: block.timestamp,
            documentType: selfProtocolResult.documentType,
            selfProtocolId: selfProtocolResult.selfProtocolId,
            proofHash: proofHash,
            disclosures: selfProtocolResult.disclosures,
            verificationScore: selfProtocolResult.verificationScore,
            ofacScreeningPassed: selfProtocolResult.ofacScreeningPassed,
            expiresAt: config.verificationValidityPeriod > 0 
                ? block.timestamp + config.verificationValidityPeriod 
                : 0
        });

        // Update mappings and counters
        selfIdToAddress[selfProtocolResult.selfProtocolId] = user;
        usedProofHashes[proofHash] = true;
        verifiedUsers.push(user);
        totalVerifications++;
        validVerifications++;
        backendVerificationCount[msg.sender]++;

        emit UserVerified(
            user,
            selfProtocolResult.documentType,
            selfProtocolResult.selfProtocolId,
            selfProtocolResult.verificationScore,
            block.timestamp
        );
    }

    /**
     * @notice Check if user is currently verified
     * @param user User address to check
     * @return isValid True if user has valid verification
     */
    function isUserVerified(address user) external view returns (bool) {
        VerificationResult memory result = verifications[user];
        
        if (!result.isVerified) {
            return false;
        }
        
        // Check if verification has expired
        if (result.expiresAt > 0 && block.timestamp > result.expiresAt) {
            return false;
        }
        
        return true;
    }

    /**
     * @notice Get complete verification details for a user
     * @param user User address
     * @return result Complete verification result
     * @return isCurrentlyValid Whether verification is currently valid
     */
    function getVerificationDetails(address user) external view returns (
        VerificationResult memory result,
        bool isCurrentlyValid
    ) {
        result = verifications[user];
        isCurrentlyValid = this.isUserVerified(user);
    }

    /**
     * @notice Check if user meets specific age requirement
     * @param user User address
     * @param minimumAge Minimum age to check
     * @return meetsAge True if user meets age requirement
     */
    function userMeetsAge(address user, uint256 minimumAge) external view returns (bool) {
        if (!this.isUserVerified(user)) {
            return false;
        }
        
        VerificationResult memory result = verifications[user];
        return result.disclosures.ageVerified && 
               result.disclosures.minimumAge >= minimumAge;
    }

    /**
     * @notice Get user's nationality (if disclosed)
     * @param user User address
     * @return nationality User's nationality or empty string
     */
    function getUserNationality(address user) external view returns (string memory) {
        if (!this.isUserVerified(user)) {
            return "";
        }
        return verifications[user].disclosures.nationality;
    }

    /**
     * @notice Check if user passed OFAC screening
     * @param user User address  
     * @return passed True if user passed OFAC screening
     */
    function userPassedOfacScreening(address user) external view returns (bool) {
        if (!this.isUserVerified(user)) {
            return false;
        }
        return verifications[user].ofacScreeningPassed;
    }

    /**
     * @notice Get verification score for user
     * @param user User address
     * @return score Verification quality score from Self Protocol
     */
    function getVerificationScore(address user) external view returns (uint256) {
        if (!this.isUserVerified(user)) {
            return 0;
        }
        return verifications[user].verificationScore;
    }

    /**
     * @notice Update verification score (for score improvements over time)
     * @param user User address
     * @param newScore New verification score
     */
    function updateVerificationScore(
        address user,
        uint256 newScore
    ) external onlyRole(BACKEND_ROLE) {
        if (!verifications[user].isVerified) {
            revert UserNotVerified();
        }
        
        verifications[user].verificationScore = newScore;
        emit VerificationUpdated(user, newScore);
    }

    /**
     * @notice Expire verification (called when verification period ends)
     * @param user User address
     */
    function expireVerification(address user) external onlyRole(BACKEND_ROLE) {
        VerificationResult storage result = verifications[user];
        
        if (!result.isVerified) {
            revert UserNotVerified();
        }
        
        if (result.expiresAt > 0 && block.timestamp > result.expiresAt) {
            result.isVerified = false;
            validVerifications--;
            emit VerificationExpired(user, block.timestamp);
        }
    }

    /**
     * @notice Revoke user verification (admin only)
     * @param user User address
     * @param reason Reason for revocation
     */
    function revokeVerification(
        address user,
        string calldata reason
    ) external onlyRole(ADMIN_ROLE) {
        VerificationResult storage result = verifications[user];
        
        if (!result.isVerified) {
            revert UserNotVerified();
        }
        
        // Clean up mappings
        delete selfIdToAddress[result.selfProtocolId];
        delete usedProofHashes[result.proofHash];
        
        // Mark as not verified
        result.isVerified = false;
        validVerifications--;
        
        emit VerificationRevoked(user, reason);
    }

    /**
     * @notice Batch check verification status
     * @param users Array of user addresses
     * @return statuses Array of verification statuses
     */
    function batchCheckVerification(
        address[] calldata users
    ) external view returns (bool[] memory statuses) {
        statuses = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            statuses[i] = this.isUserVerified(users[i]);
        }
    }

    /**
     * @notice Get verification statistics
     * @return total Total verifications ever submitted
     * @return valid Currently valid verifications
     * @return passportVerifications Verifications using passports
     * @return euIdVerifications Verifications using EU ID cards
     */
    function getVerificationStats() external view returns (
        uint256 total,
        uint256 valid,
        uint256 passportVerifications,
        uint256 euIdVerifications
    ) {
        total = totalVerifications;
        valid = validVerifications;
        
        // Count by document type
        for (uint256 i = 0; i < verifiedUsers.length; i++) {
            address user = verifiedUsers[i];
            VerificationResult memory result = verifications[user];
            
            if (this.isUserVerified(user)) {
                if (result.documentType == PASSPORT_DOC) {
                    passportVerifications++;
                } else if (result.documentType == EU_ID_CARD) {
                    euIdVerifications++;
                }
            }
        }
    }

    /**
     * @notice Internal function to validate verification meets requirements
     */
    function _validateVerificationRequirements(
        VerificationResult calldata result
    ) internal view {
        // Check age requirement
        if (result.disclosures.ageVerified && 
            result.disclosures.minimumAge < config.minimumAge) {
            revert AgeRequirementNotMet();
        }
        
        // Check OFAC requirement
        if (config.requireOfacScreening && !result.ofacScreeningPassed) {
            revert OfacScreeningRequired();
        }
        
        // Check country restrictions
        if (bytes(result.disclosures.nationality).length > 0) {
            for (uint256 i = 0; i < config.excludedCountries.length; i++) {
                if (keccak256(bytes(result.disclosures.nationality)) == 
                    keccak256(bytes(config.excludedCountries[i]))) {
                    revert CountryNotAllowed();
                }
            }
        }
        
        // Check required disclosures
        if (config.requireNationalityDisclosure && 
            bytes(result.disclosures.nationality).length == 0) {
            revert InvalidConfiguration();
        }
    }

    // Admin functions
    function updateConfig(ProtocolConfig calldata newConfig) 
        external onlyRole(ADMIN_ROLE) {
        config = newConfig;
        emit ConfigUpdated(newConfig.minimumAge, newConfig.requireOfacScreening);
    }

    function authorizeBackend(address backend, bool authorized) 
        external onlyRole(ADMIN_ROLE) {
        authorizedBackends[backend] = authorized;
        if (authorized) {
            _grantRole(BACKEND_ROLE, backend);
        } else {
            _revokeRole(BACKEND_ROLE, backend);
        }
        emit BackendAuthorized(backend, authorized);
    }

    function setBackendRateLimit(uint256 newLimit) 
        external onlyRole(ADMIN_ROLE) {
        maxVerificationsPerBackend = newLimit;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}