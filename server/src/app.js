const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const developerRoutes = require('./routes/developerRoutes');
const graphRoutes = require('./routes/graphRoutes');
const { getIsConnected, getConnectionError } = require('./config/database');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Simple check middleware: If database connection is failed and request isn't /health, warn client
app.use((req, res, next) => {
  const isConnected = getIsConnected();
  const dbError = getConnectionError();
  
  // Attach connection status to request context
  req.dbStatus = { isConnected, error: dbError };
  next();
});

// Mount routes
app.use('/api/developers', developerRoutes);
app.use('/api/graph', graphRoutes);

const path = require('path');

// Serve static assets of React client in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
} else {
  // Root route (API info) during development
  app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to the DevGraph API',
      database: req.dbStatus.isConnected ? 'Connected' : 'Disconnected',
      endpoints: {
        health: '/api/graph/health',
        stats: '/api/graph/stats',
        graph: '/api/graph',
        developers: '/api/developers',
        technologies: '/api/developers/technologies/all',
        projects: '/api/developers/projects/all'
      }
    });
  });
}

// Global 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err);
  
  // CognoDB/Neo4j specific errors
  if (err.code && err.code.startsWith('Neo.ClientError')) {
    return res.status(400).json({
      error: 'Database query execution error',
      details: err.message,
      code: err.code
    });
  }
  
  if (err.message && (err.message.includes('driver') || err.message.includes('Session'))) {
    return res.status(503).json({
      error: 'Database connection offline',
      details: 'Unable to communicate with CognoDB. Please verify your connection details in server/.env.',
      originalMessage: err.message
    });
  }

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

module.exports = app;
