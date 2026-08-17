import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, Code, FolderGit, Network, GitFork, ArrowRight, Compass, BarChart3 } from 'lucide-react';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function Dashboard({ onNavigateToExplore }) {
  const [stats, setStats] = useState(null);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Path finder state
  const [fromDev, setFromDev] = useState('');
  const [toDev, setToDev] = useState('');
  const [pathResult, setPathResult] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, devsData] = await Promise.all([
        api.getStats(),
        api.getDevelopers()
      ]);
      setStats(statsData);
      setDevelopers(devsData);
      
      if (devsData.length >= 2) {
        setFromDev(devsData[0].id);
        setToDev(devsData[1].id);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFindPath = async (e) => {
    e.preventDefault();
    if (!fromDev || !toDev) return;
    
    if (fromDev === toDev) {
      setPathError('Please select two different developers to find a pathway.');
      setPathResult(null);
      return;
    }

    setPathLoading(true);
    setPathError(null);
    setPathResult(null);
    
    try {
      const result = await api.getShortestPath(fromDev, toDev);
      setPathResult(result);
      if (result.nodes.length === 0) {
        setPathError('No connection path was found between these developers.');
      }
    } catch (err) {
      setPathError(err.message || 'Failed to calculate path.');
    } finally {
      setPathLoading(false);
    }
  };

  // Dynamically calculate developer skills distribution categories in real-time
  const getSkillsDistribution = () => {
    const counts = {
      Frontend: 0,
      Backend: 0,
      Database: 0,
      DevOps: 0
    };
    
    developers.forEach(dev => {
      if (dev.skills) {
        dev.skills.forEach(skill => {
          if (counts[skill.category] !== undefined) {
            counts[skill.category]++;
          }
        });
      }
    });
    
    return counts;
  };

  if (loading) return <LoadingState message="Fetching network metrics..." />;
  if (error) return <ErrorState error={error} onRetry={fetchDashboardData} />;

  const skillDistribution = getSkillsDistribution();
  const maxSkillCount = Math.max(...Object.values(skillDistribution)) || 1;

  const statCards = [
    { label: 'Developers', value: stats?.developers || 0, icon: Users, color: 'var(--node-developer)' },
    { label: 'Technologies', value: stats?.technologies || 0, icon: Code, color: 'var(--node-technology)' },
    { label: 'Projects Managed', value: stats?.projects || 0, icon: FolderGit, color: 'var(--node-project)' },
    { label: 'Connected Relationships', value: stats?.relationships || 0, icon: Network, color: '#ec4899' }
  ];

  const categoryColors = {
    Frontend: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
    Backend: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
    Database: 'linear-gradient(90deg, #10b981, #34d399)',
    DevOps: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  };

  return (
    <div>
      <div className="main-header">
        <div className="header-title">
          <h1>DevGraph Dashboard</h1>
          <p>Analytics and path-finding across your developer network</p>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="stats-grid">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div className="stat-card" key={i}>
              <div className="stat-icon" style={{ color: card.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{card.value}</div>
                <div className="stat-label">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Path Finder Section */}
      <div className="path-finder-card">
        <h2>Find Developer Collaboration Pathway</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
          This exercises a <strong>multi-hop Cypher traversal</strong> on CognoDB. It calculates the shortest path 
          connecting two developers through shared project contributions.
        </p>

        <form onSubmit={handleFindPath} className="path-form">
          <div className="form-group">
            <label htmlFor="from-dev">Developer A</label>
            <select 
              id="from-dev" 
              className="select-filter"
              value={fromDev}
              onChange={(e) => setFromDev(e.target.value)}
            >
              {developers.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.title})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="to-dev">Developer B</label>
            <select 
              id="to-dev" 
              className="select-filter"
              value={toDev}
              onChange={(e) => setToDev(e.target.value)}
            >
              {developers.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.title})</option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={pathLoading || !fromDev || !toDev}
          >
            <GitFork size={18} />
            <span>{pathLoading ? 'Traversing...' : 'Trace Path'}</span>
          </button>
        </form>

        {/* Path Results */}
        {pathError && (
          <div style={{ color: 'var(--color-danger)', fontSize: '0.9rem', marginTop: '16px', fontWeight: 500 }}>
            {pathError}
          </div>
        )}

        {pathResult && pathResult.nodes && pathResult.nodes.length > 0 && (
          <div className="path-results">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Connection Chain ({pathResult.nodes.filter(n => n.type === 'Developer').length - 1} degrees of separation):</h3>
              <button 
                onClick={() => onNavigateToExplore(pathResult)} 
                style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--color-primary)', 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Compass size={14} />
                <span>Highlight in Explorer</span>
              </button>
            </div>
            
            <div className="path-flow">
              {pathResult.nodes.map((node, i) => {
                const isLast = i === pathResult.nodes.length - 1;
                return (
                  <React.Fragment key={node.id}>
                    <div className={`path-node ${node.type.toLowerCase()}`}>
                      <strong>{node.name}</strong>
                      <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({node.type})</span>
                    </div>
                    {!isLast && (
                      <div className="path-arrow">
                        <ArrowRight size={16} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Skills Distribution Visualizer Chart */}
      <div className="chart-container">
        <div className="chart-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Category Skills Distribution</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
              Aggregated statistics showing total skill records mapped per tech category
            </p>
          </div>
        </div>
        
        <div className="chart-bars-list">
          {Object.entries(skillDistribution).map(([category, count]) => {
            const pct = (count / maxSkillCount) * 100;
            return (
              <div className="chart-bar-item" key={category}>
                <div className="chart-bar-label">{category}</div>
                <div className="chart-bar-rail">
                  <div 
                    className="chart-bar-fill" 
                    style={{ 
                      width: `${pct}%`, 
                      background: categoryColors[category] || 'var(--color-primary)' 
                    }}
                  ></div>
                </div>
                <div className="chart-bar-value">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
