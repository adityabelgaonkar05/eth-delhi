const express = require('express');
const crypto = require('crypto'); // Add crypto module for hashing
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

// Function to generate persistent unique identifier from DID
function generateUniqueIdentifier(verification) {
    try {
        // Extract DID from verification payload
        const did = verification.subject?.id || verification.userData?.userIdentifier;
        
        if (!did) {
            throw new Error('No DID found in verification payload');
        }
        
        console.log('Extracted DID:', did);
        
        // Generate SHA256 hash for privacy and persistence
        const uniqueIdentifier = crypto.createHash('sha256').update(did).digest('hex');
        
        console.log('Generated unique identifier:', uniqueIdentifier);
        
        return uniqueIdentifier;
    } catch (error) {
        console.error('Error generating unique identifier:', error);
        throw error;
    }
}

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

        // Generate persistent unique identifier from DID
        const userIdentifier = generateUniqueIdentifier(result);
        
        // Extract other user data from Self verification
        const { userDefinedData } = result.userData;
        const { nationality, gender, name } = result.discloseOutput;    

        console.log('Self verification successful for userIdentifier:', userIdentifier);

        // Check if user already exists (1:1 mapping with Self identity)
        let user = await User.findOne({ userIdentifier });
        let isNewUser = false;
        let needsOnboarding = false;
        
        if (user) {
            // Existing user - update verification data and login
            user.isVerified = true;
            user.verificationDate = new Date();
            user.nationality = nationality || user.nationality;
            user.gender = gender || user.gender;
            user.name = name || user.name || 'Anonymous';
            user.attestationId = attestationId;
            user.userDefinedData = userDefinedData;
            user.gameData.lastActive = new Date();
            await user.save();
            
            // Check if user completed onboarding
            needsOnboarding = !user.onboardingCompleted;
            
            console.log('Existing user login:', {
                userIdentifier: user.userIdentifier,
                needsOnboarding,
                onboardingCompleted: user.onboardingCompleted
            });
        } else {
            // New user - create with verification data, needs onboarding
            isNewUser = true;
            needsOnboarding = true;
            
            user = new User({
                userIdentifier, // This is now the SHA256 hash of the DID
                isVerified: true,
                verificationDate: new Date(),
                nationality,
                gender,
                name: name || 'Anonymous',
                attestationId,
                userDefinedData,
                onboardingCompleted: false
            });
            await user.save();
            
            console.log('New user created:', {
                userIdentifier: user.userIdentifier,
                userId: user._id,
                needsOnboarding: true
            });
        }

        return res.status(200).json({
            status: "success",
            result: true,
            isNewUser,
            needsOnboarding,
            token: user._id.toString(), // MongoDB ID as auth token
            userData: {
                id: user._id.toString(),
                userIdentifier: user.userIdentifier,
                userDefinedData: user.userDefinedData,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                username: user.username,
                tracks: user.tracks,
                isVerified: user.isVerified,
                verificationDate: user.verificationDate,
                onboardingCompleted: user.onboardingCompleted,
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

// Complete user onboarding
router.post('/onboarding', async (req, res) => {
    try {
        const { userIdentifier, username, tracks } = req.body;

        // Validate required fields
        if (!userIdentifier || !username || !Array.isArray(tracks)) {
            return res.status(400).json({
                status: 'fail',
                message: 'userIdentifier, username, and tracks array are required'
            });
        }

        // Check if username is already taken
        const existingUsernameUser = await User.findOne({ 
            username: username.toLowerCase(),
            userIdentifier: { $ne: userIdentifier } // Exclude current user
        });

        if (existingUsernameUser) {
            return res.status(400).json({
                status: 'fail',
                message: 'Username already taken. Please choose a different username.'
            });
        }

        // Find user by userIdentifier and update onboarding info
        const user = await User.findOne({ userIdentifier });
        
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found. Please complete Self verification first.'
            });
        }

        // Update user with onboarding data
        user.username = username.toLowerCase();
        user.tracks = tracks;
        user.onboardingCompleted = true;
        user.onboardingDate = new Date();
        user.gameData.lastActive = new Date();
        await user.save();

        console.log('User onboarding completed:', {
            userIdentifier: user.userIdentifier,
            username: user.username,
            tracks: user.tracks
        });

        return res.status(200).json({
            status: 'success',
            message: 'Onboarding completed successfully',
            userData: {
                id: user._id.toString(),
                userIdentifier: user.userIdentifier,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                username: user.username,
                tracks: user.tracks,
                isVerified: user.isVerified,
                onboardingCompleted: user.onboardingCompleted,
                gameData: user.gameData
            }
        });

    } catch (error) {
        console.error('Onboarding error:', error);
        
        if (error.code === 11000) {
            // Duplicate key error (username already exists)
            return res.status(400).json({
                status: 'fail',
                message: 'Username already taken. Please choose a different username.'
            });
        }
        
        return res.status(500).json({
            status: 'error',
            message: 'Failed to complete onboarding'
        });
    }
});

// Get user by token (MongoDB ID) for authentication
router.get('/user/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const user = await User.findById(token);
        
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        // Update last active
        user.gameData.lastActive = new Date();
        await user.save();

        return res.json({
            status: 'success',
            userData: {
                id: user._id.toString(),
                userIdentifier: user.userIdentifier,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                username: user.username,
                tracks: user.tracks,
                isVerified: user.isVerified,
                onboardingCompleted: user.onboardingCompleted,
                gameData: user.gameData
            }
        });
        
    } catch (error) {
        console.error('Error getting user by token:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid token format'
            });
        }
        
        return res.status(500).json({
            status: 'error',
            message: 'Failed to get user'
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