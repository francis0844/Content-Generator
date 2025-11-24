import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Save, Database, Webhook, FileText, MessageSquare, Download, Upload, CheckSquare, Server, Share2, Send, Info, Layers, ArrowRight, CheckCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const { 
      webhookUrl, setWebhookUrl, 
      contentWebhookUrl, setContentWebhookUrl,
      feedbackWebhookUrl, setFeedbackWebhookUrl,
      syncWebhookUrl, setSyncWebhookUrl,
      articleReviewWebhookUrl, setArticleReviewWebhookUrl,
      draftingWebhookUrl, setDraftingWebhookUrl,
      exportData, importData
  } = useApp();

  const [saved, setSaved] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'integrations' | 'data'>('integrations');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        importData(content);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure external integrations and manage application data.</p>
        </div>
        
        {/* Settings Tabs */}
        <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto">
            <button
                onClick={() => setActiveTab('integrations')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'integrations'
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                Integrations
            </button>
            <button
                onClick={() => setActiveTab('data')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'data'
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                Data Management
            </button>
        </div>
      </div>

      {activeTab === 'integrations' && (
      <div className="space-y-8 animate-fadeIn">
        {/* Connection Status Indicator */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-green-200 dark:border-green-900 overflow-hidden">
             <div className="px-6 py-4 flex items-center gap-3">
                 <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                     <Database className="w-5 h-5" />
                 </div>
                 <div>
                     <h3 className="font-bold text-gray-900 dark:text-white text-sm">Database Connected</h3>
                     <p className="text-xs text-gray-500 dark:text-gray-400">
                         Permanently connected to Anchor Computer Software Database (Supabase).
                     </p>
                 </div>
                 <div className="ml-auto flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-bold px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-100 dark:border-green-800">
                     <CheckCircle className="w-3 h-3" /> Active
                 </div>
             </div>
        </div>

        {/* Topic Generator Webhook */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
                <Webhook className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Topic Generator Webhook</h3>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    This webhook triggers the initial topic ideation process. It receives keywords and product details and returns a list of candidate topics.
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Make.com Webhook URL</label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://hook.us2.make.com/..."
                            className="bg-white dark:bg-gray-750 flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <button 
                            onClick={() => handleSave('topic')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${saved === 'topic' ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white'}`}
                        >
                            {saved === 'topic' ? <CheckSquare className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved === 'topic' ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Content Generator Webhook */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Content Generator Webhook</h3>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    This webhook generates the full article content, including HTML body, SEO meta, and validation scores.
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Webhook URL</label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={contentWebhookUrl}
                            onChange={(e) => setContentWebhookUrl(e.target.value)}
                            placeholder="https://hook.us2.make.com/..."
                            className="bg-white dark:bg-gray-750 flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <button 
                            onClick={() => handleSave('content')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${saved === 'content' ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white'}`}
                        >
                            {saved === 'content' ? <CheckSquare className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved === 'content' ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Topic Feedback Webhook */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Topic Feedback Webhook</h3>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    This webhook is called when you Approve or Reject a topic in the "Pending Review" list. It sends the decision and reason back to your system.
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feedback Webhook URL</label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={feedbackWebhookUrl}
                            onChange={(e) => setFeedbackWebhookUrl(e.target.value)}
                            placeholder="https://hook.us2.make.com/..."
                            className="bg-white dark:bg-gray-750 flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <button 
                            onClick={() => handleSave('feedback')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${saved === 'feedback' ? 'bg-green-600 text-white' : 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500 text-white'}`}
                        >
                            {saved === 'feedback' ? <CheckSquare className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved === 'feedback' ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Article Review Webhook */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Article Review Webhook</h3>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    This webhook is called when you mark an article as <strong>Draft</strong> or <strong>Rejected</strong>.
                    <br/>
                    It sends the following payload: <code>Title</code>, <code>HTML Content</code>, and <code>Reason</code>.
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review Webhook URL</label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={articleReviewWebhookUrl}
                            onChange={(e) => setArticleReviewWebhookUrl(e.target.value)}
                            placeholder="https://hook.us2.make.com/..."
                            className="bg-white dark:bg-gray-750 flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <button 
                            onClick={() => handleSave('article_review')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${saved === 'article_review' ? 'bg-green-600 text-white' : 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white'}`}
                        >
                            {saved === 'article_review' ? <CheckSquare className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved === 'article_review' ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Drafting Webhook */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
                <Send className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Drafting Webhook</h3>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    This webhook is triggered <strong>concurrently</strong> with the Article Review Webhook when an article is <strong>Approved/Drafted</strong>.
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drafting Webhook URL</label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={draftingWebhookUrl}
                            onChange={(e) => setDraftingWebhookUrl(e.target.value)}
                            placeholder="https://hook.us2.make.com/..."
                            className="bg-white dark:bg-gray-750 flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <button 
                            onClick={() => handleSave('drafting')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${saved === 'drafting' ? 'bg-green-600 text-white' : 'bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white'}`}
                        >
                            {saved === 'drafting' ? <CheckSquare className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved === 'drafting' ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
      )}

      {activeTab === 'data' && (
      <div className="space-y-8 animate-fadeIn">
        {/* Sync / Load Database */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Database Setup & Sync</h3>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    The application is connected to your Supabase database.
                    Use the instructions below to ensure your database schema is correctly configured to store <strong>Generated Articles</strong>, <strong>Images</strong>, and <strong>Configuration</strong>.
                </p>
                
                {/* Database Setup Instructions */}
                <div className="mt-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                        <Server className="w-4 h-4" />
                        Supabase SQL Setup
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                             <Info className="w-4 h-4 mt-0.5 text-indigo-500" />
                             <p>
                                 The <code>data</code> column (JSONB) stores the entire topic object, including <strong>HTML Content</strong> and <strong>Featured Images</strong>. 
                                 You do not need separate columns for these fields. Run this script in your Supabase SQL Editor to fix permissions or missing tables.
                             </p>
                        </div>
                        <div className="bg-gray-800 text-gray-200 p-3 rounded-md font-mono text-xs overflow-x-auto border border-gray-700 relative">
                            <pre>{`-- 1. Topics Table (Stores Metadata + Generated HTML + Images)
CREATE TABLE IF NOT EXISTS topics (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and Grant Access
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON topics;
CREATE POLICY "Public Access" ON topics FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE topics TO anon;
GRANT ALL ON TABLE topics TO service_role;

-- 2. Configuration Table (Stores Angles)
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value jsonb
);

-- Enable RLS and Grant Access
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Config Access" ON app_config;
CREATE POLICY "Public Config Access" ON app_config FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE app_config TO anon;
GRANT ALL ON TABLE app_config TO service_role;`}</pre>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Legacy Sync Webhook URL (Optional)</label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={syncWebhookUrl}
                            onChange={(e) => setSyncWebhookUrl(e.target.value)}
                            placeholder="https://hook.us2.make.com/..."
                            className="bg-white dark:bg-gray-750 flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <button 
                            onClick={() => handleSave('sync')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${saved === 'sync' ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white'}`}
                        >
                            {saved === 'sync' ? <CheckSquare className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved === 'sync' ? 'Saved' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Manual Backup & Restore</h3>
            </div>
            <div className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Manually backup your data to a JSON file or restore from a previous backup.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={exportData}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors border border-gray-200 dark:border-gray-600"
                    >
                        <Download className="w-5 h-5" />
                        Export Data (JSON)
                    </button>
                    
                    <div className="relative">
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium transition-colors border border-indigo-200 dark:border-indigo-800 w-full"
                        >
                            <Upload className="w-5 h-5" />
                            Import Backup
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Settings;