const { getSession } = require('../config/database');

/**
 * Helper to convert Neo4j Integer objects { low, high } into standard JS numbers.
 */
function convertNeo4jInteger(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && val.low !== undefined) {
    return val.low;
  }
  return val;
}

/**
 * Get all developers with optional search and skill filtering.
 */
async function getAllDevelopers(search = '', skillFilter = '') {
  const session = getSession();
  try {
    const query = `
      MATCH (d:Developer)
      OPTIONAL MATCH (d)-[r:KNOWS]->(t:Technology)
      WITH d, collect({ 
        id: t.id, 
        name: t.name, 
        category: t.category, 
        level: r.level, 
        years: r.years 
      }) AS rawSkills
      WITH d, [x in rawSkills WHERE x.id IS NOT NULL] AS skills
      WHERE 
        ($search = '' OR toLower(d.name) CONTAINS toLower($search) OR toLower(d.title) CONTAINS toLower($search))
        AND ($skillFilter = '' OR any(s IN skills WHERE s.id = $skillFilter))
      RETURN d { .*, skills: skills } AS d
      ORDER BY d.name
    `;

    const result = await session.run(query, {
      search: search || '',
      skillFilter: skillFilter || ''
    });

    return result.records.map(record => {
      const dev = record.get('d');
      if (dev && dev.skills) {
        dev.skills = dev.skills.map(s => ({
          ...s,
          years: convertNeo4jInteger(s.years)
        }));
      }
      return dev;
    });
  } finally {
    await session.close();
  }
}

/**
 * Get a specific developer's profile by ID.
 */
async function getDeveloperById(id) {
  const session = getSession();
  try {
    const query = `
      MATCH (d:Developer {id: $id})
      OPTIONAL MATCH (d)-[k:KNOWS]->(t:Technology)
      WITH d, collect({ 
        id: t.id, 
        name: t.name, 
        category: t.category, 
        level: k.level, 
        years: k.years 
      }) AS rawSkills
      WITH d, [x in rawSkills WHERE x.id IS NOT NULL] AS skills
      
      OPTIONAL MATCH (d)-[w:WORKED_ON]->(p:Project)
      WITH d, skills, collect({ 
        id: p.id, 
        name: p.name, 
        description: p.description, 
        status: p.status, 
        role: w.role 
      }) AS rawProjects
      WITH d, skills, [x in rawProjects WHERE x.id IS NOT NULL] AS projects
      
      RETURN d { .*, skills: skills, projects: projects } AS d
    `;

    const result = await session.run(query, { id });
    if (result.records.length === 0) {
      return null;
    }
    const dev = result.records[0].get('d');
    if (dev && dev.skills) {
      dev.skills = dev.skills.map(s => ({
        ...s,
        years: convertNeo4jInteger(s.years)
      }));
    }
    return dev;
  } finally {
    await session.close();
  }
}

/**
 * Get recommendations for a specific developer.
 * Includes:
 * 1. Skills to learn (technologies used in projects they worked on, but they don't know).
 * 2. Collaborators of collaborators (2-hop separation) they haven't directly worked with yet.
 */
async function getDeveloperRecommendations(id) {
  const session = getSession();
  try {
    // 1. Skill recommendations: Technologies used on projects they worked on, but don't KNOWS.
    const skillRecQuery = `
      MATCH (d:Developer {id: $id})-[:WORKED_ON]->(p:Project)-[:USES]->(t:Technology)
      WHERE NOT (d)-[:KNOWS]->(t)
      WITH t, count(p) AS exposureCount
      RETURN t { .*, exposureCount: exposureCount } AS t
      ORDER BY t.exposureCount DESC
    `;

    // 2. Collaborator recommendations: Friends of friends. People who have worked on projects with
    // people they worked with, but who they have not directly shared a project with.
    const colleagueRecQuery = `
      MATCH (d:Developer {id: $id})-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(colleague:Developer)
      MATCH (colleague)-[:WORKED_ON]->(p:Project)<-[:WORKED_ON]-(recommendation:Developer)
      WHERE recommendation <> d 
        AND NOT (d)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(recommendation)
      WITH recommendation, count(distinct colleague) AS mutualCount
      RETURN recommendation { .*, mutualCount: mutualCount } AS recommendation
      ORDER BY recommendation.mutualCount DESC
      LIMIT 5
    `;

    const skillResult = await session.run(skillRecQuery, { id });
    const colleagueResult = await session.run(colleagueRecQuery, { id });

    return {
      recommendedSkills: skillResult.records.map(r => {
        const tech = r.get('t');
        if (tech) {
          tech.exposureCount = convertNeo4jInteger(tech.exposureCount);
        }
        return tech;
      }),
      recommendedCollaborators: colleagueResult.records.map(r => {
        const dev = r.get('recommendation');
        if (dev) {
          dev.mutualCount = convertNeo4jInteger(dev.mutualCount);
        }
        return dev;
      })
    };
  } finally {
    await session.close();
  }
}

/**
 * Get all projects.
 */
async function getAllProjects() {
  const session = getSession();
  try {
    const query = `
      MATCH (p:Project)
      OPTIONAL MATCH (p)-[:USES]->(t:Technology)
      WITH p, collect(t.name) as techStack
      OPTIONAL MATCH (p)<-[w:WORKED_ON]-(d:Developer)
      WITH p, techStack, collect(d.name) as team
      RETURN p { .*, techStack: techStack, team: team } AS p
      ORDER BY p.name
    `;
    const result = await session.run(query);
    return result.records.map(r => r.get('p'));
  } finally {
    await session.close();
  }
}

/**
 * Get all technologies, grouped by category or with counts of developers who know them.
 */
async function getAllTechnologies() {
  const session = getSession();
  try {
    const query = `
      MATCH (t:Technology)
      OPTIONAL MATCH (d:Developer)-[:KNOWS]->(t)
      WITH t, count(d) AS devCount
      RETURN t { .*, developerCount: devCount } AS t
      ORDER BY t.category, t.name
    `;
    const result = await session.run(query);
    return result.records.map(r => {
      const tech = r.get('t');
      if (tech) {
        tech.developerCount = convertNeo4jInteger(tech.developerCount);
      }
      return tech;
    });
  } finally {
    await session.close();
  }
}

module.exports = {
  getAllDevelopers,
  getDeveloperById,
  getDeveloperRecommendations,
  getAllProjects,
  getAllTechnologies
};
