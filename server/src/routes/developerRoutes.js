const express = require('express');
const router = express.Router();
const developerService = require('../services/developerService');

// Get all developers
router.get('/', async (req, res, next) => {
  try {
    const { search, skill } = req.query;
    const developers = await developerService.getAllDevelopers(search, skill);
    res.json(developers);
  } catch (error) {
    next(error);
  }
});

// Get all projects
router.get('/projects/all', async (req, res, next) => {
  try {
    const projects = await developerService.getAllProjects();
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

// Get all technologies
router.get('/technologies/all', async (req, res, next) => {
  try {
    const technologies = await developerService.getAllTechnologies();
    res.json(technologies);
  } catch (error) {
    next(error);
  }
});

// Get a developer by ID
router.get('/:id', async (req, res, next) => {
  try {
    const developer = await developerService.getDeveloperById(req.params.id);
    if (!developer) {
      return res.status(404).json({ error: 'Developer not found' });
    }
    res.json(developer);
  } catch (error) {
    next(error);
  }
});

// Get recommendations for a developer
router.get('/:id/recommendations', async (req, res, next) => {
  try {
    const recommendations = await developerService.getDeveloperRecommendations(req.params.id);
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
