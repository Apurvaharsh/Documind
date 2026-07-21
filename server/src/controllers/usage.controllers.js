const prisma = require('../config/prisma.js');

// There is no billing yet, so these are the same for everybody. When plans
// exist they move onto the User record and this constant becomes the free tier.
const PLAN_LIMITS = {
    documents: 50,
    questions: 500,
};

// GET /usage
// Documents is a running total; questions resets with the calendar month,
// which is what the "this month" heading in the UI refers to.
const getUsage = async (req, res) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [documents, questions] = await Promise.all([
            prisma.document.count({ where: { userId: req.user.id } }),
            prisma.query.count({
                where: { userId: req.user.id, createdAt: { gte: startOfMonth } },
            }),
        ]);

        res.status(200).json({
            success: true,
            usage: {
                documents: { used: documents, limit: PLAN_LIMITS.documents },
                questions: { used: questions, limit: PLAN_LIMITS.questions },
            },
            periodStart: startOfMonth,
        });
    } catch (error) {
        console.error('Error fetching usage:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch usage',
        });
    }
};

module.exports = { getUsage, PLAN_LIMITS };
