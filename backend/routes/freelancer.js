const express = require('express');
const freelancerAPI = require('../services/freelancerAPI');

const router = express.Router();

/**
 * GET /api/freelancer/profile - Get current user profile
 */
router.get('/profile', async (req, res) => {
  try {
    const result = await freelancerAPI.getSelfProfile();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
