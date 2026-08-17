const app = require('./app');
const { checkDatabaseConnection, closeDatabaseDriver } = require('./config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('Checking database connection status...');
  const dbStatus = await checkDatabaseConnection();
  
  if (dbStatus.connected) {
    console.log('Successfully connected to CognoDB Graph Database!');
  } else {
    console.warn('-------------------------------------------------------------------');
    console.warn('WARNING: Could not connect to CognoDB on startup.');
    console.warn('Reason:', dbStatus.error);
    console.warn('The API will run, but database queries will fail with 503 errors.');
    console.warn('Make sure to configure CognoDB connection settings in server/.env.');
    console.warn('-------------------------------------------------------------------');
  }

  const server = app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Received shutdown signal. Stopping server gracefully...');
    server.close(async () => {
      console.log('Server stopped listening for connections.');
      await closeDatabaseDriver();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
