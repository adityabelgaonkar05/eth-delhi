const express = require('express');
const crypto = require('crypto'); // Add crypto module for hashing
const { 
    SelfBackendVerifier, 
    DefaultConfigStore, 
    ATTESTATION_ID 
} = require('@selfxyz/core');
const User = require('../../models/User');

const router = express.Router();

// In-memory storage for verification sessions (use Redis in production)
const verificationSessions = new Map();

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

// Function to extract DID from Self.xyz verification payload
function extractDIDFromVerification(verification) {
    try {
        // Extract DID from Self.xyz verification payload
        // The DID is the persistent unique identifier for each human
        const did = verification.subject?.id || verification.userData?.userIdentifier;
        
        if (!did) {
            throw new Error('No DID found in verification payload');
        }
        
        console.log('Extracted DID:', did);
        
        // Return the raw DID as the unique identifier
        // Optionally hash for privacy: crypto.createHash('sha256').update(did).digest('hex')
        return did;
    } catch (error) {
        console.error('Error extracting DID from verification:', error);
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

        // Extract DID from Self.xyz verification payload
        const did = extractDIDFromVerification(result);
        
        // Extract user data from Self verification
        const { userDefinedData } = result.userData || {};
        const { nationality, gender, name } = result.discloseOutput || {};
        const claims = result.subject?.claims || {};
        
        // Extract session ID from userDefinedData for session tracking
        let sessionId = null;
        try {
            const parsedUserData = JSON.parse(userDefinedData || '{}');
            sessionId = parsedUserData.sessionId;
        } catch (e) {
            console.log('Could not parse userDefinedData for session ID');
        }

        console.log('Self verification successful for DID:', did);
        if (sessionId) {
            console.log('Session ID:', sessionId);
        }

        // Check if user already exists (1:1 mapping with Self DID)
        let user = await User.findOne({ did: did });
        let isNewUser = false;
        let needsOnboarding = false;

        console.log('did:', did);
        // console.log('user did:', user.did);
        
        if (user) {
            // Existing user - update verification data and login
            user.isVerified = true;
            user.verificationDate = new Date();
            user.claims = claims;
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
                did: user.did,
                needsOnboarding,
                onboardingCompleted: user.onboardingCompleted
            });
        } else {
            // New user - create with DID as unique identifier
            isNewUser = true;
            needsOnboarding = true;

            try {
            
            user = new User({
                did: did, // Self.xyz DID as the unique identifier
                isVerified: true,
                verificationDate: new Date(),
                claims: claims,
                nationality,
                gender,
                name: name || 'Anonymous',
                attestationId,
                userDefinedData,
                
                // Default values for reputation system
                reputation: 0,
                badges: [],
                nfts: [],
                
                onboardingCompleted: false
            });
            await user.save();
            
                console.log('New user created:', {
                    did: user.did,
                    userId: user._id,
                    needsOnboarding: true
                });
                // End of try block for new user creation
            } catch (error) {
                console.error('user exists:');
                return res.status(214).json({
                    status: "error",
                    result: false,
                    reason: "Failed to create new user"
                });
            }
        } // <-- Add this closing brace to properly close the 'else' block
    
        // Store verification result in session storage for frontend polling
        if (sessionId) {
            verificationSessions.set(sessionId, {
                did: user.did,
                token: user._id.toString(),
                isNewUser,
                needsOnboarding,
                userData: {
                    id: user._id.toString(),
                    did: user.did,
                    userDefinedData: user.userDefinedData,
                    nationality: user.nationality,
                    gender: user.gender,
                    name: user.name,
                    username: user.username,
                    tracks: user.tracks,
                    reputation: user.reputation,
                    badges: user.badges,
                    nfts: user.nfts,
                    isVerified: user.isVerified,
                    verificationDate: user.verificationDate,
                    onboardingCompleted: user.onboardingCompleted,
                    gameData: user.gameData,
                    claims: user.claims
                },
                timestamp: Date.now()
            });
            
            // Clean up old sessions (older than 1 hour)
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            for (const [key, value] of verificationSessions.entries()) {
                if (value.timestamp < oneHourAgo) {
                    verificationSessions.delete(key);
                }
            }
        }

        return res.status(200).json({
            status: "success",
            result: true,
            isNewUser,
            needsOnboarding,
            token: user._id.toString(), // MongoDB ID as auth token
            userData: {
                id: user._id.toString(),
                did: user.did,
                userDefinedData: user.userDefinedData,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                username: user.username,
                tracks: user.tracks,
                
                // Reputation system
                reputation: user.reputation,
                badges: user.badges,
                nfts: user.nfts,
                
                isVerified: user.isVerified,
                verificationDate: user.verificationDate,
                onboardingCompleted: user.onboardingCompleted,
                gameData: user.gameData,
                claims: user.claims
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

// Check user verification status by DID
router.get('/status/:did', async (req, res) => {
    try {
        const { did } = req.params;
        
        const user = await User.findOne({ did });
        
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
                did: user.did,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                username: user.username,
                tracks: user.tracks,
                reputation: user.reputation,
                badges: user.badges,
                nfts: user.nfts,
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

// Complete user onboarding (DID-based - legacy)
router.post('/onboarding', async (req, res) => {
    try {
        const { did, username, tracks } = req.body;

        // Validate required fields
        if (!did || !username || !Array.isArray(tracks)) {
            return res.status(400).json({
                status: 'fail',
                message: 'DID, username, and tracks array are required'
            });
        }

        // Check if username is already taken
        const existingUsernameUser = await User.findOne({ 
            username: username.toLowerCase(),
            did: { $ne: did } // Exclude current user
        });

        if (existingUsernameUser) {
            return res.status(400).json({
                status: 'fail',
                message: 'Username already taken. Please choose a different username.'
            });
        }

        // Find user by DID and update onboarding info
        const user = await User.findOne({ did });
        
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
            did: user.did,
            username: user.username,
            tracks: user.tracks
        });

        return res.status(200).json({
            status: 'success',
            message: 'Onboarding completed successfully',
            userData: {
                id: user._id.toString(),
                did: user.did,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                username: user.username,
                tracks: user.tracks,
                reputation: user.reputation,
                badges: user.badges,
                nfts: user.nfts,
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

// Complete user onboarding (Token-based - new method)
router.post('/onboarding-token', async (req, res) => {
    try {
        const { token, username, tracks } = req.body;

        // Validate required fields
        if (!token || !username || !Array.isArray(tracks)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Token, username, and tracks array are required'
            });
        }

        // Find user by MongoDB _id (token)
        const user = await User.findById(token);
        
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found. Invalid token.'
            });
        }

        // Check if username is already taken by another user
        const existingUsernameUser = await User.findOne({ 
            username: username.toLowerCase(),
            _id: { $ne: user._id } // Exclude current user
        });

        if (existingUsernameUser) {
            return res.status(400).json({
                status: 'fail',
                message: 'Username already taken. Please choose a different username.'
            });
        }

        // Update user with onboarding data
        user.username = username.toLowerCase();
        user.tracks = tracks;
        user.onboardingCompleted = true;
        user.onboardingDate = new Date();
        user.gameData.lastActive = new Date();
        await user.save();

        console.log('User onboarding completed (token-based):', {
            userId: user._id.toString(),
            did: user.did,
            username: user.username,
            tracks: user.tracks
        });

        return res.status(200).json({
            status: 'success',
            message: 'Onboarding completed successfully',
            userData: {
                id: user._id.toString(),
                did: user.did,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                username: user.username,
                tracks: user.tracks,
                reputation: user.reputation,
                badges: user.badges,
                nfts: user.nfts,
                isVerified: user.isVerified,
                onboardingCompleted: user.onboardingCompleted,
                gameData: user.gameData
            }
        });

    } catch (error) {
        console.error('Token-based onboarding error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid token format'
            });
        }
        
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
                did: user.did,
                nationality: user.nationality,
                gender: user.gender,
                name: user.name,
                username: user.username,
                tracks: user.tracks,
                reputation: user.reputation,
                badges: user.badges,
                nfts: user.nfts,
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

// Check verification status by session ID (for polling)
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId) {
            return res.status(400).json({
                status: 'fail',
                message: 'Session ID is required'
            });
        }
        
        const sessionData = verificationSessions.get(sessionId);
        
        if (!sessionData) {
            return res.json({
                status: 'pending',
                message: 'Verification still processing or session not found'
            });
        }
        
        // Return the verification result
        return res.json({
            status: 'success',
            did: sessionData.did,
            token: sessionData.token,
            isNewUser: sessionData.isNewUser,
            needsOnboarding: sessionData.needsOnboarding,
            userData: sessionData.userData
        });
        
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check session status'
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