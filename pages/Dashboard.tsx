import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { sendToMake, mockGenerateTopics } from '../services/makeService';
import { Sparkles, Link, Tag, ShoppingBag, AlertCircle, CheckCircle2, Layers, MessageSquare, Anchor, Beaker, Send } from 'lucide-react';
import { Topic, TopicStatus, ContentType, GenerationRequest } from '../types';

// Helper to find value by key recursively in the response object
const findValue = (obj: any, keys: string[]): any => {
    if (!obj || typeof obj !== 'object') return undefined;
    
    // Check top level first
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    }
    
    // Check case-insensitive top level (and stripped of underscores)
    const normalizedKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (const key in obj) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedKeys.includes(normalizedKey)) {
             if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
        }
    }

    // Recursive search
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            const found = findValue(obj[key], keys);
            if (found !== undefined) return found;
        }
    }
    return undefined;
};

// Helper to extract a string URL from a potential object/string image result
const extractUrl = (val: any): string => {
    if (!val) return '';
    let url = '';
    if (typeof val === 'string') url = val.trim();
    if (typeof val === 'object') {
        // Common patterns for image objects
        url = val.url || val.src || val.link || val.href || val.image || val.img || val.secure_url || val.uri || '';
    }
    
    // Validate it looks like a URL to avoid garbage data
    if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
        return url;
    }
    return '';
};

