
import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';
import GeneratedContent from './pages/GeneratedContent';
import Configuration from './pages/Configuration';
import Settings from './pages/Settings';
import { ViewState } from './types';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={(view) => setCurrentView(view as ViewState)} />;
      case 'results':
        return <Results />;
      case 'generated_content':
        // Articles Menu -> Generated Articles
        return <GeneratedContent forcedType="Article" />;
      case 'social_generated':
        // Social Media Menu -> Social Generated
        return <GeneratedContent forcedType="Socials Media" />;
      case 'backlink_generated':
        // Backlinks Menu -> Backlink Generated
        return <GeneratedContent forcedType="Backlinks Content" />;
      case 'configuration':
        return <Configuration />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onViewChange={(view) => setCurrentView(view as ViewState)} />;
    }
  };

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {renderView()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
