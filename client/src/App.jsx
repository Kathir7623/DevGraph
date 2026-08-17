import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Developers from './pages/Developers';
import DeveloperDetails from './pages/DeveloperDetails';
import Explore from './pages/Explore';
import { api } from './services/api';
import ErrorState from './components/ErrorState';
import LoadingState from './components/LoadingState';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedDeveloperId, setSelectedDeveloperId] = useState(null);
  
  // Highlighting path from path finder to explore tab
  const [highlightedPath, setHighlightedPath] = useState(null);

  // Global DB status
  const [dbConnected, setDbConnected] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [checkingDb, setCheckingDb] = useState(true);

  useEffect(() => {
    verifyDatabaseHealth();
  }, []);

  const verifyDatabaseHealth = async () => {
    setCheckingDb(true);
    setDbError(null);
    try {
      const health = await api.checkHealth();
      if (health && health.status === 'healthy') {
        setDbConnected(true);
      } else {
        setDbConnected(false);
        setDbError(new Error('CognoDB reported unhealthy state. Check driver initialization logs.'));
      }
    } catch (err) {
      setDbConnected(false);
      setDbError(err);
    } finally {
      setCheckingDb(false);
    }
  };

  const handleSelectDeveloper = (id) => {
    setSelectedDeveloperId(id);
    setActivePage('developer-details');
  };

  const handleHighlightPath = (path) => {
    setHighlightedPath(path);
    setActivePage('explore');
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigateToExplore={handleHighlightPath} />;
      case 'developers':
        return <Developers onSelectDeveloper={handleSelectDeveloper} />;
      case 'developer-details':
        return (
          <DeveloperDetails 
            developerId={selectedDeveloperId} 
            onBack={() => setActivePage('developers')}
            onSelectDeveloper={handleSelectDeveloper}
          />
        );
      case 'explore':
        return (
          <Explore 
            selectedPath={highlightedPath}
            onSelectDeveloper={handleSelectDeveloper}
          />
        );
      default:
        return <Dashboard onNavigateToExplore={handleHighlightPath} />;
    }
  };

  if (checkingDb) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: '#ffffff' }}>
        <LoadingState message="Establishing secure connection to CognoDB Cloud instance..." />
      </div>
    );
  }

  // If DB is offline, block UI with a detailed troubleshooting guide page
  if (!dbConnected) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: '#ffffff', padding: '40px' }}>
        <ErrorState error={dbError} onRetry={verifyDatabaseHealth} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navbar */}
      <Navbar 
        activePage={activePage} 
        setActivePage={(page) => {
          setActivePage(page);
          if (page !== 'explore') {
            setHighlightedPath(null); // Clear path when leaving explorer
          }
        }} 
        dbConnected={dbConnected} 
      />
      
      {/* Main Panel */}
      <main className="main-content">
        {renderActivePage()}
      </main>
    </div>
  );
}
