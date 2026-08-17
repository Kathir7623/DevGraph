import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, MapPin, Mail } from 'lucide-react';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

export default function Developers({ onSelectDeveloper }) {
  const [developers, setDevelopers] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounced search / filtering logic
  useEffect(() => {
    fetchData();
  }, [search, selectedSkill]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devsData, techsData] = await Promise.all([
        api.getDevelopers(search, selectedSkill),
        api.getTechnologies()
      ]);
      setDevelopers(devsData);
      setTechnologies(techsData);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="main-header">
        <div className="header-title">
          <h1>Developers Network</h1>
          <p>Browse team profiles, skills, and project collaborators</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="dev-list-header">
        <div className="filters-wrapper">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, role, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select
            className="select-filter"
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
          >
            <option value="">Filter by Skill (All)</option>
            {technologies.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Developers Cards Render */}
      {loading && developers.length === 0 ? (
        <LoadingState message="Searching developer database..." />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchData} />
      ) : developers.length === 0 ? (
        <EmptyState 
          title="No developers match your query" 
          message="Try removing filters or using a different search keyword." 
        />
      ) : (
        <div className="dev-grid">
          {developers.map(dev => (
            <div 
              key={dev.id} 
              className="dev-card"
              onClick={() => onSelectDeveloper(dev.id)}
            >
              <div className="dev-card-header">
                {dev.avatarUrl ? (
                  <img src={dev.avatarUrl} alt={dev.name} className="dev-avatar" />
                ) : (
                  <div className="dev-avatar-placeholder">
                    {dev.name.charAt(0)}
                  </div>
                )}
                <div className="dev-meta">
                  <h3>{dev.name}</h3>
                  <p>{dev.title}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={12} />
                  <span>{dev.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={12} />
                  <span>{dev.email}</span>
                </div>
              </div>

              <p className="dev-bio">{dev.bio}</p>
              
              <div className="dev-skills-summary">
                {dev.skills && dev.skills.slice(0, 4).map(skill => (
                  <span 
                    key={skill.id} 
                    className={`skill-badge ${skill.level.toLowerCase()}`}
                  >
                    {skill.name} • {skill.level}
                  </span>
                ))}
                {dev.skills && dev.skills.length > 4 && (
                  <span className="skill-badge">+{dev.skills.length - 4} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
