const { getSession, isLocalMode } = require('../config/database');
const localGraphService = require('./localGraphService');

async function getFullGraph() {
  if (isLocalMode()) {
    return localGraphService.getFullGraph();
  }
  const session = getSession();
  if (!session) {
    return localGraphService.getFullGraph();
  }
  try {
    const nodesQuery = `
      MATCH (n)
      RETURN n.id AS id, labels(n)[0] AS type, n.name AS name, 
             n.title AS title, n.category AS category, n.status AS status, n.avatarUrl AS avatarUrl
    `;

    const linksQuery = `
      MATCH (n)-[r]->(m)
      RETURN n.id AS source, m.id AS target, type(r) AS type
    `;

    const nodesResult = await session.run(nodesQuery);
    const linksResult = await session.run(linksQuery);

    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      type: record.get('type'),
      name: record.get('name'),
      title: record.get('title') || record.get('category') || record.get('status'),
      avatarUrl: record.get('avatarUrl') || null
    }));

    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      type: record.get('type')
    }));

    return { nodes, links };
  } catch (err) {
    console.warn('Neo4j query error, falling back to local:', err.message);
    return localGraphService.getFullGraph();
  } finally {
    if (session) await session.close();
  }
}

async function getShortestPath(devId1, devId2) {
  if (isLocalMode()) {
    return localGraphService.getShortestPath(devId1, devId2);
  }
  const session = getSession();
  if (!session) {
    return localGraphService.getShortestPath(devId1, devId2);
  }
  try {
    const query = `
      MATCH path = shortestPath((d1:Developer {id: $devId1})-[:WORKED_ON*..10]-(d2:Developer {id: $devId2}))
      RETURN path
    `;

    const result = await session.run(query, { devId1, devId2 });
    if (result.records.length === 0) {
      return { nodes: [], links: [] };
    }

    const path = result.records[0].get('path');
    const nodes = [];
    const links = [];
    const seenNodes = new Set();

    path.segments.forEach((segment) => {
      const startNode = segment.start;
      const endNode = segment.end;
      const rel = segment.relationship;

      const formatNode = (node) => {
        const type = node.labels[0];
        const props = node.properties;
        return {
          id: props.id,
          type: type,
          name: props.name,
          title: props.title || props.category || props.status,
          avatarUrl: props.avatarUrl || null
        };
      };

      if (!seenNodes.has(startNode.properties.id)) {
        nodes.push(formatNode(startNode));
        seenNodes.add(startNode.properties.id);
      }
      if (!seenNodes.has(endNode.properties.id)) {
        nodes.push(formatNode(endNode));
        seenNodes.add(endNode.properties.id);
      }

      links.push({
        source: startNode.properties.id,
        target: endNode.properties.id,
        type: rel.type
      });
    });

    return { nodes, links };
  } catch (err) {
    console.warn('Neo4j query error, falling back to local:', err.message);
    return localGraphService.getShortestPath(devId1, devId2);
  } finally {
    if (session) await session.close();
  }
}

async function getStatistics() {
  if (isLocalMode()) {
    return localGraphService.getStatistics();
  }
  const session = getSession();
  if (!session) {
    return localGraphService.getStatistics();
  }
  try {
    const query = `
      MATCH (d:Developer) WITH count(d) AS devCount
      MATCH (t:Technology) WITH devCount, count(t) AS techCount
      MATCH (p:Project) WITH devCount, techCount, count(p) AS projCount
      MATCH ()-[r]->() RETURN devCount, techCount, projCount, count(r) AS relCount
    `;

    const result = await session.run(query);
    if (result.records.length === 0) {
      return { developers: 0, technologies: 0, projects: 0, relationships: 0 };
    }

    const record = result.records[0];
    return {
      developers: record.get('devCount').toNumber(),
      technologies: record.get('techCount').toNumber(),
      projects: record.get('projCount').toNumber(),
      relationships: record.get('relCount').toNumber()
    };
  } catch (err) {
    console.warn('Neo4j query error, falling back to local:', err.message);
    return localGraphService.getStatistics();
  } finally {
    if (session) await session.close();
  }
}

module.exports = {
  getFullGraph,
  getShortestPath,
  getStatistics
};
