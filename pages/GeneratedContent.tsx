
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TopicStatus, Topic } from '../types';
import { Search, ExternalLink, Trash2, FileText, ChevronLeft, Clock, Info, CheckCircle, BarChart2, Layers, AlertCircle, XCircle, Check } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { sendArticleReview, sendArticleDraft } from '../services/makeService';

const GeneratedContent: React.FC = () => {
  const { topics, deleteTopic, articleReviewWebhookUrl, draftingWebhookUrl, updateTopicStatus, availableProducts, theme } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [viewingTopic, setViewingTopic] = useState<Topic | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'details' | 'validation'>('preview');
  const [activeTab, setActiveTab] = useState<'review' | 'drafts' | 'rejected'>('review');
  
  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    topicId: string | null;
    topicTitle: string;
  }>({
    isOpen: false,
    topicId: null,
    topicTitle: '',
  });

  // Review Modal State (for Reason)
  const [reviewModalState, setReviewModalState] = useState<{
    isOpen: boolean;
    action: 'DRAFT' | 'REJECTED' | null;
    reason: string;
  }>({
    isOpen: false,
    action: null,
    reason: '',
  });

  const [reviewStatus, setReviewStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const isValidUrl = (url?: string) => {
      if (!url) return false;
      return url.startsWith('http') || url.startsWith('data:') || url.startsWith('/');
  };

  // Debug Log
  useEffect(() => {
    if (viewingTopic) {
        console.log("Viewing Topic Data:", viewingTopic);
        console.log("Sections:", viewingTopic.generatedContent?.sections);
        console.log("SEO:", viewingTopic.generatedContent?.seo_title);
        console.log("Image:", viewingTopic.generatedContent?.featured_image || viewingTopic.img_url);
    }
  }, [viewingTopic]);

  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      let matchesStatus = false;
      if (activeTab === 'review') matchesStatus = t.status === TopicStatus.CONTENT_GENERATED;
      if (activeTab === 'drafts') matchesStatus = t.status === TopicStatus.ARTICLE_DRAFT;
      if (activeTab === 'rejected') matchesStatus = t.status === TopicStatus.ARTICLE_REJECTED;

      const title = t.title || '';
      const keyword = t.keyword || '';
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            keyword.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProduct = filterProduct === 'all' ? true : t.product === filterProduct;

      return matchesStatus && matchesSearch && matchesProduct;
    });
  }, [topics, searchTerm, activeTab, filterProduct]);

  const counts = useMemo(() => {
    return {
      review: topics.filter(t => t.status === TopicStatus.CONTENT_GENERATED).length,
      drafts: topics.filter(t => t.status === TopicStatus.ARTICLE_DRAFT).length,
      rejected: topics.filter(t => t.status === TopicStatus.ARTICLE_REJECTED).length,
    };
  }, [topics]);

  const initiateDelete = (id: string, title: string) => {
    setDeleteModalState({
      isOpen: true,
      topicId: id,
      topicTitle: title,
    });
  };

  const confirmDelete = () => {
    if (deleteModalState.topicId) {
      deleteTopic(deleteModalState.topicId);
      if (viewingTopic && viewingTopic.id === deleteModalState.topicId) {
          setViewingTopic(null);
      }
    }
    setDeleteModalState(prev => ({ ...prev, isOpen: false }));
  };

  const openViewer = (topic: Topic) => {
      setViewingTopic(topic);
      setActiveViewTab('preview');
      setReviewStatus('idle');
  };

  const initiateReview = (action: 'DRAFT' | 'REJECTED') => {
     setReviewModalState({
         isOpen: true,
         action: action,
         reason: '',
     });
  };

  const confirmReview = async () => {
      if (!viewingTopic || !articleReviewWebhookUrl || !reviewModalState.action) {
          if (!articleReviewWebhookUrl) alert("Please configure the Article Review Webhook in Settings.");
          setReviewModalState(prev => ({ ...prev, isOpen: false }));
          return;
      }

      setReviewStatus('sending');
      const action = reviewModalState.action;
      const reason = reviewModalState.reason;
      
      const content = viewingTopic.generatedContent || ({} as any);
      
      const payload = {
          title: content.title || viewingTopic.title,
          html_content: content.content_html || viewingTopic.htmlContent || '',
          reason: reason,
          page_id: viewingTopic.pageId || '', 
          status: action,
          image_url: content.featured_image || '',
          focus_keyword: content.focus_keyword || viewingTopic.keyword,
          seo_data: {
              seo_title: content.seo_title || '',
              meta_description: content.meta_description || '',
              slug: content.slug || ''
          }
      };

      try {
          const promises = [sendArticleReview(articleReviewWebhookUrl, payload)];
          if (action === 'DRAFT' && draftingWebhookUrl) {
              promises.push(sendArticleDraft(draftingWebhookUrl, payload));
          }

          await Promise.all(promises);

          setReviewStatus('sent');
          
          const newTopicStatus = action === 'DRAFT' ? TopicStatus.ARTICLE_DRAFT : TopicStatus.ARTICLE_REJECTED;
          updateTopicStatus(viewingTopic.id, newTopicStatus);
          
          setViewingTopic(null);
          setReviewStatus('idle');
          
      } catch (e: any) {
          console.error(e);
          setReviewStatus('error');
          let msg = e.message;
          if (msg.includes('410') || msg.includes('404')) {
              msg = `Webhook Connection Failed (${msg}).\n\nPossible Causes:\n1. The Make.com scenario is inactive.\n2. The Webhook URL in Settings is incorrect.`;
          }
          alert(msg);
      } finally {
          setReviewModalState(prev => ({ ...prev, isOpen: false }));
      }
  };

  const getScores = (validatorData: any) => {
      if (!validatorData) return {};
      const explicitScores = validatorData.result?.scores || validatorData.scores || validatorData.result?.result?.scores;
      if (explicitScores && typeof explicitScores === 'object' && Object.keys(explicitScores).length > 0) {
           const valid: Record<string, number> = {};
           let hasNumber = false;
           Object.entries(explicitScores).forEach(([k, v]) => {
               // Handle "8/10" string format
               let numStr = String(v);
               if (numStr.includes('/')) numStr = numStr.split('/')[0];
               
               const n = Number(numStr);
               if (!isNaN(n)) {
                   valid[k] = n;
                   hasNumber = true;
               }
           });
           if (hasNumber) return valid;
      }

      const knownKeys = ['b2b_tone', 'brand_alignment', 'structure', 'accuracy', 'enterprise_relevance'];
      const targets = [validatorData.result, validatorData].filter(Boolean);
      
      for (const target of targets) {
          const found: Record<string, number> = {};
          let hasScore = false;
          for (const key of knownKeys) {
             if (target[key] !== undefined) {
                 const num = parseFloat(target[key]);
                 if (!isNaN(num)) {
                     found[key] = num;
                     hasScore = true;
                 }
             }
          }
          if (hasScore) return found;
      }
      return {};
  };

  const getAverageScore = (validatorData: any) => {
    const scores = getScores(validatorData);
    const values = Object.values(scores).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(1);
  };

  const getScoreColor = (score: number) => {
      if (score >= 8) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800';
      if (score >= 5) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800';
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800';
  };

  if (viewingTopic) {
    const { generatedContent, validatorData } = viewingTopic;
    const avgScore = getAverageScore(validatorData);
    const scores = getScores(validatorData);
    const isActionable = viewingTopic.status === TopicStatus.CONTENT_GENERATED;
    
    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col animate-fadeIn transition-colors duration-200">
            <style>{`
                .article-preview { color: ${theme === 'dark' ? '#d1d5db' : '#374151'}; line-height: 1.75; }
                .article-preview h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1.5rem; color: ${theme === 'dark' ? '#f3f4f6' : '#111827'}; }
                .article-preview h2 { font-size: 1.5rem; font-weight: 600; margin-top: 2.5rem; }
                .article-preview h3 { font-size: 1.25rem; font-weight: 600; margin-top: 2rem; }
                .article-preview a { color: ${theme === 'dark' ? '#818cf8' : '#4f46e5'}; text-decoration: underline; }
                .article-preview img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 2rem 0; }
            `}</style>

            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-white dark:bg-gray-800 shadow-sm flex-shrink-0 z-20 relative">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewingTopic(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-2xl">{viewingTopic.title}</h2>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                             <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-medium">{viewingTopic.keyword}</span>
                             <span>•</span>
                             <span>{viewingTopic.angle}</span>
                             {avgScore && (
                                <>
                                    <span>•</span>
                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${getScoreColor(Number(avgScore))}`}>
                                        <BarChart2 className="w-3 h-3" /> Score: {avgScore}
                                    </span>
                                </>
                             )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setViewingTopic(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium">Close</button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-850 flex gap-6 flex-shrink-0">
                        <button onClick={() => setActiveViewTab('preview')} className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeViewTab === 'preview' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                            <FileText className="w-4 h-4" /> Article Preview
                        </button>
                        <button onClick={() => setActiveViewTab('details')} className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeViewTab === 'details' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                            <Layers className="w-4 h-4" /> Content Strategy & SEO
                        </button>
                        <button onClick={() => setActiveViewTab('validation')} className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeViewTab === 'validation' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                            <BarChart2 className="w-4 h-4" /> AI Score
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
                        {activeViewTab === 'preview' && (
                            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12 min-h-full">
                                <div className="prose prose-indigo dark:prose-invert max-w-none article-preview">
                                    {generatedContent?.content_html ? (
                                        <div dangerouslySetInnerHTML={{ __html: generatedContent.content_html }} />
                                    ) : viewingTopic.htmlContent ? (
                                        <div dangerouslySetInnerHTML={{ __html: viewingTopic.htmlContent }} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                                            <FileText className="w-12 h-12 mb-2 opacity-50" />
                                            <p>No preview content available.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeViewTab === 'details' && (
                            <div className="max-w-5xl mx-auto space-y-6">
                                {generatedContent ? (
                                <>
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Search className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> SEO & Meta
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">SEO Title</label>
                                            <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-750 p-2 rounded border border-gray-100 dark:border-gray-600 text-sm">{generatedContent.seo_title || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">URL Slug</label>
                                            <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-750 p-2 rounded border border-gray-100 dark:border-gray-600 text-sm font-mono">{generatedContent.slug || '-'}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Meta Description</label>
                                            <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-750 p-2 rounded border border-gray-100 dark:border-gray-600 text-sm">{generatedContent.meta_description || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Focus Keyword</label>
                                            <span className="inline-block bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-sm font-medium">{generatedContent.focus_keyword || '-'}</span>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Related Keywords</label>
                                            <div className="flex flex-wrap gap-2">
                                                {generatedContent.related_keywords?.length > 0 ? generatedContent.related_keywords.map((k, i) => (
                                                    <span key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">{k}</span>
                                                )) : <span className="text-gray-400 text-sm">None</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Content Structure
                                    </h3>
                                    {generatedContent.sections && generatedContent.sections.length > 0 ? (
                                        <div className="space-y-6">
                                            {generatedContent.sections.map((section, idx) => (
                                                <div key={idx} className="border-l-4 border-indigo-100 dark:border-indigo-900 pl-4">
                                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-2">{section.heading}</h4>
                                                    {section.key_points && section.key_points.length > 0 && (
                                                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 text-sm space-y-1">
                                                            {section.key_points.map((point, pIdx) => (
                                                                <li key={pIdx}>{point}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 italic">No structured outline available.</p>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> FAQ Schema
                                    </h3>
                                    {generatedContent.faq && generatedContent.faq.length > 0 ? (
                                        <div className="space-y-4">
                                            {generatedContent.faq.map((item, idx) => (
                                                <div key={idx} className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                                                    <p className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">Q: {item.q}</p>
                                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                                        {item.a_outline?.map((ans, aIdx) => (
                                                            <p key={aIdx} className="mb-1">• {ans}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 italic">No FAQs available.</p>
                                    )}
                                </div>
                                </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                                        <Layers className="w-12 h-12 mb-2 opacity-50" />
                                        <p>No structured data available.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeViewTab === 'validation' && (
                            <div className="max-w-5xl mx-auto space-y-6">
                                {validatorData ? (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-750/30 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                                            <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> 
                                            Content Quality Analysis
                                        </h3>
                                        {avgScore && (
                                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getScoreColor(Number(avgScore))}`}>
                                                Overall Score: {avgScore}/10
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="p-6 md:p-8 space-y-8">
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Score Breakdown</h4>
                                            </div>
                                            {Object.keys(scores).length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                                    {Object.entries(scores).map(([key, value]) => (
                                                        <div key={key} className="bg-white dark:bg-gray-750 p-4 rounded-xl border border-gray-200 dark:border-gray-600 text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                                            <div className={`absolute top-0 left-0 w-full h-1 ${Number(value) >= 7 ? 'bg-green-500' : Number(value) >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                                            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{String(value)}</div>
                                                            <div className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate" title={key.replace(/_/g, ' ')}>{key.replace(/_/g, ' ')}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-6 text-center border border-gray-100 dark:border-gray-700 flex flex-col items-center">
                                                    <AlertCircle className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-2" />
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Individual numeric scores were not returned by the validator.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-px bg-gray-100 dark:bg-gray-700 w-full"></div>

                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white mb-3">Executive Summary</h4>
                                            <div className="text-gray-700 dark:text-gray-300 leading-relaxed bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 text-sm md:text-base">
                                                {validatorData.result?.summary || (validatorData as any).summary || "No summary available."}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                                        <BarChart2 className="w-12 h-12 mb-2 opacity-50" />
                                        <p>No validation data available.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-4 shadow-xl z-20 flex-shrink-0">
                    <div className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Actions</div>
                    {isActionable ? (
                        <>
                            <button onClick={() => initiateReview('DRAFT')} disabled={reviewStatus === 'sending'} className={`w-full py-3 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-95 ${reviewStatus === 'sending' ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'}`}>
                                {reviewStatus === 'sending' && reviewModalState.action === 'DRAFT' ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Check className="w-5 h-5" />} Approve / Draft
                            </button>
                            <button onClick={() => initiateReview('REJECTED')} disabled={reviewStatus === 'sending'} className={`w-full py-3 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-95 ${reviewStatus === 'sending' && reviewModalState.action === 'REJECTED' ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'}`}>
                                <XCircle className="w-5 h-5" /> Reject Article
                            </button>
                            <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 text-center">Reviewing will send data to the configured webhook.</div>
                        </>
                    ) : (
                        <div className={`p-4 rounded-lg border text-center ${viewingTopic.status === TopicStatus.ARTICLE_DRAFT ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                            <div className="flex justify-center mb-2">{viewingTopic.status === TopicStatus.ARTICLE_DRAFT ? <CheckCircle className="w-8 h-8 opacity-80" /> : <XCircle className="w-8 h-8 opacity-80" />}</div>
                            <p className="font-bold text-sm">{viewingTopic.status === TopicStatus.ARTICLE_DRAFT ? 'Article Drafted' : 'Article Rejected'}</p>
                        </div>
                    )}
                </div>
            </div>

             <ConfirmationModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmDelete} title="Delete Article" message={`Are you sure you want to permanently delete the article for "${deleteModalState.topicTitle}"?`} variant="danger" confirmLabel="Delete" />
             <ConfirmationModal isOpen={reviewModalState.isOpen} onClose={() => setReviewModalState(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmReview} title={reviewModalState.action === 'DRAFT' ? 'Confirm Approval' : 'Confirm Rejection'} message={reviewModalState.action === 'DRAFT' ? `Are you sure you want to approve "${viewingTopic.title}" as a draft?` : `Are you sure you want to reject "${viewingTopic.title}"?`} variant={reviewModalState.action === 'DRAFT' ? 'success' : 'danger'} confirmLabel={reviewModalState.action === 'DRAFT' ? 'Approve & Send' : 'Reject & Send'} showInput={true} inputPlaceholder="Reason (Required)..." inputValue={reviewModalState.reason} onInputChange={(val) => setReviewModalState(prev => ({ ...prev, reason: val }))} />
        </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* ... (Existing List View Render) ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Generated Articles</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">View and manage fully generated content.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Search articles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
            </div>
            <div className="relative">
                <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 cursor-pointer">
                <option value="all">All Products</option>
                {availableProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {[{ id: 'review', label: 'Ready for Review', icon: FileText, color: 'text-indigo-600 dark:text-indigo-400', count: counts.review }, { id: 'drafts', label: 'Drafts / Approved', icon: CheckCircle, color: 'text-green-600 dark:text-green-400', count: counts.drafts }, { id: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600 dark:text-red-400', count: counts.rejected }].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${isActive ? `border-${tab.color.split('-')[1].split(' ')[0]}-500 ${tab.color} bg-${tab.color.split('-')[1].split(' ')[0]}-50/50 dark:bg-${tab.color.split('-')[1].split(' ')[0]}-900/20` : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : ''}`} /> {tab.label} <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{tab.count}</span>
                  </button>
              );
          })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredTopics.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed h-full flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No articles in this tab.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                {filteredTopics.map((topic) => {
                    // Similar logic for cards: check metadata first, then img_url
                    let cardImage = topic.generatedContent?.featured_image || topic.img_url;
                    // Note: In card view we don't extract from HTML because it's heavy to parse all articles.
                    // The normalizeTopic function should have synced img_url if found.
                    
                    const avg = getAverageScore(topic.validatorData);
                    const statusColor = topic.status === TopicStatus.ARTICLE_DRAFT ? 'green' : topic.status === TopicStatus.ARTICLE_REJECTED ? 'red' : 'indigo';
                    
                    return (
                    <div key={topic.id} className={`bg-white dark:bg-gray-800 rounded-xl border border-${statusColor}-200 dark:border-${statusColor}-900 shadow-sm transition-all hover:shadow-md flex flex-col overflow-hidden`}>
                        {isValidUrl(cardImage) && (
                             <div className={`h-48 w-full bg-gray-100 dark:bg-gray-700 relative group-hover:opacity-90 transition-opacity border-b border-${statusColor}-100 dark:border-${statusColor}-900`}>
                                <img src={cardImage} alt={topic.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                             </div>
                        )}
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col gap-1">
                                    <span className={`text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded truncate max-w-[150px] inline-block self-start`}>{topic.keyword}</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded truncate max-w-[150px] inline-block self-start">{topic.product}</span>
                                </div>
                                <span className={`bg-${statusColor}-100 dark:bg-${statusColor}-900/30 text-${statusColor}-700 dark:text-${statusColor}-300 px-2 py-1 rounded-full text-xs font-semibold border border-${statusColor}-200 dark:border-${statusColor}-800 flex items-center gap-1`}>
                                    {topic.status === TopicStatus.ARTICLE_DRAFT ? <CheckCircle className="w-3 h-3" /> : topic.status === TopicStatus.ARTICLE_REJECTED ? <XCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />} {topic.status === TopicStatus.ARTICLE_DRAFT ? 'Drafted' : topic.status === TopicStatus.ARTICLE_REJECTED ? 'Rejected' : 'Ready'}
                                </span>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 leading-tight">{topic.title}</h3>
                            <div className="flex flex-col gap-2 mb-4">
                                <div className="text-sm"><span className="text-gray-500 dark:text-gray-400">Angle: </span><span className="text-gray-800 dark:text-gray-200 font-medium">{topic.angle}</span></div>
                                {avg && (<div className="flex"><span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${getScoreColor(Number(avg))}`}><BarChart2 className="w-3 h-3" /> AI Score: {avg}/10</span></div>)}
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-750/50 rounded-b-xl flex justify-between items-center">
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(topic.createdAt).toLocaleDateString()}</span>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => initiateDelete(topic.id, topic.title)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete Article"><Trash2 className="w-4 h-4" /></button>
                                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                <button onClick={() => openViewer(topic)} className={`px-4 py-2 bg-${statusColor}-600 hover:bg-${statusColor}-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-${statusColor}-200 dark:shadow-none`}>
                                    <ExternalLink className="w-4 h-4" /> {activeTab === 'review' ? 'Read Article' : 'View Details'}
                                </button>
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        )}
      </div>
      <ConfirmationModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmDelete} title="Delete Article" message={`Are you sure you want to permanently delete the article for "${deleteModalState.topicTitle}"?`} variant="danger" confirmLabel="Delete" />
    </div>
  );
};

export default GeneratedContent;
