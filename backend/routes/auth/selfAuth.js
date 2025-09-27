const express = require('express');
const { 
    SelfBackendVerifier, 
    DefaultConfigStore, 
    ATTESTATION_ID 
} = require('@selfxyz/core');
const User = require('../../models/User');

const router = express.Router();

// Create allowed attestation IDs map (accepting all document types)
const AllIds = new Map([
    [ATTESTATION_ID.PASSPORT, true],
    [ATTESTATION_ID.BIOMETRIC_ID_CARD, true],
    [ATTESTATION_ID.AADHAAR, true],
]);

// Initialize Self Backend Verifier
const selfBackendVerifier = new SelfBackendVerifier(
    process.env.SELF_SCOPE || 'cryptoverse-game', // scope string
    process.env.SELF_ENDPOINT || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/verify`, // endpoint
    process.env.NODE_ENV !== 'production', // mockPassport - true for development/testnet
    AllIds, // allowed attestation IDs map
    new DefaultConfigStore({
        minimumAge: 16,
        excludedCountries: [], // NONE
        ofac: false, // Disable OFAC for development
        chainId: 545, // FLOW
        registryAddress: 0xAC7eC9008D7Bd2354786E2bdeEd83907D1FB2Cc3
    }),
    'hex' // user identifier type - using hex for blockchain addresses
);

// Self verification endpoint
router.post('/verify', async (req, res) => {
    try {
        const { attestationId, proof, publicSignals, userContextData } = req.body;
        
        // Validate required fields
        if (!proof || !publicSignals || !attestationId || !userContextData) {
            return res.status(200).json({
                status: "error",
                result: false,
                reason: "Proof, publicSignals, attestationId and userContextData are required",
            });
        }

        console.log('Verifying Self proof for attestationId:', attestationId);
        
        // Verify the proof using Self Backend Verifier
        const result = await selfBackendVerifier.verify(
            attestationId,
            proof,
            publicSignals,
            userContextData
        );



        console.log('Verification result:', result);

        // const { isValid, isMinimumAgeValid, isOfacValid } = result.isValidDetails;
        
        // Check if verification passed
        if (!result.isValidDetails.isValid || !result.isValidDetails.isMinimumAgeValid || !result.isValidDetails.isOfacValid) {
            let reason = "Verification failed";
            if (!result.isValidDetails.isMinimumAgeValid) reason = "Minimum age verification failed";
            if (!result.isValidDetails.isOfacValid) reason = "OFAC verification failed";

            return res.status(200).json({
                status: "error",
                result: false,
                reason,
                details: result.isValidDetails
            });
        }

        // Extract user data
        const { userIdentifier, userDefinedData } = result.userData;
        const { nationality, gender, name } = result.discloseOutput;

        // Save or update user in database
        let user = await User.findOne({ userIdentifier });
        
        if (user) {
            // Update existing user
            user.isVerified = true;
            user.verificationDate = new Date();
            user.nationality = nationality || user.nationality;
            user.gender = gender || user.gender;
            user.name = name || user.name || 'Anonymous';
            user.attestationId = attestationId;
            user.userDefinedData = userDefinedData;
            user.gameData.lastActive = new Date();
            await user.save();
        } else {
            // Create new user
            user = new User({
                userIdentifier,
                isVerified: true,
                verificationDate: new Date(),
                nationality,
                gender,
                name: name || 'Anonymous',
                attestationId,
                userDefinedData
            });
            await user.save();
        }

        return res.status(200).json({
            status: "success",
            result: true,
            userData: {
                userIdentifier: user.userIdentifier,
                userDefinedData: user.userDefinedData,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                isVerified: user.isVerified,
                verificationDate: user.verificationDate,
                gameData: user.gameData
            }
        });

    } catch (error) {
        console.error('Self verification error:', error);
        
        // Handle specific Self errors
        if (error.name === 'ConfigMismatchError') {
            return res.status(200).json({
                status: "error",
                result: false,
                reason: "Configuration mismatch: " + error.message,
                issues: error.issues
            });
        }
        
        return res.status(200).json({
            status: "error",
            result: false,
            reason: error instanceof Error ? error.message : "Unknown verification error",
        });
    }
});

// Check user verification status
router.get('/status/:userIdentifier', async (req, res) => {
    try {
        const { userIdentifier } = req.params;
        
        const user = await User.findOne({ userIdentifier });
        
        if (!user) {
            return res.json({
                isVerified: false,
                exists: false
            });
        }
        
        return res.json({
            isVerified: user.isVerified,
            exists: true,
            userData: user.isVerified ? {
                userIdentifier: user.userIdentifier,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                verificationDate: user.verificationDate,
                gameData: user.gameData
            } : null
        });
        
    } catch (error) {
        console.error('Error checking user status:', error);
        return res.status(500).json({
            error: 'Failed to check user status'
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Self Authentication',
        scope: process.env.SELF_SCOPE || 'cryptoverse-game',
        endpoint: process.env.SELF_ENDPOINT || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/verify`
    });
});

module.exports = router;