const Dashboard: React.FC<{ onViewChange: (view: string) => void }> = ({ onViewChange }) => {
  const { webhookUrl, preferredAngles, unpreferredAngles, addTopics, generateId, setWebhookUrl, setIsGenerating, availableProducts } = useApp();
  
  // Core Fields
  const [contentType, setContentType] = useState<ContentType>('Article');
  const [selectedProductId, setSelectedProductId] = useState(availableProducts[0]?.id || '');
  const [keyword, setKeyword] = useState('');
  const [url, setUrl] = useState('');

  // Social Media Specific Fields
  const [platformType, setPlatformType] = useState('Facebook');
  const [mainTopic, setMainTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [contentGoal, setContentGoal] = useState('');
  const [toneVoice, setToneVoice] = useState('Professional & informative');
  const [callToAction, setCallToAction] = useState('');

  // Backlinks Specific Fields
  const [anchorText, setAnchorText] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [backlinkPlatform, setBacklinkPlatform] = useState('Blog Comment');
  const [wordCount, setWordCount] = useState('');
  const [linkPlacement, setLinkPlacement] = useState('Insert naturally anywhere');
  const [extraLinks, setExtraLinks] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedProduct = availableProducts.find(p => p.id === selectedProductId) || availableProducts[0];

  const fillSampleData = () => {
    setError(null);
    setSuccess(false);

    if (contentType === 'Article') {
      setSelectedProductId('0dskgf4RySGKRr4APbED'); // MaxCASS OS
      setKeyword('Benefits of CASS certified address validation');
      setUrl('https://anchorcomputersoftware.com/data-quality/address-quality');
    } else if (contentType === 'Socials Media') {
      setSelectedProductId('9a3FIX1pdkR8f0H79lPX'); // MaxMover
      setPlatformType('LinkedIn');
      setToneVoice('Professional & informative');
      setMainTopic('How NCOA processing saves mailing costs for enterprise businesses');
      setTargetAudience('Marketing directors and non-profit operations managers');
      setContentGoal('Drive demo requests for MaxMover NCOA software');
      setCallToAction('Schedule a free data audit today');
      setUrl('https://anchorcomputersoftware.com/mailing-software/maxmover');
    } else if (contentType === 'Backlinks Content') {
      setSelectedProductId('UBiUitsu7XBKkIYSZvc7'); // MaxDup
      setKeyword('Enterprise data deduplication software');
      setAnchorText('data deduplication experts');
      setDestinationUrl('https://anchorcomputersoftware.com/data-quality/deduplication');
      setBacklinkPlatform('Forum Post');
      setToneVoice('Informative');
      setWordCount('150 words');
      setLinkPlacement('Insert naturally anywhere');
      setContentGoal('Topical authority for data quality management');
      setUrl('https://anchorcomputersoftware.com/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    setIsGenerating(true);

    if (!selectedProductId) {
      setError('Product selection is required.');
      setIsLoading(false);
      setIsGenerating(false);
      return;
    }

    let requestData: GenerationRequest = {
      keyword: keyword,
      product: selectedProduct.name,
      contentType,
      url,
      preferredAngles,
      unpreferredAngles,
    };

    // Specific field construction based on type
    if (contentType === 'Socials Media') {
        if (!mainTopic || !targetAudience || !contentGoal) {
             setError('Main Topic, Audience, and Content Goal are required.');
             setIsLoading(false);
             setIsGenerating(false);
             return;
        }
        requestData = { ...requestData, keyword: mainTopic, mainTopic, platformType, targetAudience, contentGoal, toneVoice, callToAction };
    } else if (contentType === 'Backlinks Content') {
        if (!keyword || !anchorText || !destinationUrl) {
             setError('Target Keyword, Anchor Text, and Destination URL are required.');
             setIsLoading(false);
             setIsGenerating(false);
             return;
        }
        requestData = { ...requestData, anchorText, destinationUrl, backlinkPlatform, toneVoice, wordCount, linkPlacement, contentGoal };
    }

    try {
      const response = webhookUrl 
        ? await sendToMake(webhookUrl, requestData)
        : await mockGenerateTopics(requestData);

      if (response && Array.isArray(response.topics)) {
        const newTopics: Topic[] = response.topics.map((t: any) => {
          // Identify if this is a one-shot generation (Social or Backlink)
          const isSocialOneShot = contentType === 'Socials Media';
          const isBacklink = contentType === 'Backlinks Content';
          
          let status = TopicStatus.PENDING;
          if (t.status === '✅') status = TopicStatus.AI_APPROVED;
          if (t.status === '❌') status = TopicStatus.AI_REJECTED;
          
          // Force direct to library for Social and Backlinks
          if (isSocialOneShot || isBacklink) status = TopicStatus.CONTENT_GENERATED;

          let generatedContent = undefined;
          
          // Aggressive Scavenging for content
          const foundPost = findValue(t, [
              'post', 'socialPost', 'social_post', 'content', 'body', 'copy', 'message', 'text', 'post_content', 'social_copy', 
              'caption', 'description', 'social_media_post', 'linkedin_post', 'facebook_post', 'tweet'
          ]);
          
          // Iterative search for image to ensure we find a valid URL
          const imageKeys = [
              'image_data', 'image', 'featured_image', 'img_url', 'image_url', 'picture', 'thumbnail', 'asset', 'media', 
              'photo', 'file', 'attachment', 'imageUrl', 'img', 'generated_image'
          ];
          
          let foundImage = '';
          for (const key of imageKeys) {
              const val = findValue(t, [key]); // Search for one key at a time
              const url = extractUrl(val);
              if (url) {
                  foundImage = url;
                  break;
              }
          }
          
          const foundHook = findValue(t, ['hook', 'headline', 'opening', 'title', 'header', 'social_hook']);
          const foundHashtags = findValue(t, ['hashtags', 'tags']);
          const foundCTA = findValue(t, ['cta', 'call_to_action', 'callToAction', 'action']);
          const foundHTML = findValue(t, ['article', 'content_html', 'html_content', 'html', 'body']);

          if (isSocialOneShot || isBacklink) {
             generatedContent = {
                 title: t.title || foundHook || (isBacklink ? `${anchorText}` : 'Generated Content'),
                 h1: '', slug: '', sections: [], faq: [],
                 focus_keyword: t.focus_keyword || requestData.keyword,
                 related_keywords: [],
                 seo_title: '', meta_description: '',
                 
                 // For Social, use foundPost as html content fallback
                 content_html: foundHTML || foundPost || '',
                 featured_image: foundImage || '',
                 hook: foundHook,
                 socialPost: foundPost,
                 hashtags: foundHashtags,
                 callToAction: foundCTA
             };
          }

          return {
            id: generateId(),
            keyword: requestData.keyword || keyword,
            product: selectedProduct.name,
            pageId: selectedProduct.id,
            contentType: contentType,
            title: t.title || foundHook || (isBacklink ? `${anchorText}` : 'Untitled Topic'),
            angle: t.angle,
            searchIntent: t.search_intent || t.searchIntent,
            whyRelevant: t.why_relevant || t.whyRelevant,
            aiReason: Array.isArray(t.reasons) ? t.reasons.join('\n') : (t.reasons || ''),
            status: status,
            createdAt: new Date().toISOString(),
            img_url: foundImage, // Populate top level as well
            platformType: platformType,
            mainTopic: mainTopic,
            targetAudience: targetAudience,
            contentGoal: contentGoal,
            toneVoice: toneVoice,
            callToAction: callToAction,
            anchorText: anchorText,
            destinationUrl: destinationUrl,
            wordCount: wordCount,
            linkPlacement: linkPlacement,
            backlinkPlatform: backlinkPlatform,
            generatedContent,
            documentUrl: t.document_url || t.documentUrl
          };
        });

        addTopics(newTopics);
        setSuccess(true);
      } else {
        setError(`Response from server was malformed or empty.`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center py-6 md:py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10 flex flex-col items-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Generate Content Topics</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl">
            Select a content type and fill in the details to generate brand-aligned ideas.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-1 h-2 w-full flex justify-end px-4"></div>
          
          <div className="px-8 pt-6 flex justify-end">
              <button
                type="button"
                onClick={fillSampleData}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-sm uppercase tracking-wider"
              >
                <Beaker className="w-3.5 h-3.5" />
                Fill Sample Data
              </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <Layers className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" />
                        Content Type
                    </label>
                    <div className="relative">
                        <select
                            disabled={isLoading}
                            value={contentType}
                            onChange={(e) => setContentType(e.target.value as ContentType)}
                            className={`w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 appearance-none cursor-pointer ${isLoading ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-500' : ''}`}
                        >
                            <option value="Article">Article</option>
                            <option value="Socials Media">Socials Media</option>
                            <option value="Backlinks Content">Backlinks Content</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <ShoppingBag className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" />
                        Product / Business
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
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4"></div>

            {contentType === 'Article' && (
                <div className="space-y-6 animate-fadeIn">
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
                </div>
            )}

            {contentType === 'Socials Media' && (
                <div className="space-y-6 animate-fadeIn">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Platform Type</label>
                            <select
                                disabled={isLoading}
                                value={platformType}
                                onChange={(e) => setPlatformType(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option>Facebook</option>
                                <option>Instagram</option>
                                <option>LinkedIn</option>
                                <option>X (Twitter)</option>
                                <option>Pinterest</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Tone & Voice</label>
                            <select
                                disabled={isLoading}
                                value={toneVoice}
                                onChange={(e) => setToneVoice(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option>Professional & informative</option>
                                <option>Funny & casual</option>
                                <option>Motivational & inspiring</option>
                                <option>Storytelling & emotional</option>
                            </select>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Main Topic / Context</label>
                        <input
                            type="text"
                            disabled={isLoading}
                            value={mainTopic}
                            onChange={(e) => setMainTopic(e.target.value)}
                            className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Target Audience</label>
                            <input
                                type="text"
                                disabled={isLoading}
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Content Goal</label>
                            <input
                                type="text"
                                disabled={isLoading}
                                value={contentGoal}
                                onChange={(e) => setContentGoal(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </div>
                </div>
            )}

            {contentType === 'Backlinks Content' && (
                <div className="space-y-6 animate-fadeIn">
                     <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Target Keyword / Topic *</label>
                        <input
                            type="text"
                            disabled={isLoading}
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Anchor Text *</label>
                            <input
                                type="text"
                                disabled={isLoading}
                                value={anchorText}
                                onChange={(e) => setAnchorText(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Destination URL *</label>
                            <input
                                type="url"
                                disabled={isLoading}
                                value={destinationUrl}
                                onChange={(e) => setDestinationUrl(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Content Platform</label>
                            <select
                                disabled={isLoading}
                                value={backlinkPlatform}
                                onChange={(e) => setBacklinkPlatform(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option>Blog Comment</option>
                                <option>Forum Post</option>
                                <option>Social Media Post</option>
                                <option>PR Article</option>
                                <option>Quora Answer</option>
                                <option>Reddit Comment</option>
                                <option>Guest Post</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Goal</label>
                            <input
                                type="text"
                                disabled={isLoading}
                                value={contentGoal}
                                onChange={(e) => setContentGoal(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </div>
                </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-start text-sm border border-red-100 dark:border-red-900/30">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span className="break-words font-medium">{error}</span>
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
                    onClick={() => {
                       if (contentType === 'Socials Media') onViewChange('social_generated');
                       else if (contentType === 'Backlinks Content') onViewChange('backlink_generated');
                       else onViewChange('article_results');
                    }}
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
                  : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500'
              }`}
            >
              {isLoading ? 'Generating...' : 'Generate Content'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;