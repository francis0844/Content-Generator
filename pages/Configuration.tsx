import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';

const Configuration: React.FC = () => {
  const { preferredAngles, unpreferredAngles, addAngle, removeAngle } = useApp();
  const [newPreferred, setNewPreferred] = useState('');
  const [newUnpreferred, setNewUnpreferred] = useState('');

  const handleAdd = (type: 'preferred' | 'unpreferred') => {
    const val = type === 'preferred' ? newPreferred : newUnpreferred;
    if (!val.trim()) return;
    
    addAngle(type, val.trim());
    
    if (type === 'preferred') setNewPreferred('');
    else setNewUnpreferred('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Strategy Configuration</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Define the angles the AI should prioritize and avoid. This replaces the "Do-Not-Topics" Google Sheet.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Preferred Column */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-green-100 dark:border-green-900/30 overflow-hidden">
            <div className="bg-green-50 dark:bg-green-900/20 px-6 py-4 border-b border-green-100 dark:border-green-900/30 flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-800 dark:text-green-300">Preferred Angles</h3>
            </div>
            
            <div className="p-6">
                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newPreferred}
                        onChange={(e) => setNewPreferred(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd('preferred')}
                        placeholder="Add a preferred angle..."
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <button 
                        onClick={() => handleAdd('preferred')}
                        className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-500 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <ul className="space-y-2">
                    {preferredAngles.map((angle, idx) => (
                        <li key={idx} className="flex items-center justify-between group bg-gray-50 dark:bg-gray-750 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{angle}</span>
                            <button 
                                onClick={() => removeAngle('preferred', angle)}
                                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                    {preferredAngles.length === 0 && (
                        <li className="text-gray-400 dark:text-gray-500 text-sm text-center py-4 italic">No preferred angles set.</li>
                    )}
                </ul>
            </div>
        </div>

        {/* Unpreferred Column */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-100 dark:border-red-900/30 flex items-center gap-2">
                <ThumbsDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-red-800 dark:text-red-300">Unpreferred / Avoid</h3>
            </div>
            
            <div className="p-6">
                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newUnpreferred}
                        onChange={(e) => setNewUnpreferred(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd('unpreferred')}
                        placeholder="Add an angle to avoid..."
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <button 
                        onClick={() => handleAdd('unpreferred')}
                        className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-500 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <ul className="space-y-2">
                    {unpreferredAngles.map((angle, idx) => (
                        <li key={idx} className="flex items-center justify-between group bg-gray-50 dark:bg-gray-750 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{angle}</span>
                            <button 
                                onClick={() => removeAngle('unpreferred', angle)}
                                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                     {unpreferredAngles.length === 0 && (
                        <li className="text-gray-400 dark:text-gray-500 text-sm text-center py-4 italic">No disallowed angles set.</li>
                    )}
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Configuration;