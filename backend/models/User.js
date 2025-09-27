const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userIdentifier: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationDate: {
        type: Date,
        default: null
    },
    nationality: {
        type: String,
        default: null
    },
    gender: {
        type: String,
        default: null
    },
    name: {
        type: String,
        default: 'Anonymous'
    },
    attestationId: {
        type: Number,
        default: null
    },
    userDefinedData: {
        type: String,
        default: null
    },
    gameData: {
        level: {
            type: Number,
            default: 1
        },
        experience: {
            type: Number,
            default: 0
        },
        achievements: [{
            type: String
        }],
        lastActive: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
userSchema.index({ userIdentifier: 1, isVerified: 1 });

module.exports = mongoose.model('User', userSchema);