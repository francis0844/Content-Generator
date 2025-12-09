
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TopicStatus, Topic, ContentType } from '../types';
import { Search, ExternalLink, Trash2, FileText, ChevronLeft, Clock, Info, CheckCircle, BarChart2, Layers, AlertCircle, XCircle, Check, Share2, Link as LinkIcon, Filter, Megaphone, Hash, MessageCircle, Brain } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { sendArticleReview, sendArticleDraft } from '../services/makeService';

interface GeneratedContentProps {
  forcedType?: ContentType;
}

const GeneratedContent: React.FC<GeneratedContentProps> = ({ forcedType }) => {
  const { topics, deleteTopic, articleReviewWebhookUrl, draftingWebhookUrl, updateTopicStatus, availableProducts, theme } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all'); // Social/Backlink Platform
  const [filterGoal, setFilterGoal] = useState('all'); // Content Goal
  const [filterAudience, setFilterAudience] = useState('all'); // Target Audience (Social)

  const [viewingTopic, setViewingTopic] = useState<Topic | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'details' | 'validation'>('preview');
  const [activeTab, setActiveTab] = useState<'review' | 'drafts' | 'rejected'>('review');
  
  // Modal States
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    topicId: string | null;
    topicTitle: string;
  }>({
    isOpen: false,
    topicId: null,
    topicTitle: '',
  });

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

  // Reset specific filters when switching views
  useEffect(() => {
    setFilterPlatform('all');
    setFilterGoal('all');
    setFilterAudience('all');
  }, [forcedType]);

  const isValidUrl = (url?: string) => {
      if (!url) return false;
      return url.startsWith('http') || url.startsWith('data:') || url.startsWith('/');
  };

  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      // 1. Force Content Type Filter (Menu based)
      // STRICT FILTER: Only show items matching the forcedType (e.g. Socials Media)
      // This prevents mixing Articles with Social Posts
      if (forcedType && t.contentType !== forcedType) return false;

      // 2. Status Tab Filter
      let matchesStatus = false;
      if (activeTab === 'review') matchesStatus = t.status === TopicStatus.CONTENT_GENERATED;
      if (activeTab === 'drafts') matchesStatus = t.status === TopicStatus.ARTICLE_DRAFT;
      if (activeTab === 'rejected') matchesStatus = t.status === TopicStatus.ARTICLE_REJECTED;

      // 3. Search Filter
      const title = t.title || '';
      const keyword = t.keyword || '';
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            keyword.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 4. Specific Filters
      const matchesProduct = filterProduct === 'all' ? true : t.product === filterProduct;
      
      let matchesPlatform = true;
      if (filterPlatform !== 'all') {
          if (forcedType === 'Socials Media') matchesPlatform = t.platformType === filterPlatform;
          if (forcedType === 'Backlinks Content') matchesPlatform = t.backlinkPlatform === filterPlatform;
      }
      
      let matchesGoal = true;
      if (filterGoal !== 'all') {
          matchesGoal = t.contentGoal === filterGoal;
      }

      let matchesAudience = true;
      if (filterAudience !== 'all' && forcedType === 'Socials Media') {
          matchesAudience = t.targetAudience === filterAudience;
      }

      return matchesStatus && matchesSearch && matchesProduct && matchesPlatform && matchesGoal && matchesAudience;
    });
  }, [topics, searchTerm, activeTab, filterProduct, forcedType, filterPlatform, filterGoal, filterAudience]);

  // Derive unique options for filters based on current data
  const uniquePlatforms = useMemo(() => {
      if (!forcedType) return [];
      const field = forcedType === 'Socials Media' ? 'platformType' : 'backlinkPlatform';
      const items = topics
          .filter(t => t.contentType === forcedType)
          .map(t => (t as any)[field])
          .filter(Boolean);
      return Array.from(new Set(items));
  }, [topics, forcedType]);

  const uniqueGoals = useMemo(() => {
      if (!forcedType) return [];
      const items = topics
          .filter(t => t.contentType === forcedType)
          .map(t => t.contentGoal)
          .filter(Boolean);
      return Array.from(new Set(items));
  }, [topics, forcedType]);

  const uniqueAudiences = useMemo(() => {
      if (forcedType !== 'Socials Media') return [];
      const items = topics
          .filter(t => t.contentType === forcedType)
          .map(t => t.targetAudience)
          .filter(Boolean);
      return Array.from(new Set(items));
  }, [topics, forcedType]);

  const counts = useMemo(() => {
    const baseTopics = topics.filter(t => !forcedType || t.contentType === forcedType);
    return {
      review: baseTopics.filter(t => t.status === TopicStatus.CONTENT_GENERATED).length,
      drafts: baseTopics.filter(t => t.status === TopicStatus.ARTICLE_DRAFT).length,
      rejected: baseTopics.filter(t => t.status === TopicStatus.ARTICLE_REJECTED).length,
    };
  }, [topics, forcedType]);

  const initiateDelete = (id: string, title: string) => {
    setDeleteModalState({ isOpen: true, topicId: id, topicTitle: title });
  };
  const confirmDelete = () => {
    if (deleteModalState.topicId) {
      deleteTopic(deleteModalState.topicId);
      if (viewingTopic && viewingTopic.id === deleteModalState.topicId) setViewingTopic(null);
    }
    setDeleteModalState(prev => ({ ...prev, isOpen: false }));
  };
  const openViewer = (topic: Topic) => { setViewingTopic(topic); setActiveViewTab('preview'); setReviewStatus('idle'); };
  const initiateReview = (action: 'DRAFT' | 'REJECTED') => { setReviewModalState({ isOpen: true, action: action, reason: '' }); };
  
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
          contentType: viewingTopic.contentType || 'Article',
          status: action,
          image_url: content.featured_image || '',
          focus_keyword: content.focus_keyword || viewingTopic.keyword,
          seo_data: { seo_title: content.seo_title || '', meta_description: content.meta_description || '', slug: content.slug || '' }
      };
      try {
          const promises = [sendArticleReview(articleReviewWebhookUrl, payload)];
          if (action === 'DRAFT' && draftingWebhookUrl) promises.push(sendArticleDraft(draftingWebhookUrl, payload));
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
          if (msg.includes('410') || msg.includes('404')) msg = `Webhook Connection Failed (${msg}).`;
          alert(msg);
      } finally {
          setReviewModalState(prev => ({ ...prev, isOpen: false }));
      }
  };

  const getPageTitle = () => {
      if (forcedType === 'Socials Media') return 'Social Media Content';
      if (forcedType === 'Backlinks Content') return 'Backlinks Content';
      return 'Generated Articles';
  }

  const getPageIcon = () => {
      if (forcedType === 'Socials Media') return Share2;
      if (forcedType === 'Backlinks Content') return LinkIcon;
      return FileText;
  }
  
  const PageIcon = getPageIcon();

  // Helper to get AI Status Badge (Approved vs Revisions)
  const getAiStatusBadge = (validatorResult: any) => {
      if (!validatorResult || !validatorResult.status) return null;
      const status = String(validatorResult.status).toLowerCase().trim();
      
      if (status === 'approved' || status.includes('pass')) {
          return <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200 dark:border-green-800 flex items-center gap-1"><Brain className="w-3 h-3" /> AI Approved</span>;
      }
      if (status === 'rejected' || status.includes('fail')) {
          return <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 dark:border-red-800 flex items-center gap-1"><Brain className="w-3 h-3" /> AI Rejected</span>;
      }
      if (status === 'revisions_required' || status.includes('revision')) {
          return <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-orange-200 dark:border-orange-800 flex items-center gap-1"><Brain className="w-3 h-3" /> Revisions</span>;
      }
      
      // Default fallback for other statuses (e.g. "Draft", "Review", "Completed" if not filtered out)
      // We explicitly exclude 'completed' if you don't want to show it, but 'revisions_required' will be caught above.
      if (status !== 'completed' && status !== 'pending') {
          return <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200 dark:border-gray-600 flex items-center gap-1 capitalize"><Brain className="w-3 h-3" /> {status.replace(/_/g, ' ')}</span>;
      }
      
      return null;
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
       {viewingTopic ? (
           <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col animate-fadeIn transition-colors duration-200">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-white dark:bg-gray-800 shadow-sm flex-shrink-0 z-20 relative">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewingTopic(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-2xl">{viewingTopic.title}</h2>
                                {/* Show AI Status in Viewer Header */}
                                {getAiStatusBadge(viewingTopic.validatorData?.result)}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span className="border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded text-xs">{viewingTopic.contentType}</span>
                                {viewingTopic.platformType && <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-medium">{viewingTopic.platformType}</span>}
                                {viewingTopic.backlinkPlatform && <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-medium">{viewingTopic.backlinkPlatform}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setViewingTopic(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium">Close</button>
                </div>
                <div className="flex flex-1 overflow-hidden relative">
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        <div className="border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-850 flex gap-6 flex-shrink-0">
                            <button onClick={() => setActiveViewTab('preview')} className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeViewTab === 'preview' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}><FileText className="w-4 h-4" /> Content</button>
                            <button onClick={() => setActiveViewTab('details')} className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeViewTab === 'details' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}><Layers className="w-4 h-4" /> Strategy</button>
                            <button onClick={() => setActiveViewTab('validation')} className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeViewTab === 'validation' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}><BarChart2 className="w-4 h-4" /> Validation</button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8">
                            {activeViewTab === 'preview' && (
                                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 min-h-full">
                                    {viewingTopic.contentType === 'Socials Media' && viewingTopic.generatedContent?.socialPost ? (
                                        /* SOCIAL MEDIA CARD VIEW */
                                        <div className="space-y-6">
                                             {viewingTopic.generatedContent.hook && (
                                                <div className="border-l-4 border-indigo-500 pl-4 py-1">
                                                     <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wide mb-1">Hook</h3>
                                                     <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{viewingTopic.generatedContent.hook}</p>
                                                </div>
                                             )}
                                             
                                             <div className="bg-gray-50 dark:bg-gray-750 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                                                  <div className="flex items-center gap-3 mb-4 border-b border-gray-200 dark:border-gray-600 pb-3">
                                                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                                                          <Share2 className="w-5 h-5" />
                                                      </div>
                                                      <span className="font-semibold text-gray-700 dark:text-gray-300">{viewingTopic.platformType || 'Social Post'}</span>
                                                  </div>
                                                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap font-medium text-gray-800 dark:text-gray-200 text-lg leading-relaxed">
                                                      {viewingTopic.generatedContent.socialPost}
                                                  </div>
                                                  {viewingTopic.generatedContent.hashtags && (
                                                      <div className="mt-6 flex flex-wrap gap-2">
                                                          {viewingTopic.generatedContent.hashtags.split(' ').map((tag, i) => (
                                                              <span key={i} className="text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded text-sm">{tag}</span>
                                                          ))}
                                                      </div>
                                                  )}
                                             </div>

                                             {(viewingTopic.callToAction || viewingTopic.generatedContent.callToAction) && (
                                                 <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-lg p-4 flex items-start gap-3">
                                                      <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                                                      <div>
                                                          <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm uppercase mb-1">Call to Action</h4>
                                                          <p className="text-blue-900 dark:text-blue-200 font-medium">{viewingTopic.callToAction || viewingTopic.generatedContent.callToAction}</p>
                                                      </div>
                                                 </div>
                                             )}
                                        </div>
                                    ) : (
                                        /* STANDARD ARTICLE PREVIEW */
                                        <div className={`prose prose-indigo dark:prose-invert max-w-none ${theme === 'dark' ? 'prose-dark' : ''}`}>
                                            <style>{`.article-preview h2 { border-bottom: none !important; }`}</style>
                                            {viewingTopic.htmlContent || viewingTopic.generatedContent?.content_html ? (
                                                <div className="article-preview" dangerouslySetInnerHTML={{ __html: viewingTopic.htmlContent || viewingTopic.generatedContent?.content_html || '' }} />
                                            ) : (<p className="text-gray-500 italic">No HTML content available.</p>)}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeViewTab === 'details' && (
                                <div className="max-w-5xl mx-auto space-y-6">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                         <h3 className="font-bold text-gray-900 dark:text-white mb-4">Metadata & Details</h3>
                                         <div className="grid md:grid-cols-2 gap-4 text-sm">
                                             <div><span className="text-gray-500">Goal:</span> <span className="text-gray-900 dark:text-gray-200 font-medium">{viewingTopic.contentGoal || '-'}</span></div>
                                             <div><span className="text-gray-500">Audience:</span> <span className="text-gray-900 dark:text-gray-200 font-medium">{viewingTopic.targetAudience || '-'}</span></div>
                                             <div><span className="text-gray-500">Link:</span> <span className="text-indigo-600">{viewingTopic.destinationUrl || '-'}</span></div>
                                             <div><span className="text-gray-500">Platform:</span> <span className="text-gray-900 dark:text-gray-200 font-medium">{viewingTopic.platformType || viewingTopic.backlinkPlatform || '-'}</span></div>
                                         </div>
                                    </div>
                                </div>
                            )}
                            {activeViewTab === 'validation' && (
                                <div className="max-w-5xl mx-auto space-y-6">
                                     {viewingTopic.validatorData ? (
                                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quality Analysis</h3>
                                            <p className="mb-4">{viewingTopic.validatorData.result?.summary}</p>
                                            
                                            {/* Fix Suggestions from Validator */}
                                            {viewingTopic.validatorData.result?.fix_suggestions && viewingTopic.validatorData.result.fix_suggestions.length > 0 && (
                                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/40 rounded-lg p-4 mt-6">
                                                    <h4 className="font-bold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                                                        <Info className="w-4 h-4" /> Suggested Improvements
                                                    </h4>
                                                    <ul className="list-disc list-inside space-y-1 text-yellow-900 dark:text-yellow-200 text-sm">
                                                        {viewingTopic.validatorData.result.fix_suggestions.map((suggestion, i) => (
                                                            <li key={i}>{suggestion}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                     ) : <p className="text-center text-gray-500">No validation data.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-4 shadow-xl z-20 flex-shrink-0">
                         <button onClick={() => initiateReview('DRAFT')} disabled={reviewStatus === 'sending'} className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 flex justify-center items-center gap-2"><Check className="w-5 h-5" /> Approve</button>
                         <button onClick={() => initiateReview('REJECTED')} disabled={reviewStatus === 'sending'} className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 flex justify-center items-center gap-2"><XCircle className="w-5 h-5" /> Reject</button>
                    </div>
                </div>
           </div>
       ) : (
           <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <PageIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        {getPageTitle()}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your generated {forcedType?.toLowerCase() || 'content'}.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-56 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" />
                    </div>
                    <div className="relative">
                        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 cursor-pointer">
                        <option value="all">All Products</option>
                        {availableProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            
            {(forcedType === 'Socials Media' || forcedType === 'Backlinks Content') && (
                <div className="flex flex-wrap gap-3 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 items-center animate-fadeIn">
                    <Filter className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-2">Filters:</span>
                    
                    <select 
                        value={filterPlatform} 
                        onChange={(e) => setFilterPlatform(e.target.value)} 
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 cursor-pointer"
                    >
                        <option value="all">All Platforms</option>
                        {uniquePlatforms.map((p, i) => <option key={i} value={p}>{p}</option>)}
                    </select>

                    {uniqueGoals.length > 0 && (
                        <select 
                            value={filterGoal} 
                            onChange={(e) => setFilterGoal(e.target.value)} 
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 cursor-pointer"
                        >
                            <option value="all">All Goals</option>
                            {uniqueGoals.map((g, i) => <option key={i} value={g}>{g}</option>)}
                        </select>
                    )}

                    {forcedType === 'Socials Media' && uniqueAudiences.length > 0 && (
                        <select 
                            value={filterAudience} 
                            onChange={(e) => setFilterAudience(e.target.value)} 
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 cursor-pointer"
                        >
                            <option value="all">All Audiences</option>
                            {uniqueAudiences.map((a, i) => <option key={i} value={a}>{a}</option>)}
                        </select>
                    )}
                </div>
            )}

            <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                {[{ id: 'review', label: 'Ready', icon: FileText, color: 'text-indigo-600', count: counts.review }, { id: 'drafts', label: 'Drafts', icon: CheckCircle, color: 'text-green-600', count: counts.drafts }, { id: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600', count: counts.rejected }].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${isActive ? `border-indigo-500 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20` : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : ''}`} /> {tab.label} <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{tab.count}</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto">
                {filteredTopics.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed h-full flex flex-col items-center justify-center">
                        <PageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No {forcedType?.toLowerCase() || 'content'} found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                        {filteredTopics.map((topic) => {
                            let cardImage = topic.generatedContent?.featured_image || topic.img_url;
                            const statusColor = topic.status === TopicStatus.ARTICLE_DRAFT ? 'green' : topic.status === TopicStatus.ARTICLE_REJECTED ? 'red' : 'indigo';
                            
                            return (
                            <div key={topic.id} className={`bg-white dark:bg-gray-800 rounded-xl border border-${statusColor}-200 dark:border-${statusColor}-900 shadow-sm transition-all hover:shadow-md flex flex-col overflow-hidden`}>
                                {isValidUrl(cardImage) && forcedType === 'Article' && (
                                    <div className={`h-40 w-full bg-gray-100 dark:bg-gray-700 relative border-b border-${statusColor}-100 dark:border-${statusColor}-900`}>
                                        <img src={cardImage} alt={topic.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    </div>
                                )}
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex gap-2 mb-1">
                                                {topic.platformType && <span className="text-[10px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded">{topic.platformType}</span>}
                                                {topic.backlinkPlatform && <span className="text-[10px] font-bold text-white bg-purple-500 px-2 py-0.5 rounded">{topic.backlinkPlatform}</span>}
                                            </div>
                                            <span className={`text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded truncate max-w-[200px] inline-block self-start`}>
                                                {topic.contentType === 'Socials Media' ? topic.mainTopic : topic.keyword}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`bg-${statusColor}-100 dark:bg-${statusColor}-900/30 text-${statusColor}-700 dark:text-${statusColor}-300 px-2 py-1 rounded-full text-xs font-semibold border border-${statusColor}-200 dark:border-${statusColor}-800 flex items-center gap-1`}>
                                                {topic.status === TopicStatus.ARTICLE_DRAFT ? <CheckCircle className="w-3 h-3" /> : topic.status === TopicStatus.ARTICLE_REJECTED ? <XCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                            </span>
                                            {/* AI Status Badge on Card */}
                                            {getAiStatusBadge(topic.validatorData?.result)}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 leading-tight">{topic.title || topic.anchorText || 'Untitled'}</h3>
                                    
                                    <div className="space-y-1 mb-4">
                                        {topic.contentGoal && <div className="text-xs text-gray-500">Goal: <span className="font-medium text-gray-700 dark:text-gray-300">{topic.contentGoal}</span></div>}
                                        {topic.targetAudience && <div className="text-xs text-gray-500">Audience: <span className="font-medium text-gray-700 dark:text-gray-300">{topic.targetAudience}</span></div>}
                                        {topic.destinationUrl && <div className="text-xs text-gray-500 truncate">Link: <a href={topic.destinationUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">{topic.destinationUrl}</a></div>}
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-750/50 rounded-b-xl flex justify-between items-center">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(topic.createdAt).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => initiateDelete(topic.id, topic.title)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                        <button onClick={() => openViewer(topic)} className={`px-4 py-2 bg-${statusColor}-600 hover:bg-${statusColor}-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm`}>
                                            <ExternalLink className="w-4 h-4" /> View
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
           </>
       )}
       <ConfirmationModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmDelete} title="Delete Item" message={`Are you sure you want to permanently delete "${deleteModalState.topicTitle}"?`} variant="danger" confirmLabel="Delete" />
       <ConfirmationModal isOpen={reviewModalState.isOpen} onClose={() => setReviewModalState(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmReview} title={reviewModalState.action === 'DRAFT' ? 'Confirm' : 'Reject'} message={reviewModalState.action === 'DRAFT' ? `Approve "${viewingTopic?.title}"?` : `Reject "${viewingTopic?.title}"?`} variant={reviewModalState.action === 'DRAFT' ? 'success' : 'danger'} confirmLabel={reviewModalState.action === 'DRAFT' ? 'Approve' : 'Reject'} showInput={true} inputPlaceholder="Reason..." inputValue={reviewModalState.reason} onInputChange={(val) => setReviewModalState(prev => ({ ...prev, reason: val }))} />
    </div>
  );
};

export default GeneratedContent;
