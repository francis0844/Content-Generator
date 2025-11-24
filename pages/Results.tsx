import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TopicStatus, Topic } from '../types';
import { generateArticle, sendFeedback } from '../services/makeService';
import { Search, Check, X, ThumbsUp, ThumbsDown, Brain, Info, Clock, RotateCcw, CheckCircle2, XCircle, Trash2, FileText, Loader2, Filter } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

type TabType = 'pending' | 'approved' | 'rejected';
type ActionType = 'approve' | 'reject' | 'delete' | 'reset';

const Results: React.FC = () => {
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
  
  // Confirmation Modal State
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

  const uniqueKeywords = useMemo(() => Array.from(new Set(topics.map(t => t.keyword || 'Unknown'))).filter(Boolean), [topics]);

  // Calculate counts for tabs
  const counts = useMemo(() => {
    return {
      pending: topics.filter(t => [TopicStatus.AI_APPROVED, TopicStatus.AI_REJECTED, TopicStatus.PENDING].includes(t.status)).length,
      approved: topics.filter(t => t.status === TopicStatus.HUMAN_APPROVED).length,
      rejected: topics.filter(t => t.status === TopicStatus.HUMAN_REJECTED).length,
    };
  }, [topics]);

  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      // Safe access using fallback values to prevent "undefined" errors
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
  }, [topics, searchTerm, activeTab, filterKeyword, filterProduct]);

  const getStatusBadge = (status: TopicStatus) => {
    switch (status) {
      case TopicStatus.AI_APPROVED:
        return <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800 flex items-center gap-1"><Brain className="w-3 h-3" /> AI Approved</span>;
      case TopicStatus.AI_REJECTED:
        return <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full text-xs font-semibold border border-red-200 dark:border-red-800 flex items-center gap-1"><Brain className="w-3 h-3" /> AI Rejected</span>;
      case TopicStatus.HUMAN_APPROVED:
        return <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800 flex items-center gap-1"><Check className="w-3 h-3" /> Approved</span>;
      case TopicStatus.HUMAN_REJECTED:
        return <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-600 flex items-center gap-1"><X className="w-3 h-3" /> Rejected</span>;
      case TopicStatus.CONTENT_GENERATED:
        // Changed to indigo (Brand Blue)
        return <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full text-xs font-semibold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"><FileText className="w-3 h-3" /> Content Ready</span>;
      default:
        return <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full text-xs font-semibold border border-yellow-200 dark:border-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  const handleGenerateContent = (topic: Topic) => {
    if (!contentWebhookUrl) {
        alert("Please configure the 'Content Generation Webhook URL' in Settings first.");
        return;
    }
    
    // If already generating this specific topic, do nothing
    if (contentGeneratingIds.includes(topic.id)) return;

    // Add to global persistent generating list
    addContentGeneratingId(topic.id);

    // Fire and forget - allow user to navigate away or queue others
    generateArticle(contentWebhookUrl, topic)
        .then((resultData) => {
            saveGeneratedContent(topic.id, resultData);
        })
        .catch((error: any) => {
            console.error(error);
            alert(`Failed to generate content for "${topic.title}": ${error.message}`);
        })
        .finally(() => {
            removeContentGeneratingId(topic.id);
        });
  };

  const initiateAction = (id: string, title: string, action: ActionType) => {
    if (isGenerating) return;
    
    // Reset reason input when opening modal
    setActionReason('');
    
    setModalState({
      isOpen: true,
      topicId: id,
      topicTitle: title,
      action: action,
    });
  };

  const confirmAction = () => {
    if (!modalState.topicId || !modalState.action) return;

    if (modalState.action === 'delete') {
      deleteTopic(modalState.topicId);
    } else if (modalState.action === 'reset') {
      updateTopicStatus(modalState.topicId, TopicStatus.PENDING);
    } else {
       // approve or reject
       const newStatus = modalState.action === 'approve' ? TopicStatus.HUMAN_APPROVED : TopicStatus.HUMAN_REJECTED;
       updateTopicStatus(modalState.topicId, newStatus);
       
       // Send feedback webhook
       if (feedbackWebhookUrl) {
           const topic = topics.find(t => t.id === modalState.topicId);
           if (topic) {
               const feedbackPayload = {
                   topic_id: topic.id,
                   topic_title: topic.title,
                   keyword: topic.keyword,
                   product: topic.product,
                   page_id: topic.pageId || '', // Include page ID
                   status: modalState.action === 'approve' ? 'APPROVED' : 'REJECTED',
                   reason: actionReason,
                   timestamp: new Date().toISOString()
               };
               sendFeedback(feedbackWebhookUrl, feedbackPayload);
           }
       }
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const getModalContent = () => {
    switch (modalState.action) {
        case 'approve':
            return {
                title: 'Approve Topic',
                message: `Are you sure you want to approve "${modalState.topicTitle}"? It will be moved to the Approved list.`,
                variant: 'success' as const,
                confirmLabel: 'Approve',
                showInput: true,
                inputPlaceholder: 'Why is this topic approved? (Optional)',
            };
        case 'reject':
            return {
                title: 'Reject Topic',
                message: `Are you sure you want to reject "${modalState.topicTitle}"? It will be moved to the Rejected list.`,
                variant: 'danger' as const,
                confirmLabel: 'Reject',
                showInput: true,
                inputPlaceholder: 'Why is this topic rejected? (Optional)',
            };
        case 'delete':
            return {
                title: 'Delete Topic',
                message: `Are you sure you want to permanently delete "${modalState.topicTitle}"? This action cannot be undone.`,
                variant: 'danger' as const,
                confirmLabel: 'Delete',
                showInput: false,
            };
        case 'reset':
             return {
                title: 'Reset to Pending',
                message: `Are you sure you want to move "${modalState.topicTitle}" back to Pending Review?`,
                variant: 'info' as const,
                confirmLabel: 'Reset',
                showInput: false,
            };
        default:
            return {
                title: 'Confirm Action',
                message: 'Are you sure?',
                variant: 'info' as const,
                confirmLabel: 'Confirm',
                showInput: false,
            };
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType; colorClass: string }[] = [
    { id: 'pending', label: 'Pending Review', icon: Clock, colorClass: 'indigo' },
    { id: 'approved', label: 'Approved', icon: CheckCircle2, colorClass: 'green' },
    { id: 'rejected', label: 'Rejected', icon: XCircle, colorClass: 'red' },
  ];

  const modalContent = getModalContent();

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Topic Results</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Validate topics and initiate content generation.</p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              disabled={isGenerating}
              placeholder="Search topics..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

           <div className="relative">
             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select 
              disabled={isGenerating}
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              className={`pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 cursor-pointer ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="all">All Keywords</option>
              {uniqueKeywords.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select 
              disabled={isGenerating}
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 cursor-pointer ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="all">All Products</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts[tab.id];
            
            const activeStyles = {
                indigo: 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20',
                green: 'border-green-500 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20',
                red: 'border-red-500 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20',
            };

            return (
                <button
                    key={tab.id}
                    disabled={isGenerating}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all
                        ${isActive 
                            ? activeStyles[tab.colorClass as keyof typeof activeStyles]
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }
                        ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : ''}`} />
                    {tab.label}
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                        isActive ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                        {count}
                    </span>
                </button>
            );
        })}
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredTopics.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed h-full flex flex-col items-center justify-center">
            <Info className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No topics found in this tab.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try changing filters or generate new topics.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {filteredTopics.map((topic: Topic) => {
                const isThisGenerating = contentGeneratingIds.includes(topic.id);
                
                return (
                <div key={topic.id} className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm transition-all hover:shadow-md flex flex-col group ${
                    topic.status === TopicStatus.AI_REJECTED && activeTab === 'pending' ? 'border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'
                } ${isGenerating ? 'opacity-70' : ''}`}>
                <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded truncate max-w-[150px] inline-block self-start">
                            {topic.keyword}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded truncate max-w-[150px] inline-block self-start">
                            {topic.product}
                        </span>
                    </div>
                    {getStatusBadge(topic.status)}
                    </div>
                    
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 leading-tight">
                    {topic.title}
                    </h3>

                    <div className="space-y-2 mb-4">
                        <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Angle: </span>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">{topic.angle}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Intent: </span>
                            <span className="text-gray-800 dark:text-gray-200">{topic.searchIntent}</span>
                        </div>
                    </div>

                    {/* Feedback Section */}
                    {(topic.aiReason || topic.whyRelevant) && (
                        <div className={`p-3 rounded-lg text-sm ${
                            topic.status === TopicStatus.AI_REJECTED 
                            ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200' 
                            : 'bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-300'
                        }`}>
                            <div className="flex items-start gap-2">
                                <Brain className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-70" />
                                <div>
                                    <span className="font-semibold block text-xs uppercase tracking-wider mb-0.5 opacity-80">AI Analysis</span>
                                    {topic.aiReason ? (
                                        <div className="whitespace-pre-line">{topic.aiReason}</div>
                                    ) : (
                                        <div>{topic.whyRelevant}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-750/50 rounded-b-xl flex justify-between items-center">
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(topic.createdAt).toLocaleDateString()}
                    </span>
                    
                    <div className="flex items-center gap-2">
                        {/* Delete Button (Available in all tabs) */}
                        <button 
                            type="button"
                            disabled={isGenerating}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                initiateAction(topic.id, topic.title, 'delete');
                            }}
                            className={`p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`}
                            title="Delete Topic"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        {(activeTab === 'pending' || activeTab === 'approved' || activeTab === 'rejected') && (
                             <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        )}

                        {/* Pending Tab Actions */}
                        {activeTab === 'pending' && (
                            <div className="flex gap-2">
                                <button 
                                    disabled={isGenerating}
                                    onClick={() => initiateAction(topic.id, topic.title, 'reject')}
                                    className={`px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    <ThumbsDown className="w-4 h-4" />
                                    Reject
                                </button>
                                <button 
                                    disabled={isGenerating}
                                    onClick={() => initiateAction(topic.id, topic.title, 'approve')}
                                    className={`px-3 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    Approve
                                </button>
                            </div>
                        )}

                        {/* Approved Tab Actions */}
                        {activeTab === 'approved' && (
                            <div className="flex gap-2">
                                <button 
                                    disabled={isGenerating}
                                    onClick={() => initiateAction(topic.id, topic.title, 'reset')}
                                    className={`text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2 ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`}
                                    title="Move back to Pending"
                                >
                                    <RotateCcw className="w-3 h-3" /> Undo
                                </button>
                                <button 
                                    disabled={isGenerating}
                                    onClick={() => initiateAction(topic.id, topic.title, 'reject')}
                                    className={`px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`}
                                    title="Move to Rejected"
                                >
                                    <ThumbsDown className="w-4 h-4" />
                                    Reject
                                </button>
                                
                                <button 
                                    onClick={() => handleGenerateContent(topic)}
                                    // Only disable if GLOBAL generator (Dashboard) is running, or this specific one is running.
                                    // We allow parallel content generation, so we don't block based on other contentIds.
                                    disabled={isThisGenerating || isGenerating}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${
                                        isThisGenerating || isGenerating
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-400 dark:text-indigo-500 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-indigo-200 dark:shadow-indigo-900/30'
                                    }`}
                                >
                                    {isThisGenerating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileText className="w-4 h-4" />
                                    )}
                                    {isThisGenerating ? 'Generating...' : 'Generate Article'}
                                </button>
                            </div>
                        )}

                        {/* Rejected Tab Actions */}
                        {activeTab === 'rejected' && (
                            <div className="flex gap-2">
                                <button 
                                    disabled={isGenerating}
                                    onClick={() => initiateAction(topic.id, topic.title, 'reset')}
                                    className={`text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2 ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`}
                                    title="Move back to Pending"
                                >
                                    <RotateCcw className="w-3 h-3" /> Undo
                                </button>
                                <button 
                                    disabled={isGenerating}
                                    onClick={() => initiateAction(topic.id, topic.title, 'approve')}
                                    className={`p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800 hover:text-green-600 dark:hover:text-green-300 rounded-lg transition-colors shadow-sm ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`}
                                    title="Move to Approved"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            );})}
            </div>
        )}

        <ConfirmationModal
            isOpen={modalState.isOpen}
            onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmAction}
            title={modalContent.title}
            message={modalContent.message}
            variant={modalContent.variant}
            confirmLabel={modalContent.confirmLabel}
            showInput={modalContent.showInput}
            inputValue={actionReason}
            onInputChange={setActionReason}
            inputPlaceholder={modalContent.inputPlaceholder}
        />
      </div>
    </div>
  );
};

export default Results;