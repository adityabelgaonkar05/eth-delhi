// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title DeploymentFactory
 * @dev Factory contract for deploying and configuring the complete CryptoVerse Business Dashboard system
 * @notice Deploys all contracts in correct order and sets up initial configurations
 */

import "./VideoPremiereManager.sol";
import "./ReputationAirdropEscrow.sol";
import "./ReputationOracle.sol";
import "./PremiereAttendanceBadge.sol";
import "./CryptoVerseBusinessDashboard.sol";
import "./WalrusStorage.sol";
import "./SelfProtocolIntegration.sol";

contract CryptoVerseDeploymentFactory {
    
    struct DeployedContracts {
        address walrusStorage;
        address selfProtocol;
        address attendanceBadge;
        address premiereManager;
        address escrowManager;
        address reputationOracle;
        address businessDashboard;
    }
    
    struct DeploymentConfig {
        string appScope;
        string selfProtocolEndpoint;
        string walrusPublisherEndpoint;
        string walrusAggregatorEndpoint;
        uint256 businessVerificationFee;
        uint256 platformFeePercent;
        uint256 minReputationScore;
        address initialAdmin;
        address feeRecipient;
    }
    
    event SystemDeployed(
        address indexed deployer,
        DeployedContracts contracts,
        uint256 deploymentTime
    );
    
    /**
     * @notice Deploy complete CryptoVerse Business Dashboard system
     * @param config Deployment configuration
     * @return contracts Addresses of all deployed contracts
     */
    function deployCompleteSystem(
        DeploymentConfig calldata config
    ) external returns (DeployedContracts memory contracts) {
        require(config.initialAdmin != address(0), "Invalid admin address");
        require(config.feeRecipient != address(0), "Invalid fee recipient");
        require(bytes(config.appScope).length > 0, "Invalid app scope");
        
        // 1. Deploy WalrusStorage
        contracts.walrusStorage = address(new WalrusStorage(
            config.walrusPublisherEndpoint,
            config.walrusAggregatorEndpoint,
            "https://sui-rpc.com",
            config.initialAdmin, // oracle address
            true // use testnet initially
        ));
        
        // 2. Deploy SelfProtocolIntegration
        SelfProtocolIntegration.VerificationConfig memory verificationConfig = 
            SelfProtocolIntegration.VerificationConfig({
                minimumAge: 16,
                ofacRequired: true,
                excludedCountries: new string[](0),
                requireNationality: false,
                requireGender: false,
                requireName: false,
                requireDateOfBirth: true,
                requirePassportNumber: false,
                requireExpiryDate: false
            });
            
        contracts.selfProtocol = address(new SelfProtocolIntegration(
            config.appScope,
            config.selfProtocolEndpoint,
            verificationConfig
        ));
        
        // 3. Deploy PremiereAttendanceBadge
        contracts.attendanceBadge = address(new PremiereAttendanceBadge(
            contracts.walrusStorage
        ));
        
        // 4. Deploy VideoPremiereManager
        contracts.premiereManager = address(new VideoPremiereManager(
            contracts.walrusStorage,
            contracts.selfProtocol,
            contracts.attendanceBadge
        ));
        
        // 5. Deploy ReputationAirdropEscrow
        contracts.escrowManager = address(new ReputationAirdropEscrow(
            contracts.selfProtocol,
            config.feeRecipient
        ));
        
        // 6. Deploy ReputationOracle
        contracts.reputationOracle = address(new ReputationOracle(
            contracts.premiereManager,
            contracts.escrowManager
        ));
        
        // 7. Deploy CryptoVerseBusinessDashboard
        contracts.businessDashboard = address(new CryptoVerseBusinessDashboard(
            contracts.premiereManager,
            contracts.escrowManager,
            contracts.reputationOracle,
            contracts.attendanceBadge
        ));
        
        // Configure contracts with proper permissions
        _configurePermissions(contracts, config);
        
        emit SystemDeployed(msg.sender, contracts, block.timestamp);
        
        return contracts;
    }
    
    /**
     * @dev Configure cross-contract permissions and initial settings
     */
    function _configurePermissions(
        DeployedContracts memory contracts,
        DeploymentConfig calldata config
    ) internal {
        // Configure VideoPremiereManager
        VideoPremiereManager premiereManager = VideoPremiereManager(contracts.premiereManager);
        premiereManager.grantRole(premiereManager.ORGANIZER_ROLE(), contracts.businessDashboard);
        premiereManager.setMinReputationScore(config.minReputationScore);
        premiereManager.setPremiereCreationFee(1 ether);
        
        // Configure ReputationAirdropEscrow
        ReputationAirdropEscrow escrowManager = ReputationAirdropEscrow(contracts.escrowManager);
        escrowManager.grantRole(escrowManager.ORGANIZER_ROLE(), contracts.businessDashboard);
        escrowManager.setPlatformFee(config.platformFeePercent);
        
        // Configure ReputationOracle
        ReputationOracle oracle = ReputationOracle(contracts.reputationOracle);
        oracle.grantRole(oracle.ORACLE_NODE_ROLE(), config.initialAdmin);
        oracle.grantRole(oracle.DATA_PROVIDER_ROLE(), config.initialAdmin);
        
        // Configure PremiereAttendanceBadge
        PremiereAttendanceBadge badge = PremiereAttendanceBadge(contracts.attendanceBadge);
        badge.grantRole(badge.MINTER_ROLE(), contracts.premiereManager);
        badge.grantRole(badge.MINTER_ROLE(), contracts.businessDashboard);
        
        // Configure CryptoVerseBusinessDashboard
        CryptoVerseBusinessDashboard dashboard = CryptoVerseBusinessDashboard(contracts.businessDashboard);
        dashboard.grantRole(dashboard.ORGANIZER_ROLE(), config.initialAdmin);
        dashboard.grantRole(dashboard.BUSINESS_ADMIN_ROLE(), config.initialAdmin);
        dashboard.setBusinessVerificationFee(config.businessVerificationFee);
        
        // Grant oracle permissions to premiere manager and escrow manager
        premiereManager.grantRole(premiereManager.ORACLE_ROLE(), contracts.reputationOracle);
        escrowManager.grantRole(escrowManager.ORACLE_ROLE(), contracts.reputationOracle);
        
        // Transfer ownership to initial admin if different from deployer
        if (config.initialAdmin != msg.sender) {
            premiereManager.grantRole(premiereManager.DEFAULT_ADMIN_ROLE(), config.initialAdmin);
            escrowManager.grantRole(escrowManager.DEFAULT_ADMIN_ROLE(), config.initialAdmin);
            oracle.grantRole(oracle.DEFAULT_ADMIN_ROLE(), config.initialAdmin);
            badge.grantRole(badge.DEFAULT_ADMIN_ROLE(), config.initialAdmin);
            dashboard.grantRole(dashboard.DEFAULT_ADMIN_ROLE(), config.initialAdmin);
        }
    }
    
    /**
     * @notice Get deployment configuration for different networks
     * @param networkId Network ID (1 = mainnet, 5 = goerli, etc.)
     * @return config Recommended configuration for the network
     */
    function getNetworkConfig(uint256 networkId) external view returns (DeploymentConfig memory config) {
        if (networkId == 1) {
            // Mainnet configuration
            config = DeploymentConfig({
                appScope: "cryptoverse-business-mainnet",
                selfProtocolEndpoint: "https://api.self.id/v1/",
                walrusPublisherEndpoint: "https://publisher.walrus.org/v1/",
                walrusAggregatorEndpoint: "https://aggregator.walrus.org/v1/",
                businessVerificationFee: 5 ether,
                platformFeePercent: 250, // 2.5%
                minReputationScore: 100,
                initialAdmin: msg.sender,
                feeRecipient: msg.sender
            });
        } else if (networkId == 5) {
            // Goerli testnet configuration
            config = DeploymentConfig({
                appScope: "cryptoverse-business-goerli",
                selfProtocolEndpoint: "https://api-goerli.self.id/v1/",
                walrusPublisherEndpoint: "https://publisher-testnet.walrus.org/v1/",
                walrusAggregatorEndpoint: "https://aggregator-testnet.walrus.org/v1/",
                businessVerificationFee: 0.1 ether,
                platformFeePercent: 250, // 2.5%
                minReputationScore: 50,
                initialAdmin: msg.sender,
                feeRecipient: msg.sender
            });
        } else {
            // Default local/testnet configuration
            config = DeploymentConfig({
                appScope: "cryptoverse-business-local",
                selfProtocolEndpoint: "http://localhost:3000/v1/",
                walrusPublisherEndpoint: "http://localhost:8080/v1/",
                walrusAggregatorEndpoint: "http://localhost:8081/v1/",
                businessVerificationFee: 0.01 ether,
                platformFeePercent: 100, // 1%
                minReputationScore: 10,
                initialAdmin: msg.sender,
                feeRecipient: msg.sender
            });
        }
        
        return config;
    }
    
    /**
     * @notice Estimate gas cost for complete system deployment
     * @return gasEstimate Estimated gas units required
     */
    function estimateDeploymentGas() external pure returns (uint256 gasEstimate) {
        // Rough estimates based on contract sizes
        gasEstimate = 
            2500000 + // WalrusStorage
            2200000 + // SelfProtocolIntegration  
            1800000 + // PremiereAttendanceBadge
            3500000 + // VideoPremiereManager
            3200000 + // ReputationAirdropEscrow
            3800000 + // ReputationOracle
            3000000 + // CryptoVerseBusinessDashboard
            1000000;  // Configuration transactions
            
        return gasEstimate; // ~21M gas total
    }
}