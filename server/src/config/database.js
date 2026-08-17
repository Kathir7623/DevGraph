const neo4j = require('neo4j-driver');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config();

const uri = process.env.COGNODB_URI || process.env.NEO4J_URI;
const username = process.env.COGNODB_USERNAME || process.env.NEO4J_USERNAME || 'cognodb';
const password = process.env.COGNODB_PASSWORD || process.env.NEO4J_PASSWORD;

let driver;
let isConnected = false;
let connectionError = null;

if (!uri || !password) {
  const errorMsg = 'COGNODB_URI and COGNODB_PASSWORD are not defined in env variables.';
  console.error(`Database Config Error: ${errorMsg}`);
  connectionError = errorMsg;
} else {
  try {
    console.log(`Initializing Neo4j Bolt driver for CognoDB at: ${uri}`);
    driver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password),
      {
        maxConnectionPoolSize: 50,
        connectionTimeout: 10000, // 10s
        logging: {
          level: 'warn',
          logger: (level, message) => console.log(`[Neo4j ${level.toUpperCase()}] ${message}`)
        }
      }
    );
  } catch (err) {
    console.error('Failed to create Neo4j driver:', err);
    connectionError = err.message;
  }
}

/**
 * Verifies connection connectivity to CognoDB.
 */
async function checkDatabaseConnection() {
  if (!driver) {
    return { connected: false, error: connectionError || 'Driver not initialized' };
  }

  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    // Run simple query to verify connection
    const result = await session.run('RETURN 1 AS test');
    const singleRecord = result.records[0];
    const testVal = singleRecord.get('test');
    
    if (testVal.toNumber() === 1) {
      isConnected = true;
      connectionError = null;
      return { connected: true };
    }
    throw new Error('Invalid connection check response');
  } catch (err) {
    isConnected = false;
    connectionError = err.message;
    console.error(`Database connection check failed: ${err.message}`);
    return { connected: false, error: err.message };
  } finally {
    await session.close();
  }
}

/**
 * Gets a new database session.
 * Throws an error if driver is not initialized or database is unreachable.
 */
function getSession(options = {}) {
  if (!driver) {
    throw new Error('Database driver is not initialized. Please verify configuration.');
  }
  return driver.session(options);
}

/**
 * Closes the database driver connection when shutting down the server.
 */
async function closeDatabaseDriver() {
  if (driver) {
    console.log('Closing CognoDB driver connections...');
    await driver.close();
    console.log('CognoDB driver connections closed.');
  }
}

module.exports = {
  driver,
  getSession,
  checkDatabaseConnection,
  closeDatabaseDriver,
  getIsConnected: () => isConnected,
  getConnectionError: () => connectionError
};
