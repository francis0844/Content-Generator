import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TopicStatus, Topic, ContentType } from '../types';
import { generateArticle, sendFeedback } from '../services/makeService';
import { Search, Check, X, ThumbsUp, ThumbsDown, Brain, Info, Clock, RotateCcw, CheckCircle2, XCircle, Trash2, FileText, Loader2, Filter, Link as LinkIcon, ExternalLink, Sparkles, Square, CheckSquare } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

type TabType = 'pending' | 'approved' | 'rejected';
type ActionType = 'approve' | 'reject' | 'delete' | 'reset';

interface ResultsProps {
  forcedType?: ContentType;
}

const Results: React.FC<ResultsProps> = ({ forcedType }) => {
  const { 
    topics, 
    updateTopicStatus, 
    deleteTopic, 
    contentWebhookUrl, 
    feedbackWebhookUrl,
    saveGeneratedContent, 
    isGenerating, 
    contentGeneratingIds, 
    addContentGeneratingId, 
    removeContentGeneratingId,
    availableProducts 
  } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [filterKeyword, setFilterKeyword] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    topicId: string | null;
    topicTitle: string;
    action: ActionType | null;
  }>({
    isOpen: false,
    topicId: null,
    topicTitle: '',
    action: null,
  });

  const [actionReason, setActionReason] = useState('');

  const filteredTopicsByForcedType = useMemo(() => {
      // Exclude Backlinks Content from Ideation Queue entirely, regardless of forcedType prop, unless specifically requested via forcedType="Backlinks Content" (which shouldn't happen via nav, but just in case)
      return topics.filter(t => {
          if (forcedType) return t.contentType === forcedType;
          return t.contentType !== 'Backlinks Content'; 
      });
  }, [topics, forcedType]);

  const uniqueKeywords = useMemo(() => Array.from(new Set(filteredTopicsByForcedType.map(t => t.keyword || 'Unknown'))).filter(Boolean), [filteredTopicsByForcedType]);

  const counts = useMemo(() => {
    return {
      pending: filteredTopicsByForcedType.filter(t => [TopicStatus.AI_APPROVED, TopicStatus.AI_REJECTED, TopicStatus.PENDING].includes(t.status)).length,
      approved: filteredTopicsByForcedType.filter(t => t.status === TopicStatus.HUMAN_APPROVED).length,
      rejected: filteredTopicsByForcedType.filter(t => t.status === TopicStatus.HUMAN_REJECTED).length,
    };
  }, [filteredTopicsByForcedType]);

  const filteredTopics = useMemo(() => {
    return filteredTopicsByForcedType.filter(t => {
      const title = t.title || '';
      const keyword = t.keyword || '';
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            keyword.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesKeyword = filterKeyword === 'all' ? true : keyword === filterKeyword;
      const matchesProduct = filterProduct === 'all' ? true : t.product === filterProduct;
      
      let matchesStatus = false;
      if (activeTab === 'pending') {
        matchesStatus = [TopicStatus.AI_APPROVED, TopicStatus.AI_REJECTED, TopicStatus.PENDING].includes(t.status);
      } else if (activeTab === 'approved') {
        matchesStatus = t.status === TopicStatus.HUMAN_APPROVED;
      } else if (activeTab === 'rejected') {
        matchesStatus = t.status === TopicStatus.HUMAN_REJECTED;
      }
      return matchesSearch && matchesKeyword && matchesProduct && matchesStatus;
    });
  }, [filteredTopicsByForcedType, searchTerm, activeTab, filterKeyword, filterProduct]);

  // Clear selection on filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, filterKeyword, filterProduct, searchTerm, forcedType]);

  const handleGenerateContent = (topic: Topic) => {
    if (!contentWebhookUrl) {
        alert("Please configure the 'Content Generation Webhook URL' in Settings first.");
        return;
    }
    if (contentGeneratingIds.includes(topic.id)) return;
    addContentGeneratingId(topic.id);
    generateArticle(contentWebhookUrl, topic)
        .then((resultData) => {
            saveGeneratedContent(topic.id, resultData);
        })
        .catch((error: any) => {
            alert(`Failed to generate content: ${error.message}`);
        })
        .finally(() => {
            removeContentGeneratingId(topic.id);
        });
  };

  const initiateAction = (id: string, title: string, action: ActionType) => {
    if (isGenerating) return;
    setActionReason('');
    setModalState({ isOpen: true, topicId: id, topicTitle: title, action: action });
  };

  const initiateBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setActionReason('');
    setModalState({ 
        isOpen: true, 
        topicId: null, 
        topicTitle: `${selectedIds.size} selected topics`, 
        action: 'delete' 
    });
  };

  const confirmAction = () => {
    if (!modalState.action) return;

    if (modalState.action === 'delete') {
      if (modalState.topicId) {
          deleteTopic(modalState.topicId);
      } else if (selectedIds.size > 0) {
          // Bulk Delete
          selectedIds.forEach(id => deleteTopic(id));
          setSelectedIds(new Set());
      }
    } else if (modalState.action === 'reset') {
      if (modalState.topicId) updateTopicStatus(modalState.topicId, TopicStatus.PENDING);
    } else {
       if (modalState.topicId) {
           const newStatus = modalState.action === 'approve' ? TopicStatus.HUMAN_APPROVED : TopicStatus.HUMAN_REJECTED;
           updateTopicStatus(modalState.topicId, newStatus);
           if (feedbackWebhookUrl) {
               const topic = topics.find(t => t.id === modalState.topicId);
               if (topic) {
                   sendFeedback(feedbackWebhookUrl, { topic_id: topic.id, status: modalState.action.toUpperCase(), reason: actionReason });
               }
           }
       }
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
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

  const getStatusBadge = (status: TopicStatus) => {
    switch (status) {
      case TopicStatus.AI_APPROVED:
        return <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-[10px] font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1"><Brain className="w-3 h-3" /> AI APPROVED</span>;
      case TopicStatus.AI_REJECTED:
        return <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full text-[10px] font-bold border border-red-200 dark:border-red-800 flex items-center gap-1"><Brain className="w-3 h-3" /> AI REJECTED</span>;
      case TopicStatus.HUMAN_APPROVED:
        return <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-[10px] font-bold border border-green-200 dark:border-green-800 flex items-center gap-1"><Check className="w-3 h-3" /> APPROVED</span>;
      case TopicStatus.HUMAN_REJECTED:
        return <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-[10px] font-bold border border-gray-200 dark:border-gray-600 flex items-center gap-1"><X className="w-3 h-3" /> REJECTED</span>;
      default:
        return <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full text-[10px] font-bold border border-yellow-200 dark:border-yellow-800 flex items-center gap-1 font-mono"><Clock className="w-3 h-3" /> PENDING</span>;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {forcedType === 'Backlinks Content' ? <LinkIcon className="w-6 h-6 text-indigo-600" /> : <Clock className="w-6 h-6 text-indigo-600" />}
              {forcedType || 'Topic'} Ideation Queue
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Review and approve topics before generating full content.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm w-full sm:w-64" />
          <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">
            <option value="all">All Products</option>
            {availableProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[{ id: 'pending', label: 'Pending Review', icon: Clock }, { id: 'approved', label: 'Approved', icon: CheckCircle2 }, { id: 'rejected', label: 'Rejected', icon: XCircle }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' : 'border-transparent text-gray-400'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label} ({counts[tab.id as keyof typeof counts]})
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

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {filteredTopics.map((topic) => (
                <div key={topic.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col group relative">
                    {/* Selection Checkbox */}
                    <div 
                        onClick={(e) => { e.stopPropagation(); toggleSelection(topic.id); }} 
                        className="absolute top-6 right-6 z-10 cursor-pointer text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                        {selectedIds.has(topic.id) ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                    </div>

                    <div className="flex justify-between items-start mb-4 pr-8">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-widest">{topic.product}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{topic.contentType}</span>
                        </div>
                        {getStatusBadge(topic.status)}
                    </div>
                    
                    {topic.contentType === 'Backlinks Content' ? (
                        <div className="space-y-4 flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{topic.title || topic.anchorText}</h3>
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
                                <div className="mb-2">
                                    <label className="text-[9px] font-black text-indigo-500 uppercase">Anchor Text</label>
                                    <div className="font-bold text-indigo-700 dark:text-indigo-300">{topic.anchorText}</div>
                                </div>
                                <div className="mb-2">
                                    <label className="text-[9px] font-black text-indigo-500 uppercase">Destination</label>
                                    <div className="text-xs text-indigo-600 dark:text-indigo-400 truncate font-mono">{topic.destinationUrl}</div>
                                </div>
                                <div className="flex gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-indigo-500 uppercase">Platform</label>
                                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">{topic.backlinkPlatform}</div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-indigo-500 uppercase">Goal</label>
                                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">{topic.contentGoal}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2">{topic.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{topic.angle}</p>
                        </div>
                    )}

                    <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={() => initiateAction(topic.id, topic.title, 'delete')} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        <div className="flex gap-2">
                            {activeTab === 'pending' && (
                                <>
                                    <button onClick={() => initiateAction(topic.id, topic.title, 'reject')} className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors uppercase tracking-wider border border-red-100">Reject</button>
                                    <button onClick={() => initiateAction(topic.id, topic.title, 'approve')} className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-sm uppercase tracking-wider">Approve</button>
                                </>
                            )}
                            {activeTab === 'approved' && (
                                <button 
                                    onClick={() => handleGenerateContent(topic)}
                                    disabled={contentGeneratingIds.includes(topic.id)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-lg transition-all flex items-center gap-2 uppercase tracking-widest disabled:opacity-50"
                                >
                                    {contentGeneratingIds.includes(topic.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Generate Content
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      <ConfirmationModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))} 
        onConfirm={confirmAction} 
        title={modalState.action === 'approve' ? 'Approve Topic' : (modalState.action === 'reject' ? 'Reject Topic' : 'Delete Topic')} 
        message={modalState.topicId ? `Confirm action on "${modalState.topicTitle}"?` : `Are you sure you want to delete ${modalState.topicTitle}? This cannot be undone.`} 
        variant={modalState.action === 'approve' ? 'success' : 'danger'}
        showInput={modalState.topicId ? (modalState.action === 'approve' || modalState.action === 'reject') : false}
        inputValue={actionReason}
        onInputChange={setActionReason}
        inputPlaceholder="Add internal notes or feedback for this decision..."
      />
    </div>
  );
};

export default Results;