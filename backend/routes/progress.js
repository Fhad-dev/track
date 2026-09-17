const express = require('express');
const progressService = require('../services/progressService');
const { requireAuth } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');
const { isUuid } = require('../utils/validate');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const summary = await progressService.getUserProgressSummary(req.session.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { challengeId, masteryCamoId } = req.body || {};
    if (challengeId) {
      if (!isUuid(challengeId)) throw new ApiError(400, 'Invalid challenge id.');
      await progressService.markChallengeComplete(req.session.userId, challengeId);
    } else if (masteryCamoId) {
      if (!isUuid(masteryCamoId)) throw new ApiError(400, 'Invalid mastery camo id.');
      await progressService.markMasteryComplete(req.session.userId, masteryCamoId);
    } else {
      throw new ApiError(400, 'challengeId or masteryCamoId is required.');
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/challenge/:challengeId', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.challengeId)) throw new ApiError(400, 'Invalid challenge id.');
    await progressService.markChallengeIncomplete(req.session.userId, req.params.challengeId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/mastery/:masteryCamoId', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.masteryCamoId)) throw new ApiError(400, 'Invalid mastery camo id.');
    await progressService.markMasteryIncomplete(req.session.userId, req.params.masteryCamoId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
