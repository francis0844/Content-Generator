import React, { useState } from 'react';
import { LayoutDashboard, List, Settings, ThumbsUp, BrainCircuit, FileText, RefreshCw, Moon, Sun } from 'lucide-react';
import { ViewState } from '../types';
import { useApp } from '../context/AppContext';

interface LayoutProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setCurrentView, children }) => {
  const { isGenerating, syncTopics, syncWebhookUrl, theme, toggleTheme } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!syncWebhookUrl) {
        alert('Please configure the Sync Webhook URL in Settings first.');
        setCurrentView('settings');
        return;
    }
    setIsSyncing(true);
    try {
        await syncTopics();
        alert('Data synced successfully!');
    } catch (e: any) {
        alert('Sync failed: ' + e.message);
    } finally {
        setIsSyncing(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Generator', icon: LayoutDashboard },
    { id: 'results', label: 'Topic Results', icon: List },
    { id: 'generated_content', label: 'Generated Articles', icon: FileText },
    { id: 'configuration', label: 'Angles & Config', icon: ThumbsUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar */}
      <aside className={`w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 hidden md:flex flex-col transition-all duration-200 ${isGenerating ? 'pointer-events-none opacity-60' : ''}`}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">TopicGen V2</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewState)}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {item.label}
              </button>
            );
          })}
          
          {/* Sync Button */}
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
              >
                 <RefreshCw className={`w-5 h-5 mr-3 ${isSyncing ? 'animate-spin' : ''}`} />
                 {isSyncing ? 'Syncing...' : 'Sync Data'}
              </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">
                &copy; 2024 Anchor Software
            </p>
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Toggle Theme"
            >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 md:hidden p-4 flex items-center justify-between ${isGenerating ? 'pointer-events-none opacity-60' : ''}`}>
          <div className="flex items-center gap-2">
             <BrainCircuit className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
             <span className="font-bold text-gray-800 dark:text-white">TopicGen V2</span>
          </div>
          <div className="flex gap-2">
             <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-400">
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button onClick={handleSync} className="p-2 text-indigo-600 dark:text-indigo-400">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewState)}
                className={`p-2 rounded-md ${currentView === item.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <item.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>
        
        {/* Global Loading Overlay (Optional visual cue) */}
        {isGenerating && (
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100 dark:bg-indigo-900 overflow-hidden z-50">
                <div className="h-full bg-indigo-500 dark:bg-indigo-400 animate-pulse w-full origin-left-right"></div>
            </div>
        )}
      </main>
    </div>
  );
};

export default Layout;