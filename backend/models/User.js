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
    // Profile information from Self verification
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
    // Onboarding information
    username: {
        type: String,
        default: null,
        unique: true,
        sparse: true // Allow null values to be non-unique
    },
    tracks: [{
        type: String,
        enum: ['Ethereum', 'Solana', 'Polygon', 'Self', 'Flowchain', 'Bitcoin', 'Cardano', 'Avalanche', 'Other']
    }],
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    onboardingDate: {
        type: Date,
        default: null
    },
    // Game data
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
        },
        // Enhanced reputation system
        reputationScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 10000
        },
        reputationTier: {
            type: String,
            enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legendary'],
            default: 'Bronze'
        },
        reputationFactors: {
            // Activity & Engagement (40% weight)
            activityScore: {
                type: Number,
                default: 0
            },
            watchTimeScore: {
                type: Number,
                default: 0
            },
            consistencyScore: {
                type: Number,
                default: 0
            },
            // Social & Community (30% weight)
            socialScore: {
                type: Number,
                default: 0
            },
            collaborationScore: {
                type: Number,
                default: 0
            },
            helpfulnessScore: {
                type: Number,
                default: 0
            },
            // Achievement & Skills (20% weight)
            achievementScore: {
                type: Number,
                default: 0
            },
            skillScore: {
                type: Number,
                default: 0
            },
            completionScore: {
                type: Number,
                default: 0
            },
            // Trust & Verification (10% weight)
            verificationScore: {
                type: Number,
                default: 0
            },
            trustScore: {
                type: Number,
                default: 0
            }
        },
        reputationHistory: [{
            date: {
                type: Date,
                default: Date.now
            },
            score: Number,
            tier: String,
            changeReason: String,
            changeAmount: Number
        }],
        lastReputationUpdate: {
            type: Date,
            default: Date.now
        },
        // Activity tracking
        activityMetrics: {
            totalWatchTime: {
                type: Number,
                default: 0
            },
            totalSessions: {
                type: Number,
                default: 0
            },
            averageSessionLength: {
                type: Number,
                default: 0
            },
            streakDays: {
                type: Number,
                default: 0
            },
            longestStreak: {
                type: Number,
                default: 0
            },
            lastSessionDate: {
                type: Date,
                default: null
            },
            // Social interactions
            messagessent: {
                type: Number,
                default: 0
            },
            helpfulActions: {
                type: Number,
                default: 0
            },
            collaborations: {
                type: Number,
                default: 0
            },
            // Achievements
            badgesEarned: {
                type: Number,
                default: 0
            },
            milestonesReached: {
                type: Number,
                default: 0
            },
            tasksCompleted: {
                type: Number,
                default: 0
            }
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
userSchema.index({ userIdentifier: 1, isVerified: 1 });

module.exports = mongoose.model('User', userSchema);