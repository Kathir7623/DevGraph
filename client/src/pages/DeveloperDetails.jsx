import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, MapPin, Mail, Sparkles, UserPlus, BookOpen } from 'lucide-react';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function DeveloperDetails({ developerId, onBack, onSelectDeveloper }) {
  const [developer, setDeveloper] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (developerId) {
      fetchDetails();
    }
  }, [developerId]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [devDetails, recs] = await Promise.all([
        api.getDeveloperById(developerId),
        api.getRecommendations(developerId)
      ]);
      setDeveloper(devDetails);
      setRecommendations(recs);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Fetching developer profile..." />;
  if (error) return <ErrorState error={error} onRetry={fetchDetails} />;
  if (!developer) return <ErrorState error={new Error('Developer not found')} onRetry={onBack} />;

  const getExperiencePercentage = (years) => {
    return Math.min(100, (years / 10) * 100);
  };

  const getMeterColor = (level) => {
    if (level === 'Expert') return 'var(--color-success)';
    if (level === 'Intermediate') return 'var(--color-primary)';
    return 'var(--color-warning)';
  };

  const getGlowColor = (level) => {
    if (level === 'Expert') return 'rgba(16, 185, 129, 0.08)';
    if (level === 'Intermediate') return 'rgba(59, 130, 246, 0.08)';
    return 'rgba(245, 158, 11, 0.08)';
  };
  
  const getBorderColor = (level) => {
    if (level === 'Expert') return 'rgba(16, 185, 129, 0.35)';
    if (level === 'Intermediate') return 'rgba(59, 130, 246, 0.35)';
    return 'rgba(245, 158, 11, 0.35)';
  };

  return (
    <div>
      {/* Back Header */}
      <div style={{ marginBottom: '28px' }}>
        <button 
          onClick={onBack} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Developers</span>
        </button>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          
          {/* Featured Profile Header & Brief Description Box */}
          <div className="detail-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
              {developer.avatarUrl ? (
                <img src={developer.avatarUrl} alt={developer.name} className="profile-avatar" />
              ) : (
                <div className="profile-avatar-placeholder">
                  {developer.name.charAt(0)}
                </div>
              )}
              <div className="profile-info">
                <h1>{developer.name}</h1>
                <div className="title">{developer.title}</div>
                
                <div className="location">
                  <MapPin size={14} />
                  <span>{developer.location}</span>
                  <span style={{ margin: '0 8px', color: 'rgba(255, 255, 255, 0.08)' }}>|</span>
                  <Mail size={14} />
                  <span>{developer.email}</span>
                </div>
              </div>
            </div>

            {/* BRIEF DESCRIPTION HIGHLIGHT */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '4px',
                background: 'var(--color-primary)'
              }}></div>
              <strong style={{ 
                display: 'block', 
                fontSize: '0.78rem', 
                textTransform: 'uppercase', 
                color: 'var(--color-primary)', 
                letterSpacing: '0.08em',
                marginBottom: '8px'
              }}>
                Brief Description / Summary
              </strong>
              <p style={{ 
                color: 'var(--text-primary)', 
                lineHeight: '1.7', 
                fontSize: '0.98rem',
                fontStyle: 'italic'
              }}>
                "{developer.bio}"
              </p>
            </div>
          </div>

          {/* HIGHLIGHTED TECHNICAL SKILLS GRID */}
          <div className="detail-section">
            <h2>Technical Skills Highlight</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '24px' }}>
              Core competencies mapped with experience level and aggregate tenure.
            </p>

            {developer.skills && developer.skills.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                {developer.skills.map((skill, index) => (
                  <div key={index} style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid',
                    borderColor: getBorderColor(skill.level),
                    boxShadow: `0 4px 20px ${getGlowColor(skill.level)}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                  className="skill-card-highlight"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{skill.name}</span>
                      <span className={`skill-badge ${skill.level.toLowerCase()}`}>{skill.level}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span>Category: <strong style={{ color: 'var(--text-primary)' }}>{skill.category}</strong></span>
                      <span>{skill.years} {skill.years === 1 ? 'yr' : 'yrs'}</span>
                    </div>
                    
                    {/* Tenured Experience Bar */}
                    <div style={{ 
                      height: '5px', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      marginTop: '4px'
                    }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${getExperiencePercentage(skill.years)}%`, 
                        background: getMeterColor(skill.level),
                        borderRadius: '9999px'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No technical skills documented.</p>
            )}
          </div>

          {/* Project History */}
          <div className="detail-section">
            <h2>Project Contribution History</h2>
            {developer.projects && developer.projects.length > 0 ? (
              <div className="projects-list">
                {developer.projects.map((proj, index) => (
                  <div className="project-item" key={index}>
                    <div className="project-item-header">
                      <h3>{proj.name}</h3>
                      <span className="role-badge">{proj.role}</span>
                    </div>
                    <p style={{ marginBottom: '12px' }}>{proj.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span>Status: <strong style={{ color: proj.status === 'Active' ? 'var(--color-success)' : 'var(--text-secondary)' }}>{proj.status}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No project contributions listed.</p>
            )}
          </div>
        </div>

        {/* Recommendations Sidebar */}
        <div className="recommendations-panel">
          <div className="rec-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: 'var(--color-success)' }} />
              <span>Recommended Skills</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '16px', lineHeight: '1.4' }}>
              Technologies used by projects you work on, which you haven't added to your skills list yet.
            </p>

            {recommendations?.recommendedSkills && recommendations.recommendedSkills.length > 0 ? (
              <div className="rec-list">
                {recommendations.recommendedSkills.map((tech, i) => (
                  <div className="rec-item" key={i}>
                    <div className="rec-item-info">
                      <h4>{tech.name}</h4>
                      <p>{tech.category}</p>
                    </div>
                    <div className="rec-stat-bubble green">
                      {tech.exposureCount} {tech.exposureCount === 1 ? 'project' : 'projects'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                All project technologies are already in your skills profile.
              </p>
            )}
          </div>

          <div className="rec-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Teammate Recommendations</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '16px', lineHeight: '1.4' }}>
              Collaborators of your collaborators (2 hops away) whom you haven't directly worked with yet.
            </p>

            {recommendations?.recommendedCollaborators && recommendations.recommendedCollaborators.length > 0 ? (
              <div className="rec-list">
                {recommendations.recommendedCollaborators.map((recDev, i) => (
                  <div 
                    className="rec-item" 
                    key={i} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectDeveloper(recDev.id)}
                    title={`Click to view ${recDev.name}'s profile`}
                  >
                    {recDev.avatarUrl ? (
                      <img src={recDev.avatarUrl} alt={recDev.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--color-primary-muted)', 
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.8rem'
                      }}>
                        {recDev.name.charAt(0)}
                      </div>
                    )}
                    <div className="rec-item-info">
                      <h4>{recDev.name}</h4>
                      <p>{recDev.title}</p>
                    </div>
                    <div className="rec-stat-bubble" title={`${recDev.mutualCount} mutual colleagues`}>
                      {recDev.mutualCount} mutual
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                No mutual collaborators found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
