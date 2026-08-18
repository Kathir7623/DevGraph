const fs = require('fs');
const path = require('path');

const SEED_DIR = path.join(__dirname, '../../../database/seed');

function loadJSON(filename) {
  try {
    const filePath = path.join(SEED_DIR, filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error loading seed file ${filename}:`, err);
    return [];
  }
}

function loadDevelopers() {
  return loadJSON('developers.json');
}

function loadTechnologies() {
  return loadJSON('technologies.json');
}

function loadProjects() {
  return loadJSON('projects.json');
}

function getAllDevelopers(search = '', skillFilter = '') {
  const devs = loadDevelopers();
  const techs = loadTechnologies();
  const techMap = new Map(techs.map(t => [t.id, t]));

  let result = devs.map(d => {
    const skills = (d.skills || []).map(s => {
      const tech = techMap.get(s.techId) || {};
      return {
        id: s.techId,
        name: tech.name || s.techId,
        category: tech.category || 'General',
        level: s.level,
        years: s.years
      };
    });
    return {
      id: d.id,
      name: d.name,
      title: d.title,
      email: d.email,
      location: d.location,
      bio: d.bio,
      avatarUrl: d.avatarUrl,
      skills
    };
  });

  if (search) {
    const s = search.toLowerCase();
    result = result.filter(d => 
      (d.name && d.name.toLowerCase().includes(s)) ||
      (d.title && d.title.toLowerCase().includes(s))
    );
  }

  if (skillFilter) {
    result = result.filter(d => (d.skills || []).some(s => s.id === skillFilter));
  }

  result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return result;
}

function getDeveloperById(id) {
  const devs = loadDevelopers();
  const techs = loadTechnologies();
  const projects = loadProjects();
  const techMap = new Map(techs.map(t => [t.id, t]));

  const dev = devs.find(d => d.id === id);
  if (!dev) return null;

  const skills = (dev.skills || []).map(s => {
    const tech = techMap.get(s.techId) || {};
    return {
      id: s.techId,
      name: tech.name || s.techId,
      category: tech.category || 'General',
      level: s.level,
      years: s.years
    };
  });

  const devProjects = [];
  for (const p of projects) {
    const contributor = (p.contributors || []).find(c => c.devId === id);
    if (contributor) {
      devProjects.push({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        role: contributor.role
      });
    }
  }

  return {
    id: dev.id,
    name: dev.name,
    title: dev.title,
    email: dev.email,
    location: dev.location,
    bio: dev.bio,
    avatarUrl: dev.avatarUrl,
    skills,
    projects: devProjects
  };
}

function getDeveloperRecommendations(id) {
  const devs = loadDevelopers();
  const techs = loadTechnologies();
  const projects = loadProjects();
  const dev = devs.find(d => d.id === id);
  if (!dev) return { recommendedSkills: [], recommendedCollaborators: [] };

  const knownTechIds = new Set((dev.skills || []).map(s => s.techId));
  const techMap = new Map(techs.map(t => [t.id, t]));

  const workedProjects = projects.filter(p => (p.contributors || []).some(c => c.devId === id));

  const techExposure = new Map();
  for (const p of workedProjects) {
    for (const tId of (p.techStack || [])) {
      if (!knownTechIds.has(tId)) {
        techExposure.set(tId, (techExposure.get(tId) || 0) + 1);
      }
    }
  }

  const recommendedSkills = Array.from(techExposure.entries()).map(([tId, count]) => {
    const t = techMap.get(tId) || { id: tId, name: tId };
    return {
      ...t,
      exposureCount: count
    };
  }).sort((a, b) => b.exposureCount - a.exposureCount);

  const directCollaboratorIds = new Set();
  for (const p of workedProjects) {
    for (const c of (p.contributors || [])) {
      if (c.devId !== id) {
        directCollaboratorIds.add(c.devId);
      }
    }
  }

  const candidateMutuals = new Map();
  for (const colleagueId of directCollaboratorIds) {
    const colleagueProjects = projects.filter(p => (p.contributors || []).some(c => c.devId === colleagueId));
    for (const cp of colleagueProjects) {
      for (const c of (cp.contributors || [])) {
        const candidateId = c.devId;
        if (candidateId !== id && !directCollaboratorIds.has(candidateId)) {
          if (!candidateMutuals.has(candidateId)) {
            candidateMutuals.set(candidateId, new Set());
          }
          candidateMutuals.get(candidateId).add(colleagueId);
        }
      }
    }
  }

  const devMap = new Map(devs.map(d => [d.id, d]));
  const recommendedCollaborators = Array.from(candidateMutuals.entries()).map(([candId, mutualSet]) => {
    const cDev = devMap.get(candId) || { id: candId };
    return {
      ...cDev,
      mutualCount: mutualSet.size
    };
  }).sort((a, b) => b.mutualCount - a.mutualCount).slice(0, 5);

  return {
    recommendedSkills,
    recommendedCollaborators
  };
}

function getAllProjects() {
  const projects = loadProjects();
  const devs = loadDevelopers();
  const techs = loadTechnologies();
  const devMap = new Map(devs.map(d => [d.id, d.name]));
  const techMap = new Map(techs.map(t => [t.id, t.name]));

  const result = projects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    repoUrl: p.repoUrl,
    techStack: (p.techStack || []).map(tId => techMap.get(tId) || tId),
    team: (p.contributors || []).map(c => devMap.get(c.devId) || c.devId)
  }));
  result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return result;
}

function getAllTechnologies() {
  const techs = loadTechnologies();
  const devs = loadDevelopers();
  
  const counts = new Map();
  for (const d of devs) {
    for (const s of (d.skills || [])) {
      counts.set(s.techId, (counts.get(s.techId) || 0) + 1);
    }
  }

  const result = techs.map(t => ({
    ...t,
    developerCount: counts.get(t.id) || 0
  }));

  result.sort((a, b) => {
    const catCmp = (a.category || '').localeCompare(b.category || '');
    if (catCmp !== 0) return catCmp;
    return (a.name || '').localeCompare(b.name || '');
  });
  return result;
}

function getFullGraph() {
  const devs = loadDevelopers();
  const techs = loadTechnologies();
  const projects = loadProjects();

  const nodes = [
    ...devs.map(d => ({
      id: d.id,
      type: 'Developer',
      name: d.name,
      title: d.title,
      avatarUrl: d.avatarUrl || null
    })),
    ...techs.map(t => ({
      id: t.id,
      type: 'Technology',
      name: t.name,
      title: t.category,
      avatarUrl: null
    })),
    ...projects.map(p => ({
      id: p.id,
      type: 'Project',
      name: p.name,
      title: p.status,
      avatarUrl: null
    }))
  ];

  const links = [];

  for (const d of devs) {
    for (const s of (d.skills || [])) {
      links.push({
        source: d.id,
        target: s.techId,
        type: 'KNOWS'
      });
    }
  }

  for (const p of projects) {
    for (const c of (p.contributors || [])) {
      links.push({
        source: c.devId,
        target: p.id,
        type: 'WORKED_ON'
      });
    }
  }

  for (const p of projects) {
    for (const tId of (p.techStack || [])) {
      links.push({
        source: p.id,
        target: tId,
        type: 'USES'
      });
    }
  }

  return { nodes, links };
}

function getShortestPath(devId1, devId2) {
  if (devId1 === devId2) return { nodes: [], links: [] };

  const devs = loadDevelopers();
  const projects = loadProjects();
  const devMap = new Map(devs.map(d => [d.id, d]));
  const projMap = new Map(projects.map(p => [p.id, p]));

  const adj = new Map();
  const addEdge = (u, v) => {
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u).push(v);
    adj.get(v).push(u);
  };

  for (const p of projects) {
    for (const c of (p.contributors || [])) {
      addEdge(c.devId, p.id);
    }
  }

  const queue = [devId1];
  const visited = new Set([devId1]);
  const parent = new Map();

  let found = false;
  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr === devId2) {
      found = true;
      break;
    }
    for (const neighbor of (adj.get(curr) || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, curr);
        queue.push(neighbor);
      }
    }
  }

  if (!found) {
    return { nodes: [], links: [] };
  }

  const pathNodes = [];
  let curr = devId2;
  while (curr !== undefined) {
    pathNodes.unshift(curr);
    curr = parent.get(curr);
  }

  const nodes = [];
  const links = [];

  for (let i = 0; i < pathNodes.length; i++) {
    const id = pathNodes[i];
    if (devMap.has(id)) {
      const d = devMap.get(id);
      nodes.push({
        id: d.id,
        type: 'Developer',
        name: d.name,
        title: d.title,
        avatarUrl: d.avatarUrl || null
      });
    } else if (projMap.has(id)) {
      const p = projMap.get(id);
      nodes.push({
        id: p.id,
        type: 'Project',
        name: p.name,
        title: p.status,
        avatarUrl: null
      });
    }

    if (i < pathNodes.length - 1) {
      links.push({
        source: pathNodes[i],
        target: pathNodes[i + 1],
        type: 'WORKED_ON'
      });
    }
  }

  return { nodes, links };
}

function getStatistics() {
  const devs = loadDevelopers();
  const techs = loadTechnologies();
  const projects = loadProjects();
  const fullGraph = getFullGraph();

  return {
    developers: devs.length,
    technologies: techs.length,
    projects: projects.length,
    relationships: fullGraph.links.length
  };
}

module.exports = {
  getAllDevelopers,
  getDeveloperById,
  getDeveloperRecommendations,
  getAllProjects,
  getAllTechnologies,
  getFullGraph,
  getShortestPath,
  getStatistics
};
