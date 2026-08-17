const { getSession } = require('../config/database');

/**
 * Retrieves all nodes and edges in the graph to visualize the network.
 */
async function getFullGraph() {
  const session = getSession();
  try {
    // 1. Get all nodes
    const nodesQuery = `
      MATCH (n)
      RETURN n.id AS id, labels(n)[0] AS type, n.name AS name, 
             n.title AS title, n.category AS category, n.status AS status, n.avatarUrl AS avatarUrl
    `;

    // 2. Get all relationships
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
  } finally {
    await session.close();
  }
}

/**
 * Finds the shortest collaboration path between two developers (multi-hop).
 * Returns the nodes and edges along that path.
 */
async function getShortestPath(devId1, devId2) {
  const session = getSession();
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

    // Parse nodes in the path
    path.segments.forEach((segment, index) => {
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
  } finally {
    await session.close();
  }
}

/**
 * Get system statistics (total node/edge counts).
 */
async function getStatistics() {
  const session = getSession();
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
  } finally {
    await session.close();
  }
}

module.exports = {
  getFullGraph,
  getShortestPath,
  getStatistics
};
