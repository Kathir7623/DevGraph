/**
 * API service helper to talk to Express backend.
 * Uses relative paths which are proxied via vite.config.js during dev,
 * and work natively in production when served from same host.
 */

const API_BASE = '/api';

async function request(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, options);
    
    if (res.status === 503) {
      const data = await res.json();
      throw new Error(data.details || 'The database is currently unreachable. Please make sure the CognoDB instance credentials are correctly configured.');
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // Not JSON
      }
      throw new Error(errorJson?.details || errorJson?.error || `Request failed with status ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error(`API Error on ${url}:`, error);
    throw error;
  }
}

export const api = {
  // Health & Database connectivity check
  checkHealth: () => request('/graph/health'),
  
  // Overall node/edge stats
  getStats: () => request('/graph/stats'),
  
  // Full graph metadata (nodes & edges) for the explorer
  getFullGraph: () => request('/graph'),
  
  // Multi-hop path finding between two developers
  getShortestPath: (fromId, toId) => request(`/graph/shortest-path?from=${fromId}&to=${toId}`),
  
  // Developers list (with optional search and skill filters)
  getDevelopers: (search = '', skill = '') => {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (skill) query.append('skill', skill);
    const queryString = query.toString();
    return request(`/developers${queryString ? `?${queryString}` : ''}`);
  },
  
  // Single developer detail (including skills & projects)
  getDeveloperById: (id) => request(`/developers/${id}`),
  
  // Advanced collaborator/skill recommendations for a dev
  getRecommendations: (id) => request(`/developers/${id}/recommendations`),
  
  // Get all metadata list of projects
  getProjects: () => request('/developers/projects/all'),
  
  // Get all metadata list of technologies
  getTechnologies: () => request('/developers/technologies/all')
};
