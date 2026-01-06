import React from 'react';
import { Topic } from '../../types';
import { FileText, Type, Globe, Key, ShieldCheck, Activity, Sparkles, List, CheckCircle } from 'lucide-react';

interface ArticleViewerProps {
  topic: Topic;
  activeTab: 'preview' | 'metadata_strategy' | 'analysis';
  onTabChange: (tab: 'preview' | 'metadata_strategy' | 'analysis') => void;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ topic, activeTab, onTabChange }) => {
  const hasContent = (typeof topic.generatedContent?.content_html === 'string' && topic.generatedContent.content_html.length > 0) || 
                     (typeof topic.htmlContent === 'string' && topic.htmlContent.length > 0);

  // Check if the featured image is already embedded in the HTML content
  const isImageDuplicate = React.useMemo(() => {
      const imgUrl = topic.generatedContent?.featured_image;
      const html = topic.generatedContent?.content_html || topic.htmlContent || '';
      
      if (!imgUrl || !html) return false;
      return html.includes(imgUrl);
  }, [topic]);

  const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => (
    <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
            <span>{label.replace(/_/g, ' ')}</span>
            <span className={score >= 8 ? 'text-green-600' : (score >= 6 ? 'text-yellow-600' : 'text-red-600')}>{score}/10</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
                className={`h-full rounded-full transition-all duration-1000 ${score >= 8 ? 'bg-green-500' : (score >= 6 ? 'bg-yellow-500' : 'bg-red-500')}`}
                style={{ width: `${Math.min(100, Math.max(0, score * 10))}%` }}
            />
        </div>
    </div>
  );

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
                SEO & Metadata
            </button>
            <button 
                onClick={() => onTabChange('analysis')} 
                className={`py-3 text-sm font-bold border-b-2 transition-all uppercase tracking-widest ${activeTab === 'analysis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
            >
                AI Quality Analysis
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto space-y-6">
                {activeTab === 'preview' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 min-h-[500px]">
                        {/* Only show header image if it's NOT duplicated in the content */}
                        {topic.generatedContent?.featured_image && !isImageDuplicate && (
                            <div className="mb-10 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-950 flex justify-center">
                                <img 
                                    src={topic.generatedContent.featured_image} 
                                    alt="Featured" 
                                    className="max-w-full h-auto object-contain max-h-[600px]"
                                />
                            </div>
                        )}

                        <div className="prose prose-lg prose-indigo dark:prose-invert max-w-none">
                            {hasContent ? (
                                <div dangerouslySetInnerHTML={{ __html: topic.generatedContent?.content_html || topic.htmlContent || '' }} />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-xs">No article content preview available</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'metadata_strategy' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-10 animate-fadeIn">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
                            Search Engine Optimization
                        </h3>
                        <div className="grid grid-cols-1 gap-10">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                                    <Type className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">SEO Title Tag</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 font-bold text-lg">{topic.generatedContent?.seo_title || topic.title}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Meta Description</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{topic.generatedContent?.meta_description || 'No description provided.'}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                                        <Globe className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Permlink / Slug</span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 font-mono text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-100 dark:border-gray-800">/{topic.generatedContent?.slug || 'untitled-slug'}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                                        <Key className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Primary Keyword</span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 font-bold">{topic.keyword || 'Not specified'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'analysis' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-10 animate-fadeIn space-y-10">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-6">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">AI Content Validation</h3>
                            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-800">
                                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                <span className="text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Verified by Agent</span>
                            </div>
                        </div>

                        {topic.validatorData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                        <Activity className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Quality Scores</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        {Object.entries(topic.validatorData.result.scores || {}).map(([key, score]) => (
                                            <ScoreBar key={key} label={key} score={score as number} />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-2 text-indigo-600 mb-4">
                                            <Sparkles className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">AI Summary</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                                            "{topic.validatorData.result.summary}"
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600">
                                            <List className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Recommendations</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {topic.validatorData.result.recommendations?.map((rec, idx) => (
                                                <li key={idx} className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <Activity className="w-12 h-12 mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-xs">No validation data available for this content</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};