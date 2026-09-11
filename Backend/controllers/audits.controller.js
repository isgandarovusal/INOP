const Audit = require('../models/audit.model');

function normalizeAuditPayload(body) {
  return {
    ...body,
    id: body.id,
    restaurantId: body.restaurantId,
    auditorId: body.auditorId || 'unknown',
    auditType: body.auditType,
    date: body.date,
  };
}

async function getAudits(req, res) {
  try {
    const audits = await Audit.find().sort({ date: -1, createdAt: -1 });
    res.json(audits);
  } catch (error) {
    console.error('Failed to fetch audits:', error);
    res.status(500).json({ message: 'Failed to fetch audits' });
  }
}

async function getAuditById(req, res) {
  try {
    const audit = await Audit.findOne({ id: req.params.id });

    if (!audit) {
      return res.status(404).json({ message: 'Audit not found' });
    }

    res.json(audit);
  } catch (error) {
    console.error('Failed to fetch audit:', error);
    res.status(500).json({ message: 'Failed to fetch audit' });
  }
}

async function createAudit(req, res) {
  try {
    const payload = normalizeAuditPayload(req.body);

    if (!payload.id) {
      return res.status(400).json({ message: 'Audit id is required' });
    }

    const audit = await Audit.create(payload);

    res.status(201).json(audit);
  } catch (error) {
    console.error('Failed to create audit:', error);

    if (error.code === 11000) {
      return res.status(409).json({ message: 'Audit id already exists' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid audit data',
        errors: error.errors,
      });
    }

    res.status(500).json({ message: 'Failed to create audit' });
  }
}

async function updateAudit(req, res) {
  try {
    const payload = normalizeAuditPayload(req.body);

    delete payload.id;

    const audit = await Audit.findOneAndUpdate(
      { id: req.params.id },
      { $set: payload },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!audit) {
      return res.status(404).json({ message: 'Audit not found' });
    }

    res.json(audit);
  } catch (error) {
    console.error('Failed to update audit:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid audit data',
        errors: error.errors,
      });
    }

    res.status(500).json({ message: 'Failed to update audit' });
  }
}

async function deleteAudit(req, res) {
  try {
    const audit = await Audit.findOneAndDelete({ id: req.params.id });

    if (!audit) {
      return res.status(404).json({ message: 'Audit not found' });
    }

    res.json({ message: 'Audit deleted successfully' });
  } catch (error) {
    console.error('Failed to delete audit:', error);
    res.status(500).json({ message: 'Failed to delete audit' });
  }
}


async function getAuditAnalytics(req, res) {
  try {
    const [summary] = await Audit.aggregate([
      {
        $addFields: {
          calculatedOverallScore: {
            $divide: [
              {
                $add: [
                  '$scores.cleanliness',
                  '$scores.service',
                  '$scores.food',
                  '$scores.staff',
                ],
              },
              4,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          overallScore: { $avg: '$calculatedOverallScore' },
          totalAudits: { $sum: 1 },
          restaurants: { $addToSet: '$restaurantId' },
          criticalCount: {
            $sum: {
              $cond: [
                { $lt: ['$calculatedOverallScore', 7] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    if (!summary) {
      return res.json({
        overallScore: 0,
        totalAudits: 0,
        restaurantsAudited: 0,
        criticalCount: 0,
        restaurantComparison: [],
        categoryAnalysis: [],
        historicalTrend: [],
      });
    }

    const [restaurantComparison, categoryAnalysis, historicalTrend] =
      await Promise.all([
        Audit.aggregate([
          {
            $group: {
              _id: '$restaurantId',
              score: {
                $avg: {
                  $divide: [
                    {
                      $add: [
                        '$scores.cleanliness',
                        '$scores.service',
                        '$scores.food',
                        '$scores.staff',
                      ],
                    },
                    4,
                  ],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              restaurantId: '$_id',
              name: '$_id',
              score: { $round: ['$score', 1] },
            },
          },
          { $sort: { score: -1 } },
        ]),

        Audit.aggregate([
          {
            $group: {
              _id: null,
              food: { $avg: '$scores.food' },
              cleanliness: { $avg: '$scores.cleanliness' },
              staff: { $avg: '$scores.staff' },
              service: { $avg: '$scores.service' },
            },
          },
          {
            $project: {
              _id: 0,
              categories: [
                {
                  category: 'Food',
                  score: { $round: ['$food', 1] },
                },
                {
                  category: 'Cleanliness',
                  score: { $round: ['$cleanliness', 1] },
                },
                {
                  category: 'Staff',
                  score: { $round: ['$staff', 1] },
                },
                {
                  category: 'Service',
                  score: { $round: ['$service', 1] },
                },
              ],
            },
          },
          { $unwind: '$categories' },
          { $replaceRoot: { newRoot: '$categories' } },
          { $sort: { score: -1 } },
        ]),

        Audit.aggregate([
          {
            $addFields: {
              auditDate: {
                $dateFromString: {
                  dateString: '$date',
                  format: '%Y-%m-%d',
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
          {
            $match: {
              auditDate: { $ne: null },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$auditDate' },
                month: { $month: '$auditDate' },
              },
              score: {
                $avg: {
                  $divide: [
                    {
                      $add: [
                        '$scores.cleanliness',
                        '$scores.service',
                        '$scores.food',
                        '$scores.staff',
                      ],
                    },
                    4,
                  ],
                },
              },
            },
          },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1,
            },
          },
          {
            $project: {
              _id: 0,
              label: {
                $dateToString: {
                  format: '%b %y',
                  date: {
                    $dateFromParts: {
                      year: '$_id.year',
                      month: '$_id.month',
                      day: 1,
                    },
                  },
                },
              },
              score: { $round: ['$score', 1] },
            },
          },
        ]),
      ]);

    res.json({
      overallScore: Math.round(summary.overallScore * 10) / 10,
      totalAudits: summary.totalAudits,
      restaurantsAudited: summary.restaurants.length,
      criticalCount: summary.criticalCount,
      restaurantComparison,
      categoryAnalysis,
      historicalTrend,
    });
  } catch (error) {
    console.error('Failed to calculate audit analytics:', error);
    res.status(500).json({ message: 'Failed to calculate audit analytics' });
  }
}

module.exports = {
  getAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
  getAuditAnalytics,
};
