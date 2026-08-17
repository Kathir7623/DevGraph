const express = require('express');
const router = express.Router();
const graphService = require('../services/graphService');
const { checkDatabaseConnection, getIsConnected, getConnectionError } = require('../config/database');

// Get full visualization graph JSON
router.get('/', async (req, res, next) => {
  try {
    const graphData = await graphService.getFullGraph();
    res.json(graphData);
  } catch (error) {
    next(error);
  }
});

// Find shortest path between two developers
router.get('/shortest-path', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'Both "from" and "to" parameters are required' });
    }
    const pathData = await graphService.getShortestPath(from, to);
    res.json(pathData);
  } catch (error) {
    next(error);
  }
});

// Get system counts / stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await graphService.getStatistics();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Database health check route
router.get('/health', async (req, res) => {
  const result = await checkDatabaseConnection();
  if (result.connected) {
    res.json({
      status: 'healthy',
      database: 'connected'
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: result.error
    });
  }
});

module.exports = router;
