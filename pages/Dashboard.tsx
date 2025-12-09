
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { sendToMake, mockGenerateTopics } from '../services/makeService';
import { Sparkles, Link, Tag, ShoppingBag, AlertCircle, CheckCircle2, Layers, MessageSquare, Anchor } from 'lucide-react';
import { Topic, TopicStatus, ContentType, GenerationRequest } from '../types';

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

  // Determine the product name from the ID for the API request
  const selectedProduct = availableProducts.find(p => p.id === selectedProductId) || availableProducts[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    setIsGenerating(true);

    // Basic Validation
    if (!selectedProductId) {
      setError('Product selection is required.');
      setIsLoading(false);
      setIsGenerating(false);
      return;
    }

    let requestData: GenerationRequest = {
      keyword: keyword, // Will be overridden or used depending on type
      product: selectedProduct.name,
      contentType,
      url, // Reference URL
      preferredAngles,
      unpreferredAngles,
    };

    if (contentType === 'Article') {
        if (!keyword) {
             setError('Target Keyword is required for Articles.');
             setIsLoading(false);
             setIsGenerating(false);
             return;
        }
    } else if (contentType === 'Socials Media') {
        if (!mainTopic || !targetAudience || !contentGoal) {
             setError('Main Topic, Audience, and Content Goal are required.');
             setIsLoading(false);
             setIsGenerating(false);
             return;
        }
        requestData = {
            ...requestData,
            keyword: mainTopic, // Map main topic to keyword as primary identifier
            mainTopic,
            platformType,
            targetAudience,
            contentGoal,
            toneVoice,
            callToAction,
            url // Reference Link
        };
    } else if (contentType === 'Backlinks Content') {
        if (!keyword || !anchorText || !destinationUrl) {
             setError('Target Keyword, Anchor Text, and Destination URL are required.');
             setIsLoading(false);
             setIsGenerating(false);
             return;
        }
        requestData = {
            ...requestData,
            anchorText,
            destinationUrl,
            backlinkPlatform,
            toneVoice,
            wordCount,
            linkPlacement,
            extraLinks,
            contentGoal, // Re-use contentGoal state if needed, or add separate one. User requested content goal for backlinks too.
            url // Reference URL
        };
    }

    try {
      // Use mock if no webhook set for demonstration, otherwise use real service
      const response = webhookUrl 
        ? await sendToMake(webhookUrl, requestData)
        : await mockGenerateTopics(requestData);

      console.log('Normalized Response:', response);

      if (response && Array.isArray(response.topics)) {
        const newTopics: Topic[] = response.topics.map((t: any) => {
          
          // --- ONE-SHOT DETECTION ---
          // Check if this result is already generated content (e.g. Social Media Post)
          const isSocialOneShot = contentType === 'Socials Media' && (t.post || t.socialPost || t.social_post || t.hook);
          
          // Map incoming status
          let status = TopicStatus.PENDING;
          if (t.status === '✅') status = TopicStatus.AI_APPROVED;
          if (t.status === '❌') status = TopicStatus.AI_REJECTED;
          
          // Force status to GENERATED if we received actual content
          if (isSocialOneShot) status = TopicStatus.CONTENT_GENERATED;

          const reasonStr = Array.isArray(t.reasons) ? t.reasons.join('\n') : (t.reasons || '');
          
          // Construct Generated Content Object immediately if it's a one-shot result
          let generatedContent = undefined;
          let validatorData = undefined;

          if (isSocialOneShot) {
             generatedContent = {
                 title: t.title || t.hook || 'Social Media Post',
                 h1: '',
                 slug: '',
                 sections: [],
                 faq: [],
                 focus_keyword: t.focus_keyword || requestData.keyword,
                 related_keywords: [],
                 seo_title: '',
                 meta_description: '',
                 content_html: '', // Will be handled by normalizeTopic fallback or constructed
                 featured_image: '',
                 // Map specific social fields
                 hook: t.hook,
                 socialPost: t.post || t.socialPost || t.social_post,
                 hashtags: t.hashtags,
                 callToAction: t.cta || t.call_to_action || t.callToAction
             };

             // Map Validator Data if present
             if (t.reasons || t.fix_suggestions || t.why_relevant || t.status) {
                 validatorData = {
                     validated_at: new Date().toISOString(),
                     result: {
                         status: t.status || 'completed', // Use mapped AI status (e.g. revisions_required) if available
                         summary: t.why_relevant || 'AI Generated',
                         reasons: Array.isArray(t.reasons) ? t.reasons : (t.reasons ? [t.reasons] : []),
                         recommendations: [],
                         fix_suggestions: t.fix_suggestions || [],
                         scores: { b2b_tone: 0, brand_alignment: 0, structure: 0, accuracy: 0, enterprise_relevance: 0 }
                     }
                 };
             }
          }

          return {
            id: generateId(),
            keyword: requestData.keyword,
            product: selectedProduct.name,
            pageId: selectedProduct.id,
            contentType: contentType,
            // Use hook as title for social media if title is missing
            title: t.title || (isSocialOneShot ? t.hook : t.topic) || 'Untitled Topic',
            angle: t.angle,
            searchIntent: t.search_intent || t.searchIntent,
            whyRelevant: t.why_relevant || t.whyRelevant,
            aiReason: reasonStr,
            status: status,
            createdAt: new Date().toISOString(),
            
            // Persist specific fields
            platformType,
            mainTopic,
            targetAudience,
            contentGoal,
            toneVoice,
            callToAction,
            anchorText,
            destinationUrl,
            wordCount,
            linkPlacement,
            extraLinks,
            backlinkPlatform,
            
            // Attach One-Shot Content
            generatedContent,
            validatorData
          };
        });

        addTopics(newTopics);
        setSuccess(true);
        // Do not clear form completely to allow rapid generation of similar requests
      } else {
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
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Generate Content Topics</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Select a content type and fill in the details to generate brand-aligned ideas.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-1 h-2 w-full"></div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Content Type Selection - Always Visible */}
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

                {/* Product Dropdown Selection - Always Visible */}
                <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <ShoppingBag className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" />
                        {contentType === 'Article' ? 'Product / Blog for' : 'Brand / Business / Product'}
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

            {/* --- ARTICLE FORM --- */}
            {contentType === 'Article' && (
                <div className="space-y-6 animate-fadeIn">
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
                    
                    {/* Reference URL */}
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

            {/* --- SOCIAL MEDIA FORM --- */}
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
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                             Main Topic / Product / Service
                             <span className="text-xs text-gray-500 font-normal block mt-1">What is the post about?</span>
                        </label>
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
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Target Audience
                                <span className="text-xs text-gray-500 font-normal block mt-1">Who is this post talking to?</span>
                            </label>
                            <input
                                type="text"
                                disabled={isLoading}
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Content Goal
                                <span className="text-xs text-gray-500 font-normal block mt-1">What outcome do you want?</span>
                            </label>
                            <input
                                type="text"
                                disabled={isLoading}
                                value={contentGoal}
                                onChange={(e) => setContentGoal(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Call to Action (Optional)
                            <span className="text-xs text-gray-500 font-normal block mt-1">What do you want the viewer to do?</span>
                        </label>
                        <input
                            type="text"
                            disabled={isLoading}
                            value={callToAction}
                            onChange={(e) => setCallToAction(e.target.value)}
                            className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Reference Link</label>
                        <input
                            type="url"
                            disabled={isLoading}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                     </div>
                </div>
            )}

            {/* --- BACKLINKS FORM --- */}
            {contentType === 'Backlinks Content' && (
                <div className="space-y-6 animate-fadeIn">
                     <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                             Target Keyword / Topic *
                             <span className="text-xs text-gray-500 font-normal block mt-1">What keyword are we trying to reinforce?</span>
                        </label>
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
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Anchor Text *
                                <span className="text-xs text-gray-500 font-normal block mt-1">Exact text that should be hyperlinked.</span>
                            </label>
                            <input
                                type="text"
                                disabled={isLoading}
                                value={anchorText}
                                onChange={(e) => setAnchorText(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Destination URL *
                                <span className="text-xs text-gray-500 font-normal block mt-1">Where the link should point.</span>
                            </label>
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
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Content Platform / Type</label>
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
                                <option>Business Directory</option>
                                <option>Profile Bio</option>
                                <option>Web 2.0</option>
                                <option>Press Release</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Tone</label>
                            <select
                                disabled={isLoading}
                                value={toneVoice}
                                onChange={(e) => setToneVoice(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option>Natural & conversational</option>
                                <option>Informative</option>
                                <option>Short & direct</option>
                                <option>Storytelling</option>
                            </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Link Placement</label>
                            <select
                                disabled={isLoading}
                                value={linkPlacement}
                                onChange={(e) => setLinkPlacement(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option>Insert naturally anywhere</option>
                                <option>First paragraph</option>
                                <option>Middle</option>
                                <option>Last paragraph</option>
                                <option>CTA at the end</option>
                            </select>
                        </div>
                         <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Content Goal
                            </label>
                            <select
                                disabled={isLoading}
                                value={contentGoal}
                                onChange={(e) => setContentGoal(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Select a Goal</option>
                                <option>Brand awareness</option>
                                <option>Topical authority</option>
                                <option>Traffic boosting</option>
                                <option>Local SEO relevance</option>
                                <option>Product mention</option>
                                <option>Supporting links for pillar content</option>
                            </select>
                         </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Word Count / Length</label>
                            <input
                                type="text"
                                disabled={isLoading}
                                value={wordCount}
                                onChange={(e) => setWordCount(e.target.value)}
                                placeholder="e.g. 100-200 words"
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Reference URL (Optional)</label>
                            <input
                                type="url"
                                disabled={isLoading}
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                         </div>
                     </div>

                     <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Extra Links (Optional)</label>
                        <input
                            type="text"
                            disabled={isLoading}
                            value={extraLinks}
                            onChange={(e) => setExtraLinks(e.target.value)}
                            placeholder="Other URLs to include..."
                            className="w-full p-4 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                     </div>
                </div>
            )}

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
                {/* Dynamic redirect link based on content type */}
                <button 
                    type="button"
                    onClick={() => {
                       if (contentType === 'Socials Media') onViewChange('social_generated');
                       else if (contentType === 'Backlinks Content') onViewChange('backlink_generated');
                       else onViewChange('results');
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
