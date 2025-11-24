import React, { useState } from 'react';
import { LayoutDashboard, List, Settings, ThumbsUp, FileText, Moon, Sun, Menu, X, Database } from 'lucide-react';
import { ViewState } from '../types';
import { useApp } from '../context/AppContext';

interface LayoutProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setCurrentView, children }) => {
  const { isGenerating, syncTopics, theme, toggleTheme } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
        await syncTopics();
        alert('Database synced successfully!');
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
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Top Header Navigation */}
      <header className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-50 flex-shrink-0 transition-all duration-200 sticky top-0 ${isGenerating ? 'pointer-events-none opacity-80' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            {/* Logo Section */}
            <div className="flex items-center flex-shrink-0 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
               <div className="relative group flex items-center justify-center">
                  <img 
                      src="https://anchorcomputersoftware.com/sites/default/files/logo_0.png" 
                      alt="Anchor Logo" 
                      className="w-12 h-12 object-contain mr-3"
                      onError={(e) => {
                          // Fallback to favicon if main logo fails
                          (e.target as HTMLImageElement).src = "https://anchorcomputersoftware.com/sites/default/files/favicon_0.ico";
                      }}
                  />
               </div>
               <div className="flex flex-col justify-center h-full">
                  <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Anchor Computer Software</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">Content Generator</span>
               </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 ml-6 overflow-x-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id as ViewState)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      {item.label}
                    </button>
                  );
                })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3 ml-4">
                 <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        isSyncing 
                        ? 'text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-indigo-400'
                    }`}
                    title="Sync Database"
                  >
                     <Database className={`w-5 h-5 ${isSyncing ? 'animate-pulse' : ''}`} />
                     <span className="hidden lg:inline ml-2">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                  </button>

                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                  <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                    title="Toggle Theme"
                  >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </button>

                  {/* Mobile Menu Button */}
                  <div className="md:hidden flex items-center ml-1">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                  </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 animate-fadeIn absolute w-full shadow-lg z-50">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setCurrentView(item.id as ViewState);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center w-full px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                                isActive
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
                            {item.label}
                        </button>
                        );
                    })}
                </div>
            </div>
        )}
      </header>

      {/* Loading Overlay */}
      {isGenerating && (
            <div className="absolute top-[80px] left-0 w-full h-1 bg-indigo-100 dark:bg-indigo-900 overflow-hidden z-40">
                <div className="h-full bg-indigo-500 dark:bg-indigo-400 animate-pulse w-full origin-left-right"></div>
            </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 scroll-smooth">
          <div className="max-w-7xl mx-auto p-4 md:p-8 h-full">
            {children}
          </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-8 flex-shrink-0">
         <p className="text-center text-xs text-gray-400 dark:text-gray-500">
             &copy; 2024 Anchor Computer Software. All rights reserved.
         </p>
      </footer>
    </div>
  );
};

export default Layout;