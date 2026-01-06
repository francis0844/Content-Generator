import React from 'react';
import { Topic } from '../../types';
import { Share2, User, Target, Volume2, ImageIcon, FileText } from 'lucide-react';

interface SocialViewerProps {
  topic: Topic;
  activeTab: 'preview' | 'metadata_strategy' | 'analysis';
  onTabChange: (tab: 'preview' | 'metadata_strategy' | 'analysis') => void;
}

export const SocialViewer: React.FC<SocialViewerProps> = ({ topic, activeTab, onTabChange }) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-850 flex gap-6">
            <button 
                onClick={() => onTabChange('preview')} 
                className={`py-3 text-sm font-bold border-b-2 transition-all uppercase tracking-widest ${activeTab === 'preview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
            >
                Preview
            </button>
            <button 
                onClick={() => onTabChange('metadata_strategy')} 
                className={`py-3 text-sm font-bold border-b-2 transition-all uppercase tracking-widest ${activeTab === 'metadata_strategy' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
            >
                Strategy & Details
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto space-y-6">
                {activeTab === 'preview' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 min-h-[500px]">
                        {topic.generatedContent?.featured_image && (
                            <div className="mb-10 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-950 flex justify-center w-full">
                                <img 
                                    src={topic.generatedContent.featured_image} 
                                    alt="Social Media Asset" 
                                    className="w-full h-auto block"
                                />
                            </div>
                        )}

                        <div className="prose prose-lg prose-indigo dark:prose-invert max-w-none">
                            {topic.generatedContent?.socialPost ? (
                                <div className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 leading-relaxed text-lg">
                                    {topic.generatedContent.socialPost}
                                    {topic.generatedContent?.hashtags && (
                                        <div className="mt-8 text-indigo-600 dark:text-indigo-400 font-bold tracking-tight text-base">
                                            {topic.generatedContent.hashtags}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Share2 className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-xs">No social post content available</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'metadata_strategy' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-10 animate-fadeIn">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
                            Strategy & Details
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                                    <User className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Target Audience</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 font-medium">{topic.targetAudience || 'General Audience'}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                                    <Target className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Primary Goal</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 font-medium">{topic.contentGoal || 'Engagement'}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                                    <Volume2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Voice Palette</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 font-medium">{topic.toneVoice || 'Professional'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
