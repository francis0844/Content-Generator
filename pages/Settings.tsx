import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Save, Database, Webhook, FileText, MessageSquare, Download, Upload, CheckSquare, Server, Share2, Send, Info, Layers, ArrowRight, Cloud } from 'lucide-react';

const Settings: React.FC = () => {
  const { 
      webhookUrl, setWebhookUrl, 
      contentWebhookUrl, setContentWebhookUrl,
      feedbackWebhookUrl, setFeedbackWebhookUrl,
      syncWebhookUrl, setSyncWebhookUrl,
      articleReviewWebhookUrl, setArticleReviewWebhookUrl,
      draftingWebhookUrl, setDraftingWebhookUrl,
      vercelKvUrl, setVercelKvUrl,
      vercelKvToken, setVercelKvToken,
      supabaseUrl, setSupabaseUrl,
      supabaseKey, setSupabaseKey,
      exportData, importData
  } = useApp();

  const [saved, setSaved] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'integrations' | 'data' | 'cloud'>('integrations');
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
                onClick={() => setActiveTab('cloud')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'cloud'
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                Cloud Database
            </button>
            <button
                onClick={() => setActiveTab('data')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'data'
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                Backup & Restore
            </button>
        </div>
      </div>

      {activeTab === 'integrations' && (
      <div className="space-y-8 animate-fadeIn">
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

      {activeTab === 'cloud' && (
      <div className="space-y-8 animate-fadeIn">
        {/* Supabase Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Supabase (PostgreSQL)</h3>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connect your Supabase database to persist topics in real-time. This is the recommended database for this application.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supabase URL</label>
                        <input
                            type="text"
                            value={supabaseUrl}
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            placeholder="https://your-project-id.supabase.co"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-750"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supabase Anon Key</label>
                        <input
                            type="password"
                            value={supabaseKey}
                            onChange={(e) => setSupabaseKey(e.target.value)}
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-750"
                        />
                    </div>
                    <div className="pt-2">
                        <button 
                            onClick={() => handleSave('supabase')}
                            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${saved === 'supabase' ? 'bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 text-white'}`}
                        >
                            {saved === 'supabase' ? <CheckSquare className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved === 'supabase' ? 'Save Credentials' : 'Save Credentials'}
                        </button>
                    </div>
                </div>

                {/* Database Setup Instructions */}
                <div className="mt-6 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                        <Server className="w-4 h-4" />
                        Database Setup Guide
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Run the following SQL in your Supabase SQL Editor to create the table and fix permission errors (42501):
                    </p>
                    <div className="bg-gray-800 text-gray-200 p-3 rounded-md font-mono text-xs overflow-x-auto border border-gray-700 relative">
                        <pre>{`-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS topics (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- 3. Reset Policy (Prevents 'policy exists' errors)
DROP POLICY IF EXISTS "Public Access" ON topics;

-- 4. Create Permissive Policy for this App
CREATE POLICY "Public Access" ON topics
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Grant Explicit Permissions (Fixes 42501 Error)
GRANT ALL ON TABLE topics TO anon;
GRANT ALL ON TABLE topics TO authenticated;
GRANT ALL ON TABLE topics TO service_role;`}</pre>
                    </div>
                </div>
            </div>
        </div>

        {/* Vercel KV (Legacy) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden opacity-80">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-600 dark:text-gray-300">Vercel KV (Legacy / Backup)</h3>
            </div>
            <div className="p-6 space-y-4">
                 <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Alternative storage method if Supabase is not available.
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KV REST API URL</label>
                        <input
                            type="text"
                            value={vercelKvUrl}
                            onChange={(e) => setVercelKvUrl(e.target.value)}
                            placeholder="https://...upstash.io"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-750"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KV REST API Token</label>
                        <input
                            type="password"
                            value={vercelKvToken}
                            onChange={(e) => setVercelKvToken(e.target.value)}
                            placeholder="Ad2s..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-750"
                        />
                    </div>
                    <div className="pt-2">
                        <button 
                            onClick={() => handleSave('vercel_kv')}
                            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${saved === 'vercel_kv' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-white'}`}
                        >
                            {saved === 'vercel_kv' ? <CheckSquare className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved === 'vercel_kv' ? 'Save Credentials' : 'Save Credentials'}
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
                <h3 className="font-semibold text-gray-800 dark:text-white">Sync / Load Database (Legacy)</h3>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    If you are not using Cloud Storage (Supabase/Vercel), you can sync from a generic JSON webhook.
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sync Webhook URL</label>
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

                {/* Make.com Setup Instructions */}
                <div className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30 p-5">
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4" />
                        How to setup the Make.com Scenario
                    </h4>
                    <div className="space-y-4 text-xs text-indigo-800 dark:text-indigo-300">
                        <div className="flex items-start gap-3">
                            <div className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">1</div>
                            <div>
                                <strong>Custom Webhook:</strong> Create a new scenario starting with a Custom Webhook. Copy the URL and paste it above.
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-indigo-300 dark:text-indigo-600 rotate-90" />
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">2</div>
                            <div>
                                <strong>Get Data:</strong> Add a module to fetch your data (e.g., <em>Google Sheets: Search Rows</em>, <em>Airtable: Search Records</em>, or <em>Data Store: Search</em>). Remove any limits to fetch all rows.
                            </div>
                        </div>

                        <div className="flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-indigo-300 dark:text-indigo-600 rotate-90" />
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">3</div>
                            <div>
                                <strong>Array Aggregator:</strong> Add this Tool immediately after your search module.
                                <ul className="list-disc list-inside mt-1 ml-1 opacity-80">
                                    <li><strong>Source Module:</strong> Select your Search module.</li>
                                    <li><strong>Target Structure:</strong> Custom.</li>
                                    <li><strong>Fields:</strong> Map your columns (e.g., <code>id</code>, <code>title</code>, <code>keyword</code>, <code>product</code>, <code>status</code>, <code>html_content</code>).</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-indigo-300 dark:text-indigo-600 rotate-90" />
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">4</div>
                            <div>
                                <strong>Webhook Response:</strong> Add this as the final module.
                                <ul className="list-disc list-inside mt-1 ml-1 opacity-80">
                                    <li><strong>Status:</strong> 200</li>
                                    <li><strong>Body:</strong> Drag the <code>Array[]</code> output from the Aggregator here.</li>
                                    <li><strong>Custom Headers:</strong> Add Key: <code>Content-Type</code>, Value: <code>application/json</code>.</li>
                                </ul>
                            </div>
                        </div>
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