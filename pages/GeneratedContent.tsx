import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TopicStatus, Topic, ContentType } from '../types';
import { Search, ChevronLeft, Trash2, FileText, Share2, Link as LinkIcon, Image as ImageIcon, ExternalLink, CheckSquare, Square, Calendar, MessageCircle } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { sendArticleReview, sendSocialMediaReview } from '../services/makeService';
import { ArticleViewer } from '../components/viewers/ArticleViewer';
import { SocialViewer } from '../components/viewers/SocialViewer';
import { BacklinkViewer } from '../components/viewers/BacklinkViewer';

interface GeneratedContentProps {
  forcedType?: ContentType;
}

const GeneratedContent: React.FC<GeneratedContentProps> = ({ forcedType }) => {
  const { topics, deleteTopic, articleReviewWebhookUrl, socialReviewWebhookUrl, updateTopicStatus } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterProduct, setFilterProduct] = useState('all');

  const [viewingTopic, setViewingTopic] = useState<Topic | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'metadata_strategy' | 'analysis'>('preview');
  const [activeTab, setActiveTab] = useState<'review' | 'drafts' | 'rejected'>('review');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [reviewModalState, setReviewModalState] = useState<{ 
    isOpen: boolean; 
    action: 'DRAFT' | 'REJECTED' | 'APPROVED' | 'REVERT' | 'DELETE' | null; 
    reason: string; 
    targetTopicId?: string;
  }>({ 
    isOpen: false, 
    action: null, 
    reason: '', 
  });
  
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Social Media Approval State
  const [socialScheduleDate, setSocialScheduleDate] = useState('');
  const [socialFirstComment, setSocialFirstComment] = useState('');

  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      if (forcedType && t.contentType !== forcedType) return false;
      let matchesStatus = false;
      if (activeTab === 'review') matchesStatus = t.status === TopicStatus.CONTENT_GENERATED;
      
      if (activeTab === 'drafts') {
          // For Articles, "Approved" means it is a DRAFT. HUMAN_APPROVED is just an approved idea waiting for generation.
          if (t.contentType === 'Article') {
              matchesStatus = t.status === TopicStatus.ARTICLE_DRAFT || t.status === TopicStatus.HUMAN_APPROVED;
              // Strict check: If it's an Article, only show actual DRAFTS in the Approved tab, not just approved ideas.
              matchesStatus = t.status === TopicStatus.ARTICLE_DRAFT;
          } else {
              // For Social/Backlinks, HUMAN_APPROVED implies content approval as they are one-shot generations.
              matchesStatus = t.status === TopicStatus.HUMAN_APPROVED;
          }
      }
      
      if (activeTab === 'rejected') matchesStatus = t.status === TopicStatus.ARTICLE_REJECTED || t.status === TopicStatus.HUMAN_REJECTED;

      const title = t.title || '';
      const keyword = t.keyword || '';
      const anchor = t.anchorText || '';
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            anchor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProduct = filterProduct === 'all' ? true : t.product === filterProduct;
      return matchesStatus && matchesSearch && matchesProduct;
    });
  }, [topics, searchTerm, activeTab, filterProduct, forcedType]);

  // Clear selection on filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, filterProduct, searchTerm, forcedType]);

  const counts = useMemo(() => {
    const baseTopics = topics.filter(t => !forcedType || t.contentType === forcedType);
    return {
      review: baseTopics.filter(t => t.status === TopicStatus.CONTENT_GENERATED).length,
      drafts: baseTopics.filter(t => {
          if (t.contentType === 'Article') return t.status === TopicStatus.ARTICLE_DRAFT;
          return t.status === TopicStatus.HUMAN_APPROVED;
      }).length,
      rejected: baseTopics.filter(t => t.status === TopicStatus.ARTICLE_REJECTED || t.status === TopicStatus.HUMAN_REJECTED).length,
    };
  }, [topics, forcedType]);

  const openViewer = (topic: Topic) => { 
    setViewingTopic(topic); 
    setActiveViewTab('preview'); 
    setReviewStatus('idle'); 
  };

  const initiateReview = (action: 'DRAFT' | 'REJECTED' | 'APPROVED' | 'REVERT' | 'DELETE', topicId?: string) => { 
    setReviewModalState({ 
        isOpen: true, 
        action, 
        reason: '', 
        targetTopicId: topicId || viewingTopic?.id 
    });
    // Reset social fields
    setSocialScheduleDate('');
    setSocialFirstComment('');
  };

  const initiateBulkDelete = () => {
      if (selectedIds.size === 0) return;
      setReviewModalState({
          isOpen: true,
          action: 'DELETE',
          reason: '',
          targetTopicId: undefined
      });
  };
  
  const confirmReview = async () => {
      const { action, targetTopicId, reason } = reviewModalState;
      
      if (action === 'DELETE') {
          if (targetTopicId) {
              deleteTopic(targetTopicId);
              if (viewingTopic?.id === targetTopicId) setViewingTopic(null);
          } else if (selectedIds.size > 0) {
              // Bulk Delete
              selectedIds.forEach(id => deleteTopic(id));
              setSelectedIds(new Set());
              setViewingTopic(null);
          }
          setReviewModalState(p => ({ ...p, isOpen: false }));
          return;
      }

      if (!viewingTopic) return;

      if (action === 'REVERT') { 
          updateTopicStatus(viewingTopic.id, TopicStatus.CONTENT_GENERATED); 
          setViewingTopic(null); 
          setReviewModalState(p => ({ ...p, isOpen: false })); 
          return; 
      }

      setReviewStatus('sending');
      try {
          if (viewingTopic.contentType === 'Socials Media') {
              // Append seconds and GMT-06:00 offset explicitly as requested
              const formattedDate = socialScheduleDate ? `${socialScheduleDate}:00-06:00` : '';
              
              await sendSocialMediaReview(socialReviewWebhookUrl, { 
                  ...viewingTopic, 
                  review_action: action, 
                  reason: reason,
                  schedule_date: formattedDate,
                  first_comment: socialFirstComment
              });
              updateTopicStatus(viewingTopic.id, action === 'APPROVED' ? TopicStatus.HUMAN_APPROVED : TopicStatus.HUMAN_REJECTED);
          } else {
              await sendArticleReview(articleReviewWebhookUrl, { 
                  title: viewingTopic.title, 
                  html_content: viewingTopic.generatedContent?.content_html || viewingTopic.htmlContent || '', 
                  status: action,
                  reason: reason 
              });
              // Map 'APPROVED' action to ARTICLE_DRAFT status for articles
              const isApproved = action === 'DRAFT' || action === 'APPROVED';
              updateTopicStatus(viewingTopic.id, isApproved ? TopicStatus.ARTICLE_DRAFT : TopicStatus.ARTICLE_REJECTED);
          }
          setViewingTopic(null);
      } catch (e: any) { alert(e.message); } finally { setReviewStatus('idle'); setReviewModalState(p => ({ ...p, isOpen: false })); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTopics.length && filteredTopics.length > 0) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredTopics.map(t => t.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const PageIcon = forcedType === 'Socials Media' ? Share2 : (forcedType === 'Backlinks Content' ? LinkIcon : FileText);

  // Check if we are approving a social media post to show extra fields
  const isSocialApproval = viewingTopic?.contentType === 'Socials Media' && reviewModalState.action === 'APPROVED';

  return (
    <div className="space-y-6 h-full flex flex-col">
       {viewingTopic ? (
           <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col animate-fadeIn">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-white dark:bg-gray-800 shadow-sm z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewingTopic(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div>
                            {viewingTopic.contentType !== 'Backlinks Content' && <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-2xl">{viewingTopic.title}</h2>}
                            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">{viewingTopic.contentType}</span>
                        </div>
                    </div>
                    <button onClick={() => setViewingTopic(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold uppercase text-xs tracking-widest">Close</button>
                </div>
                
                {/* Dedicated Viewers based on Content Type */}
                {viewingTopic.contentType === 'Article' && (
                    <ArticleViewer topic={viewingTopic} activeTab={activeViewTab} onTabChange={setActiveViewTab} />
                )}
                {viewingTopic.contentType === 'Socials Media' && (
                    <SocialViewer topic={viewingTopic} activeTab={activeViewTab} onTabChange={setActiveViewTab} />
                )}
                {viewingTopic.contentType === 'Backlinks Content' && (
                    <BacklinkViewer topic={viewingTopic} />
                )}

                <div className="w-72 border-l border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-4 bg-white dark:bg-gray-800 absolute right-0 top-20 bottom-0 z-30">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">Review Controls</h3>
                    
                    {viewingTopic.contentType === 'Backlinks Content' ? (
                         <>
                            {viewingTopic.documentUrl && (
                                <a href={viewingTopic.documentUrl} target="_blank" rel="noreferrer" className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    View Google Doc
                                </a>
                            )}
                        </>
                    ) : (
                        activeTab === 'review' ? (
                            <>
                                <button onClick={() => initiateReview('APPROVED')} className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black shadow-lg transition-all uppercase tracking-widest text-xs">Approve Content</button>
                                <button onClick={() => initiateReview('REJECTED')} className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black shadow-lg transition-all uppercase tracking-widest text-xs">Reject Content</button>
                            </>
                        ) : (
                            <button onClick={() => initiateReview('REVERT')} className="w-full py-4 px-6 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-all uppercase tracking-widest text-xs">Revert to Ready</button>
                        )
                    )}
                    
                    <button onClick={() => initiateReview('DELETE')} className="w-full py-3 px-6 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Library Entry
                    </button>

                    <div className="mt-auto p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Metadata Summary</span>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-gray-400 uppercase">Words:</span>
                                <span className="text-gray-900 dark:text-white font-bold">~{(typeof (viewingTopic.generatedContent?.content_html || viewingTopic.htmlContent) === 'string' ? (viewingTopic.generatedContent?.content_html || viewingTopic.htmlContent || '') : '').split(' ').length || 0}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-gray-400 uppercase">Product:</span>
                                <span className="text-gray-900 dark:text-white font-bold">{viewingTopic.product}</span>
                            </div>
                        </div>
                    </div>
                </div>
           </div>
       ) : (
           <>
            <div className="flex justify-between items-center flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <PageIcon className="w-6 h-6 text-indigo-600" />
                    {forcedType || 'Content'} Library
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Search library..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm w-64 shadow-sm" />
                </div>
            </div>
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                {[{ id: 'review', label: 'Ready for Review' }, { id: 'drafts', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        {tab.label} ({counts[tab.id as keyof typeof counts]})
                    </button>
                ))}
            </div>

            {/* Bulk Actions Bar */}
            <div className="flex items-center justify-between py-2 min-h-[40px]">
                <button 
                    onClick={toggleSelectAll} 
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    {selectedIds.size === filteredTopics.length && filteredTopics.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                        <Square className="w-5 h-5" />
                    )}
                    Select All ({filteredTopics.length})
                </button>
                
                {selectedIds.size > 0 && (
                    <button 
                        onClick={initiateBulkDelete} 
                        className="flex items-center gap-2 px-4 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected ({selectedIds.size})
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 pb-12">
                    {filteredTopics.map(topic => (
                        <div key={topic.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden border-b-4 border-b-indigo-600 relative group">
                            
                            {/* Selection Checkbox (Top Left) */}
                            <div 
                                onClick={(e) => { e.stopPropagation(); toggleSelection(topic.id); }} 
                                className="absolute top-4 left-4 z-20 cursor-pointer text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 bg-white/80 dark:bg-gray-900/80 rounded-full backdrop-blur-sm"
                            >
                                {selectedIds.has(topic.id) ? (
                                    <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                    <Square className="w-5 h-5" />
                                )}
                            </div>

                            {/* Card Delete Button (Top Right) */}
                            <button 
                                onClick={() => initiateReview('DELETE', topic.id)}
                                className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-gray-100 dark:border-gray-700"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Thumbnail for All Types - ADJUSTED FOR SOCIAL MEDIA TO COVER WIDTH NO CUT */}
                            {/* Hide Image section entirely for Backlinks Content */}
                            {topic.contentType !== 'Backlinks Content' && (
                                <div className={`${topic.contentType === 'Socials Media' ? 'w-full relative' : 'aspect-video relative overflow-hidden bg-white dark:bg-gray-950 flex items-center justify-center'} border-b border-gray-100 dark:border-gray-800`}>
                                    {topic.generatedContent?.featured_image ? (
                                        <img 
                                            src={topic.generatedContent.featured_image} 
                                            alt={topic.title} 
                                            className={`${topic.contentType === 'Socials Media' ? 'w-full h-auto block' : 'max-w-full max-h-full object-contain'} transition-transform duration-500 group-hover:scale-105`}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-48 w-full text-gray-400 dark:text-gray-600 gap-3">
                                            <div className="p-4 bg-gray-200 dark:bg-gray-800 rounded-full">
                                                <ImageIcon className="w-8 h-8 opacity-40" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">No Featured Image</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="p-6 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-4 pl-8">
                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">{topic.product}</span>
                                    {topic.contentType === 'Backlinks Content' && <span className="text-[9px] font-black text-white bg-purple-600 px-2 py-1 rounded uppercase tracking-widest">{topic.backlinkPlatform}</span>}
                                    {topic.contentType === 'Socials Media' && topic.platformType && <span className="text-[9px] font-black text-white bg-blue-500 px-2 py-1 rounded uppercase tracking-widest">{topic.platformType}</span>}
                                </div>

                                {topic.contentType === 'Backlinks Content' ? (
                                    <div className="flex-1 space-y-4">
                                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 text-center">
                                            <label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Anchor Text</label>
                                            <h3 className="font-black text-xl text-indigo-700 dark:text-indigo-300 leading-tight">"{topic.anchorText}"</h3>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 overflow-hidden">
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{topic.destinationUrl}</span>
                                        </div>
                                    </div>
                                ) : (
                                    topic.contentType === 'Socials Media' ? (
                                        <div className="flex-1 mb-4">
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-2">
                                                {(topic.title && topic.title !== 'Untitled Topic' && topic.title !== 'Generated Content') ? topic.title : (topic.generatedContent?.hook || 'Social Media Post')}
                                            </h3>
                                            {topic.generatedContent?.socialPost && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 font-sans">
                                                    {topic.generatedContent.socialPost}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-4 flex-1">{topic.title}</h3>
                                    )
                                )}

                                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(topic.createdAt).toLocaleDateString()}</span>
                                    {topic.contentType === 'Backlinks Content' && topic.documentUrl ? (
                                        <a href={topic.documentUrl} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black shadow-md transition-all uppercase tracking-widest flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            View Document
                                        </a>
                                    ) : (
                                        <button onClick={() => openViewer(topic)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black shadow-md transition-all uppercase tracking-widest">
                                            {topic.contentType === 'Article' ? 'View Article' : (topic.contentType === 'Backlinks Content' ? 'View Document' : 'View Strategy')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
           </>
       )}
       <ConfirmationModal 
          isOpen={reviewModalState.isOpen} 
          onClose={() => setReviewModalState(p => ({ ...p, isOpen: false }))} 
          onConfirm={confirmReview} 
          title={reviewModalState.action === 'DELETE' ? 'Delete Entry' : (isSocialApproval ? 'Approve & Schedule Post' : 'Content Review')} 
          message={reviewModalState.action === 'DELETE' ? (selectedIds.size > 0 && !reviewModalState.targetTopicId ? `Are you sure you want to delete ${selectedIds.size} items?` : 'Are you sure you want to permanently remove this content from the library? This action cannot be undone.') : (isSocialApproval ? 'Please configure the publishing details for this social media post.' : `Are you sure you want to ${reviewModalState.action?.toLowerCase()} this content?`)} 
          variant={reviewModalState.action === 'REJECTED' || reviewModalState.action === 'DELETE' ? 'danger' : 'success'}
          showInput={reviewModalState.action === 'DRAFT' || reviewModalState.action === 'REJECTED' || isSocialApproval}
          inputValue={reviewModalState.reason}
          onInputChange={(val) => setReviewModalState(p => ({ ...p, reason: val }))}
          inputPlaceholder={isSocialApproval ? "Approval Notes / Internal Reason (Optional)" : "Please provide feedback or internal notes for the system..."}
       >
           {isSocialApproval && (
               <div className="space-y-5 mt-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="space-y-2">
                        <label className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                <Calendar className="w-3 h-3" />
                                Schedule Date & Time
                            </div>
                            <span className="text-[10px] text-gray-500 font-medium">GMT-06:00 America/Chicago (CST)</span>
                        </label>
                        <input 
                            type="datetime-local" 
                            value={socialScheduleDate}
                            onChange={(e) => setSocialScheduleDate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm transition-all [color-scheme:light] dark:[color-scheme:dark]"
                        />
                    </div>
                    <div className="space-y-2">
                         <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            <MessageCircle className="w-3 h-3" />
                            First Comment (Optional)
                         </label>
                         <textarea
                            value={socialFirstComment}
                            onChange={(e) => setSocialFirstComment(e.target.value)}
                            placeholder="Add hashtags, links, or engagement starters..."
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none h-24 shadow-sm transition-all placeholder-gray-400"
                         />
                    </div>
               </div>
           )}
       </ConfirmationModal>
    </div>
  );
};

export default GeneratedContent;