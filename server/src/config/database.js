const neo4j = require('neo4j-driver');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config();

const uri = process.env.COGNODB_URI || process.env.NEO4J_URI;
const username = process.env.COGNODB_USERNAME || process.env.NEO4J_USERNAME || 'cognodb';
const password = process.env.COGNODB_PASSWORD || process.env.NEO4J_PASSWORD;

let driver = null;
let isConnected = false;
let isLocalFallback = false;
let connectionError = null;

if (uri && password && !uri.includes('<instance-id>')) {
  try {
    console.log(`Initializing Neo4j Bolt driver for CognoDB at: ${uri}`);
    driver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password),
      {
        maxConnectionPoolSize: 50,
        connectionTimeout: 5000,
        logging: {
          level: 'warn',
          logger: (level, message) => console.log(`[Neo4j ${level.toUpperCase()}] ${message}`)
        }
      }
    );
  } catch (err) {
    console.warn('Failed to create Neo4j driver, enabling local graph mode:', err.message);
    driver = null;
  }
}

/**
 * Verifies connection connectivity to CognoDB / Neo4j, or falls back to local in-memory graph.
 */
async function checkDatabaseConnection() {
  if (driver) {
    const session = driver.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const result = await session.run('RETURN 1 AS test');
      const singleRecord = result.records[0];
      const testVal = singleRecord.get('test');
      
      if (testVal.toNumber() === 1) {
        isConnected = true;
        isLocalFallback = false;
        connectionError = null;
        return { connected: true, mode: 'remote' };
      }
    } catch (err) {
      console.warn(`Remote database unreachable (${err.message}). Using local in-memory dataset.`);
    } finally {
      await session.close();
    }
  }

  // Fallback to local in-memory mode
  isConnected = true;
  isLocalFallback = true;
  connectionError = null;
  return { connected: true, mode: 'local' };
}

function getSession(options = {}) {
  if (!driver || isLocalFallback) {
    return null;
  }
  return driver.session(options);
}

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
  isLocalMode: () => isLocalFallback || !driver,
  getConnectionError: () => connectionError
};
