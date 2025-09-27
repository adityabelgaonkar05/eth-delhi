const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    // Decentralized Identifier (DID) from Self.xyz, unique and persistent
    did: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Optional: store the raw (unhashed) DID if privacy is not required
    // rawDid: { type: String },

    // Self.xyz verification status and metadata
    isVerified: { type: Boolean, default: false },
    verificationDate: { type: Date, default: null },
    // Claims from Self.xyz (phone/email/govID)
    claims: { type: Object, default: {} },

    // Profile information
    name: { type: String, default: 'Anonymous' },
    nationality: { type: String, default: null },
    gender: { type: String, default: null },
    attestationId: { type: Number, default: null },
    userDefinedData: { type: String, default: null },

    // Onboarding/game info
    username: { type: String, default: null, sparse: true },
    tracks: [{ type: String, enum: [
        'Ethereum',
        'Solana', 
        'Polygon',
        'Bitcoin',
        'Cardano',
        'Avalanche',
        'Arbitrum',
        'Optimism',
        'Base',
        'Sui',
        'Aptos',
        'Near',
        'Cosmos',
        'Polkadot',
        'Chainlink',
        'Self Protocol',
        'Flow',
        'Starknet',
        'zkSync',
        'DeFi',
        'NFTs',
        'GameFi',
        'DAOs',
        'Web3 Social',
        'Privacy Tech',
        'Infrastructure',
        'Developer Tools',
        'Other'
    ] }],
    onboardingCompleted: { type: Boolean, default: false },
    onboardingDate: { type: Date, default: null },

    // Game data
    gameData: {
        level: { type: Number, default: 1 },
        experience: { type: Number, default: 0 },
        achievements: [{ type: String }],
        lastActive: { type: Date, default: Date.now }
    },

    // Reputation, badges, NFTs (all keyed by DID)
    reputation: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    nfts: { type: [String], default: [] },

    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Index for efficient queries
userSchema.index({ did: 1, isVerified: 1 });

module.exports = mongoose.model('User', userSchema);