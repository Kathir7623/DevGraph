import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import GraphView from '../components/GraphView';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { Info, User, Code, FolderGit, ExternalLink, Sliders } from 'lucide-react';

export default function Explore({ selectedPath, onSelectDeveloper }) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Inspector state
  const [selectedNode, setSelectedNode] = useState(null);
  const [inspectorDetails, setInspectorDetails] = useState(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);

  // Dynamic filter states to reduce visual clutter
  const [showDevs, setShowDevs] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showTechs, setShowTechs] = useState(true);

  useEffect(() => {
    fetchGraph();
  }, []);

  // Update selectedNode if a path was highlighted from the dashboard
  useEffect(() => {
    if (selectedPath && selectedPath.nodes && selectedPath.nodes.length > 0) {
      // Auto select the first node in the path
      handleNodeClick(selectedPath.nodes[0]);
    }
  }, [selectedPath]);

  const fetchGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFullGraph();
      setGraphData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (node) => {
    setSelectedNode(node);
    setInspectorLoading(true);
    setInspectorDetails(null);
    
    try {
      if (node.type === 'Developer') {
        const details = await api.getDeveloperById(node.id);
        setInspectorDetails(details);
      } else if (node.type === 'Project') {
        const projects = await api.getProjects();
        const details = projects.find(p => p.id === node.id);
        setInspectorDetails(details);
      } else if (node.type === 'Technology') {
        const technologies = await api.getTechnologies();
        const details = technologies.find(t => t.id === node.id);
        setInspectorDetails(details);
      }
    } catch (err) {
      console.error('Failed to load inspector details:', err);
    } finally {
      setInspectorLoading(false);
    }
  };

  // Filter nodes and relationships based on visibility toggles
  const getFilteredGraphData = () => {
    if (!graphData) return { nodes: [], links: [] };

    // 1. Filter nodes by active types
    const filteredNodes = graphData.nodes.filter(node => {
      if (node.type === 'Developer') return showDevs;
      if (node.type === 'Project') return showProjects;
      if (node.type === 'Technology') return showTechs;
      return true;
    });

    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));

    // 2. Filter edges (only keep links where both endpoints are visible)
    const filteredLinks = graphData.links.filter(link => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  };

  if (loading) return <LoadingState message="Rendering network graph..." />;
  if (error) return <ErrorState error={error} onRetry={fetchGraph} />;

  const filteredGraphData = getFilteredGraphData();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      <div className="main-header" style={{ marginBottom: '20px' }}>
        <div className="header-title">
          <h1>Network Explorer</h1>
          <p>Interactive force-directed graph database visualizer. Drag nodes to space them out or select nodes to trace connections.</p>
        </div>
      </div>

      <div className="explorer-container">
        {/* Graph Canvas Visualizer */}
        <GraphView 
          graphData={filteredGraphData} 
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
          highlightPath={selectedPath}
        />

        {/* Sidebar Inspector Panel */}
        <div className="inspector-panel">
          
          {/* Visual Filters Section */}
          <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Sliders size={16} style={{ color: 'var(--color-primary)' }} />
              <span>Visible Node Types</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={showDevs}
                  onChange={(e) => {
                    setShowDevs(e.target.checked);
                    if (!e.target.checked && selectedNode?.type === 'Developer') {
                      setSelectedNode(null);
                      setInspectorDetails(null);
                    }
                  }}
                  style={{ accentColor: 'var(--node-developer)', cursor: 'pointer' }}
                />
                <span style={{ color: showDevs ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Developers (Blue)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={showProjects}
                  onChange={(e) => {
                    setShowProjects(e.target.checked);
                    if (!e.target.checked && selectedNode?.type === 'Project') {
                      setSelectedNode(null);
                      setInspectorDetails(null);
                    }
                  }}
                  style={{ accentColor: 'var(--node-project)', cursor: 'pointer' }}
                />
                <span style={{ color: showProjects ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Projects (Amber)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={showTechs}
                  onChange={(e) => {
                    setShowTechs(e.target.checked);
                    if (!e.target.checked && selectedNode?.type === 'Technology') {
                      setSelectedNode(null);
                      setInspectorDetails(null);
                    }
                  }}
                  style={{ accentColor: 'var(--node-technology)', cursor: 'pointer' }}
                />
                <span style={{ color: showTechs ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Technologies (Emerald)</span>
              </label>
            </div>
          </div>

          <div className="inspector-title" style={{ fontSize: '1rem', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Selected Entity Details
          </div>

          {inspectorLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
            </div>
          ) : inspectorDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              
              {/* Entity Header */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: selectedNode.type === 'Developer' ? '50%' : '6px',
                  backgroundColor: selectedNode.type === 'Developer' 
                    ? 'var(--color-primary-muted)' 
                    : selectedNode.type === 'Technology' 
                      ? 'var(--color-success-muted)' 
                      : 'rgba(245, 158, 11, 0.1)',
                  color: selectedNode.type === 'Developer' 
                    ? 'var(--color-primary)' 
                    : selectedNode.type === 'Technology' 
                      ? 'var(--color-success)' 
                      : 'var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {selectedNode.type === 'Developer' && <User size={20} />}
                  {selectedNode.type === 'Technology' && <Code size={20} />}
                  {selectedNode.type === 'Project' && <FolderGit size={20} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedNode.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {selectedNode.type}
                  </span>
                </div>
              </div>

              {/* Developer Details Rendering */}
              {selectedNode.type === 'Developer' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Title:</strong>
                    <span>{inspectorDetails.title}</span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Location:</strong>
                    <span>{inspectorDetails.location}</span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Bio:</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{inspectorDetails.bio}</span>
                  </div>
                  
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Skills:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {inspectorDetails.skills.map(s => (
                        <span key={s.id} className="skill-badge">{s.name}</span>
                      ))}
                    </div>
                  </div>

                  <button 
                    className="btn-primary" 
                    onClick={() => onSelectDeveloper(inspectorDetails.id)}
                    style={{ marginTop: 'auto', padding: '10px 16px', height: '40px', justifyContent: 'center' }}
                  >
                    <span>View Full Profile</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              )}

              {/* Project Details Rendering */}
              {selectedNode.type === 'Project' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Status:</strong>
                    <span className="role-badge" style={{ display: 'inline-block', marginTop: '4px' }}>{inspectorDetails.status}</span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Description:</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{inspectorDetails.description}</span>
                  </div>
                  
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Technology Stack:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {inspectorDetails.techStack.map((techName, idx) => (
                        <span key={idx} className="skill-badge intermediate">{techName}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Team Members:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {inspectorDetails.team.map((devName, idx) => (
                        <span key={idx} className="skill-badge expert">{devName}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Technology Details Rendering */}
              {selectedNode.type === 'Technology' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Category:</strong>
                    <span>{inspectorDetails.category}</span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Description:</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{inspectorDetails.description}</span>
                  </div>
                  
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Possessed by:</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {inspectorDetails.developerCount} {inspectorDetails.developerCount === 1 ? 'developer' : 'developers'} in the network.
                    </span>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="inspector-empty">
              <Info size={32} />
              <p>Click on any node in the graph (Developer, Project, or Technology) to inspect its details and relationships.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
