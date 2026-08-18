const { getSession, isLocalMode } = require('../config/database');
const localGraphService = require('./localGraphService');

function convertNeo4jInteger(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && val.low !== undefined) {
    return val.low;
  }
  return val;
}

async function getAllDevelopers(search = '', skillFilter = '') {
  if (isLocalMode()) {
    return localGraphService.getAllDevelopers(search, skillFilter);
  }
  const session = getSession();
  if (!session) {
    return localGraphService.getAllDevelopers(search, skillFilter);
  }
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
  } catch (err) {
    console.warn('Neo4j query error, falling back to local:', err.message);
    return localGraphService.getAllDevelopers(search, skillFilter);
  } finally {
    if (session) await session.close();
  }
}

async function getDeveloperById(id) {
  if (isLocalMode()) {
    return localGraphService.getDeveloperById(id);
  }
  const session = getSession();
  if (!session) {
    return localGraphService.getDeveloperById(id);
  }
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
  } catch (err) {
    console.warn('Neo4j query error, falling back to local:', err.message);
    return localGraphService.getDeveloperById(id);
  } finally {
    if (session) await session.close();
  }
}

async function getDeveloperRecommendations(id) {
  if (isLocalMode()) {
    return localGraphService.getDeveloperRecommendations(id);
  }
  const session = getSession();
  if (!session) {
    return localGraphService.getDeveloperRecommendations(id);
  }
  try {
    const skillRecQuery = `
      MATCH (d:Developer {id: $id})-[:WORKED_ON]->(p:Project)-[:USES]->(t:Technology)
      WHERE NOT (d)-[:KNOWS]->(t)
      WITH t, count(p) AS exposureCount
      RETURN t { .*, exposureCount: exposureCount } AS t
      ORDER BY t.exposureCount DESC
    `;

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
  } catch (err) {
    console.warn('Neo4j query error, falling back to local:', err.message);
    return localGraphService.getDeveloperRecommendations(id);
  } finally {
    if (session) await session.close();
  }
}

async function getAllProjects() {
  if (isLocalMode()) {
    return localGraphService.getAllProjects();
  }
  const session = getSession();
  if (!session) {
    return localGraphService.getAllProjects();
  }
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
  } catch (err) {
    console.warn('Neo4j query error, falling back to local:', err.message);
    return localGraphService.getAllProjects();
  } finally {
    if (session) await session.close();
  }
}

async function getAllTechnologies() {
  if (isLocalMode()) {
    return localGraphService.getAllTechnologies();
  }
  const session = getSession();
  if (!session) {
    return localGraphService.getAllTechnologies();
  }
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
  } catch (err) {
    console.warn('Neo4j query error, falling back to local:', err.message);
    return localGraphService.getAllTechnologies();
  } finally {
    if (session) await session.close();
  }
}

module.exports = {
  getAllDevelopers,
  getDeveloperById,
  getDeveloperRecommendations,
  getAllProjects,
  getAllTechnologies
};
