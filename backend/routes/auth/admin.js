const express = require('express');
const User = require('../../models/User');

const router = express.Router();

// Get all verified users (admin endpoint)
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({ isVerified: true })
            .select('-userDefinedData') // Don't expose sensitive data
            .sort({ verificationDate: -1 });
        
        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

// Get user statistics
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const recentUsers = await User.countDocuments({ 
            verificationDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
        });
        
        // Get nationality distribution
        const nationalityStats = await User.aggregate([
            { $match: { isVerified: true, nationality: { $ne: null } } },
            { $group: { _id: "$nationality", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            stats: {
                totalUsers,
                verifiedUsers,
                recentUsers,
                verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0,
                nationalityDistribution: nationalityStats
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

module.exports = router;