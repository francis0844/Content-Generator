import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { sendToMake, mockGenerateTopics } from '../services/makeService';
import { Sparkles, Link, Tag, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Topic, TopicStatus } from '../types';

const Dashboard: React.FC<{ onViewChange: (view: string) => void }> = ({ onViewChange }) => {
  const { webhookUrl, preferredAngles, unpreferredAngles, addTopics, generateId, setWebhookUrl, setIsGenerating, availableProducts } = useApp();
  
  const [keyword, setKeyword] = useState('');
  // Store the ID of the selected product
  const [selectedProductId, setSelectedProductId] = useState(availableProducts[0]?.id || '');
  
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Determine the product name from the ID for the API request
  const selectedProduct = availableProducts.find(p => p.id === selectedProductId) || availableProducts[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    setIsGenerating(true);

    if (!keyword || !selectedProductId) {
      setError('Keyword and Product are required.');
      setIsLoading(false);
      setIsGenerating(false);
      return;
    }

    const requestData = {
      keyword,
      product: selectedProduct.name, // Send name to AI
      url,
      preferredAngles,
      unpreferredAngles,
    };

    try {
      // Use mock if no webhook set for demonstration, otherwise use real service
      const response = webhookUrl 
        ? await sendToMake(webhookUrl, requestData)
        : await mockGenerateTopics(requestData);

      console.log('Normalized Response:', response);

      if (response && Array.isArray(response.topics)) {
        const newTopics: Topic[] = response.topics.map(t => {
          // Map incoming status if present, otherwise default to PENDING
          let status = TopicStatus.PENDING;
          if (t.status === '✅') status = TopicStatus.AI_APPROVED;
          if (t.status === '❌') status = TopicStatus.AI_REJECTED;

          // Handle reasons (can be string or array)
          const reasonStr = Array.isArray(t.reasons) 
            ? t.reasons.join('\n') 
            : (t.reasons || '');

          return {
            id: generateId(),
            keyword: keyword,
            product: selectedProduct.name,
            pageId: selectedProduct.id, // Attach the page ID
            title: t.title || t.topic || 'Untitled Topic', // Support both keys
            angle: t.angle,
            searchIntent: t.search_intent,
            whyRelevant: t.why_relevant,
            aiReason: reasonStr,
            status: status,
            createdAt: new Date().toISOString(),
          };
        });

        addTopics(newTopics);
        setSuccess(true);
        // Reset form slightly but keep context
        setKeyword('');
      } else {
        // If we got a successful response object but it has no 'topics' array
        console.warn("Response missing topics:", response);
        setError(`Response received but missing 'topics' or 'results' list. Got keys: ${Object.keys(response || {}).join(', ')}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Generate Enterprise Content</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Enter your target keyword and select a product to generate high-quality, brand-aligned B2B topics.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-1 h-2 w-full"></div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Keyword Input */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Tag className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" />
                Target Keyword *
              </label>
              <input
                type="text"
                disabled={isLoading}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. 'address validation software'"
                className={`w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${isLoading ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-500' : ''}`}
              />
            </div>

            {/* Product Dropdown Selection */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                <ShoppingBag className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" />
                Product / Blog for *
              </label>
              <div className="relative">
                <select
                    disabled={isLoading}
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className={`w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 appearance-none cursor-pointer ${isLoading ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-500' : ''}`}
                >
                    {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Link className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" />
                Reference URL (Optional)
              </label>
              <input
                type="url"
                disabled={isLoading}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className={`w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${isLoading ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-500' : ''}`}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex flex-col items-start text-sm gap-2 animate-fadeIn border border-red-100 dark:border-red-900/30">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="break-words font-medium">{error}</span>
                </div>
                
                {/* Fallback Action for Webhook Errors */}
                {(error.includes('Make.com') || error.includes('Failed to fetch')) && (
                  <div className="pl-7 w-full">
                    <button 
                      type="button"
                      onClick={() => {
                        setWebhookUrl('');
                        setError(null);
                        alert('Switched to Simulation Mode. You can reconnect your webhook in Settings.');
                      }}
                      className="text-xs bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm font-medium w-full sm:w-auto"
                    >
                      Disconnect Webhook & Use Simulation Mode
                    </button>
                  </div>
                )}
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg flex items-center text-sm justify-between border border-green-100 dark:border-green-900/30">
                <div className="flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
                    Topics generated successfully!
                </div>
                <button 
                    type="button"
                    onClick={() => onViewChange('results')}
                    className="text-green-700 dark:text-green-300 font-semibold hover:underline"
                >
                    View Results &rarr;
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform hover:-translate-y-1 flex items-center justify-center ${
                isLoading
                  ? 'bg-indigo-400 dark:bg-indigo-600 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 hover:shadow-indigo-200 dark:hover:shadow-indigo-900/30'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Topics
                </>
              )}
            </button>
          </form>
          <div className="bg-gray-50 dark:bg-gray-850 px-8 py-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
            <span>Powered by Make.com & Gemini AI</span>
            <span>{webhookUrl ? 'Webhook Connected' : 'Simulation Mode'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;