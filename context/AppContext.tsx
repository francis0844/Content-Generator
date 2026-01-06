import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { Topic, TopicStatus, GeneratedContentData, ValidatorData, ProductDef, ContentSection, ContentType } from '../types';
import { fetchExternalData } from '../services/makeService';
import { fetchSupabaseTopics, saveSupabaseTopic, deleteSupabaseTopic, fetchAppConfig, saveAppConfig } from '../services/supabaseService';

export const PRODUCTS: ProductDef[] = [
  { name: 'MaxDup', id: 'UBiUitsu7XBKkIYSZvc7' },
  { name: 'MaxMover', id: '9a3FIX1pdkR8f0H79lPX' },
  { name: 'MaxPresort', id: 'FnCvK0HT5dwIH8e2CDRV' },
  { name: 'MaxCASS OS', id: '0dskgf4RySGKRr4APbED' }
];

type Theme = 'light' | 'dark';

interface AppContextType {
  topics: Topic[];
  addTopics: (newTopics: Topic[]) => void;
  updateTopicStatus: (id: string, status: TopicStatus) => void;
  saveGeneratedContent: (id: string, data: any) => void;
  deleteTopic: (id: string) => void;
  preferredAngles: string[];
  unpreferredAngles: string[];
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
  contentWebhookUrl: string;
  setContentWebhookUrl: (url: string) => void;
  feedbackWebhookUrl: string;
  setFeedbackWebhookUrl: (url: string) => void;
  syncWebhookUrl: string;
  setSyncWebhookUrl: (url: string) => void;
  articleReviewWebhookUrl: string;
  setArticleReviewWebhookUrl: (url: string) => void;
  draftingWebhookUrl: string;
  setDraftingWebhookUrl: (url: string) => void;
  socialReviewWebhookUrl: string;
  setSocialReviewWebhookUrl: (url: string) => void;
  addAngle: (type: 'preferred' | 'unpreferred', angle: string) => void;
  removeAngle: (type: 'preferred' | 'unpreferred', angle: string) => void;
  generateId: () => string;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  contentGeneratingIds: string[];
  addContentGeneratingId: (id: string) => void;
  removeContentGeneratingId: (id: string) => void;
  syncTopics: () => Promise<void>;
  exportData: () => void;
  importData: (jsonData: string) => void;
  availableProducts: ProductDef[];
  theme: Theme;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const robustParse = (value: any) => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch (e) {
        let clean = value.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        try { return JSON.parse(clean); } catch (e2) { return value; }
    }
};

const cleanString = (val: any): string => {
    if (typeof val !== 'string') return '';
    let clean = val.trim().replace(/^["']|["']$/g, '').trim();
    if (clean.startsWith('(') && clean.endsWith(')')) clean = clean.substring(1, clean.length - 1);
    const mdMatch = clean.match(/!?\[.*?\]\((https?:\/\/[^)]+)\)/);
    if (mdMatch && mdMatch[1]) return mdMatch[1];
    return clean;
};

const parseScore = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Matches "8", "8.5", "8/10", "Score: 8"
        const match = val.match(/(\d+(\.\d+)?)/);
        if (match) return parseFloat(match[1]);
    }
    return 0;
};

// Pure Deep Search - Recursive with Array support
const findValueByKey = (obj: any, targetKey: string, depth = 0): any => {
    if (!obj || typeof obj !== 'object' || depth > 12) return undefined;
    
    const normalizedTarget = targetKey.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check direct properties first
    for (const key in obj) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedKey === normalizedTarget) {
            const val = obj[key];
            if (val !== undefined && val !== null && val !== '') return val;
        }
    }

    // Recursive deep search (including arrays)
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findValueByKey(item, targetKey, depth + 1);
            if (found !== undefined) return found;
        }
    } else {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                const found = findValueByKey(obj[key], targetKey, depth + 1);
                if (found !== undefined) return found;
            }
        }
    }
    return undefined;
};

// Helper to find first string match among candidates
const getString = (obj: any, ...candidates: string[]): string => {
    for (const key of candidates) {
        const val = findValueByKey(obj, key);
        if (val && typeof val === 'string' && val.trim().length > 0) return val;
        if (val !== undefined && val !== null && typeof val === 'number') return String(val);
    }
    return '';
};

// Helper to find first object match (or string parsable to object)
const getObject = (obj: any, ...candidates: string[]): any => {
    for (const key of candidates) {
        const val = findValueByKey(obj, key);
        if (val && typeof val === 'object') return val;
        if (val && typeof val === 'string') {
             try { 
                 const parsed = robustParse(val);
                 if (typeof parsed === 'object') return parsed;
             } catch(e) {}
        }
    }
    return undefined;
};

// Helper to extract image URL from string or object
const extractImageUrl = (val: any): string => {
    if (!val) return '';
    let url = '';
    if (typeof val === 'string') url = cleanString(val);
    else if (typeof val === 'object') {
        url = cleanString(val.url || val.src || val.link || val.href || val.image || val.img || val.secure_url || val.uri || '');
    }
    
    // Strict Validation: Must look like a URL to be accepted as an image
    if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
        return url;
    }
    return '';
};

const normalizeTopic = (t: any): Topic => {
  const id = t.id ? String(t.id) : generateId();
  
  // Explicit check for social media hook as title fallback
  const scavengedTitle = getString(t, 'title', 'topic', 'hook', 'headline', 'header', 'social_hook');

  // Existing generated content
  const ex = t.generatedContent || {};

  // Resolve logic: Prioritize fresh data found in t (top level or nested)
  const resolve = (key: string, ...aliases: string[]) => {
     // 1. Try finding flat string match
     const fresh = getString(t, key, ...aliases);
     if (fresh) return fresh;

     // 2. Try looking into common containers if specific keys are requested (SEO)
     if (['seo_title', 'meta_description', 'slug'].includes(key)) {
         const seoObj = getObject(t, 'seo', 'meta', 'metadata', 'seo_metadata');
         if (seoObj) {
             if (key === 'seo_title') return getString(seoObj, 'title', 'seo_title', 'meta_title');
             if (key === 'meta_description') return getString(seoObj, 'description', 'meta_description', 'desc');
             if (key === 'slug') return getString(seoObj, 'slug', 'permalink', 'url');
         }
     }

     // Fallback to existing if string is valid
     if (ex[key] && typeof ex[key] === 'string' && ex[key].length > 0) return ex[key];
     
     return '';
  };
  
  // Scavenge Image Logic - Iterative Search
  let foundImage = '';
  const imageKeys = [
      'image_data', 'featured_image', 'featured_image', 'img_url', 'image', 'thumbnail', 'post_image', 
      'pic', 'feature_image', 'image_url', 'picture', 'asset', 'media', 'generated_image', 'file'
  ];
  
  for (const key of imageKeys) {
      const val = findValueByKey(t, key); // Search deeply for this specific key
      const extracted = extractImageUrl(val);
      if (extracted) {
          foundImage = extracted;
          break; // Stop once we find a valid URL
      }
  }
  
  // Fallbacks
  if (!foundImage && ex.featured_image) foundImage = ex.featured_image;
  if (!foundImage && t.img_url && extractImageUrl(t.img_url)) foundImage = t.img_url;

  // Scavenge and initialize generatedContent using robust aliases
  let generatedContent: GeneratedContentData = {
    title: resolve('title', 'title', 'headline') || scavengedTitle || t.keyword || 'Untitled Topic',
    h1: resolve('h1', 'h1', 'headline'),
    slug: resolve('slug', 'slug', 'url_slug', 'permalink', 'path', 'uri', 'permlink'),
    sections: Array.isArray(ex.sections) ? ex.sections : (Array.isArray(findValueByKey(t, 'sections')) ? findValueByKey(t, 'sections') : []),
    faq: Array.isArray(ex.faq) ? ex.faq : (Array.isArray(findValueByKey(t, 'faq')) ? findValueByKey(t, 'faq') : []),
    focus_keyword: resolve('focus_keyword', 'focus_keyword', 'keyword', 'topic', 'primary_keyword'),
    related_keywords: Array.isArray(ex.related_keywords) ? ex.related_keywords : (Array.isArray(findValueByKey(t, 'related_keywords')) ? findValueByKey(t, 'related_keywords') : []),
    seo_title: resolve('seo_title', 'seo_title', 'meta_title', 'title_tag', 'seo_meta_title', 'seotitle', 'metatitle'),
    meta_description: resolve('meta_description', 'meta_description', 'meta_desc', 'description', 'seo_description', 'search_description', 'meta_d', 'metadescription'),
    content_html: resolve('content_html', 'content_html', 'html_content', 'article', 'body', 'post_body', 'content', 'html', 'full_content', 'article_body', 'text'),
    featured_image: foundImage,
    socialPost: resolve('socialPost', 'socialPost', 'social_post', 'post', 'content', 'caption', 'social_caption', 'copy', 'message', 'body', 'text', 'post_content', 'social_copy', 'social_media_post', 'description'),
    hook: resolve('hook', 'hook', 'social_hook', 'headline', 'opening'),
    hashtags: resolve('hashtags', 'hashtags', 'tags'),
    callToAction: resolve('callToAction', 'callToAction', 'call_to_action', 'cta', 'action'),
  };

  // Cross-pollinate content_html and socialPost if one is missing
  if (!generatedContent.content_html && generatedContent.socialPost) {
      generatedContent.content_html = generatedContent.socialPost;
  }
  if (!generatedContent.socialPost && generatedContent.content_html) {
      generatedContent.socialPost = generatedContent.content_html;
  }

  // Scavenge validatorData specifically using getObject
  let validatorResult = getObject(t, 'validatorData', 'validator', 'validation', 'analysis', 'result', 'quality_analysis', 'content_score', 'validation_report', 'audit', 'validator_result', 'ai_check', 'quality_report', 'evaluation', 'review', 'ai_analysis');
  let validatorData: ValidatorData | undefined = undefined;
  
  if (validatorResult) {
      // Sometimes the result is nested in data or result key
      const actual = validatorResult.result || validatorResult.data || validatorResult;
      
      validatorData = {
          validated_at: getString(t, 'validated_at') || new Date().toISOString(),
          result: {
              status: getString(actual, 'status') || 'completed',
              summary: getString(actual, 'summary', 'why_this_works', 'justification', 'analysis_summary', 'overview', 'critique', 'review'),
              reasons: Array.isArray(findValueByKey(actual, 'reasons')) ? findValueByKey(actual, 'reasons') : [],
              recommendations: Array.isArray(findValueByKey(actual, 'recommendations')) ? findValueByKey(actual, 'recommendations') : [],
              fix_suggestions: Array.isArray(findValueByKey(actual, 'fix_suggestions')) ? findValueByKey(actual, 'fix_suggestions') : [],
              scores: {
                  b2b_tone: parseScore(findValueByKey(actual, 'b2b_tone') || findValueByKey(actual, 'tone_score') || findValueByKey(actual, 'tone') || findValueByKey(actual, 'professionalism')),
                  brand_alignment: parseScore(findValueByKey(actual, 'brand_alignment') || findValueByKey(actual, 'brand_score') || findValueByKey(actual, 'brand') || findValueByKey(actual, 'consistency') || findValueByKey(actual, 'alignment')),
                  structure: parseScore(findValueByKey(actual, 'structure') || findValueByKey(actual, 'structure_score') || findValueByKey(actual, 'readability') || findValueByKey(actual, 'formatting')),
                  accuracy: parseScore(findValueByKey(actual, 'accuracy') || findValueByKey(actual, 'accuracy_score') || findValueByKey(actual, 'fact_check') || findValueByKey(actual, 'validity')),
                  enterprise_relevance: parseScore(findValueByKey(actual, 'enterprise_relevance') || findValueByKey(actual, 'relevance_score') || findValueByKey(actual, 'relevance') || findValueByKey(actual, 'value')),
              }
          }
      };
  }

  // Determine status - ensure CONTENT_GENERATED if we have data
  let status = t.status || TopicStatus.PENDING;
  const hasContent = (generatedContent.content_html?.length || 0) > 10 || (generatedContent.socialPost?.length || 0) > 10;
  if (hasContent && (status === TopicStatus.PENDING || status === TopicStatus.HUMAN_APPROVED)) {
      status = TopicStatus.CONTENT_GENERATED;
  }

  return {
    ...t,
    id,
    keyword: t.keyword || generatedContent.focus_keyword || 'Unknown',
    product: t.product || 'Unknown Product',
    contentType: t.contentType || 'Article',
    title: t.title || generatedContent.title || 'Untitled Topic',
    status,
    createdAt: t.createdAt || new Date().toISOString(),
    generatedContent,
    validatorData,
    anchorText: getString(t, 'anchorText', 'anchor_text'),
    destinationUrl: getString(t, 'destinationUrl', 'destination_url'),
    backlinkPlatform: getString(t, 'backlinkPlatform', 'backlink_platform'),
    platformType: getString(t, 'platformType', 'platform', 'social_platform', 'network'),
    toneVoice: getString(t, 'toneVoice', 'tone_voice'),
    targetAudience: getString(t, 'targetAudience', 'target_audience'),
    contentGoal: getString(t, 'contentGoal', 'content_goal'),
    img_url: foundImage // Ensure top-level property is synced
  };
};

export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('topicGen_theme') as Theme) || 'light');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [preferredAngles, setPreferredAngles] = useState<string[]>([]);
  const [unpreferredAngles, setUnpreferredAngles] = useState<string[]>([]);

  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_webhook') || 'https://hook.us2.make.com/p0fwplqxbb8dazf65l1mqoa0for1aoxj');
  const [contentWebhookUrl, setContentWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_content_webhook') || 'https://hook.us2.make.com/x7617cbg9m44yeske2a1gpom9u1ntdsf');
  const [feedbackWebhookUrl, setFeedbackWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_feedback_webhook') || 'https://hook.us2.make.com/vez8sh43oam4ew6e9qt0j2mjr82jynxt');
  const [syncWebhookUrl, setSyncWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_sync_webhook') || '');
  const [articleReviewWebhookUrl, setArticleReviewWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_article_review_webhook') || 'https://hook.us2.make.com/l4seaxq3m0pppc2fdu6zzfppj5guc6re');
  const [draftingWebhookUrl, setDraftingWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_drafting_webhook') || 'https://hook.us2.make.com/hpg4g5b1tv6oq7teawrbwm923qm5bgin');
  const [socialReviewWebhookUrl, setSocialReviewWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_social_review_webhook') || 'https://hook.us2.make.com/xl8jv2pce1bluu9cv3uieydyjuw2v72p');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [contentGeneratingIds, setContentGeneratingIds] = useState<string[]>([]);

  useEffect(() => {
    const initData = async () => {
      await syncTopics();
      const config = await fetchAppConfig();
      if (config) {
        if (config.preferredAngles.length > 0) setPreferredAngles(config.preferredAngles);
        if (config.unpreferredAngles.length > 0) setUnpreferredAngles(config.unpreferredAngles);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('topicGen_theme', theme);
  }, [theme]);

  const saveTopicToCloud = async (topic: Topic) => { try { await saveSupabaseTopic(topic); } catch (e: any) { console.error(e); } };

  const addTopics = (newTopics: Topic[]) => {
    setTopics((prev) => [...newTopics, ...prev]);
    newTopics.forEach(t => saveTopicToCloud(t));
  };

  const updateTopicStatus = (id: string, status: TopicStatus) => {
    setTopics((prev) => prev.map((t) => {
        if (t.id === id) { const updated = { ...t, status }; saveTopicToCloud(updated); return updated; }
        return t;
    }));
  };

  const saveGeneratedContent = (id: string, data: any) => {
    setTopics((prev) => {
      const existingTopic = prev.find(t => t.id === id);
      if (!existingTopic) return prev;
      const mergedRaw = { ...existingTopic, ...(typeof data === 'string' ? robustParse(data) : data) };
      const updatedTopic = normalizeTopic(mergedRaw);
      updatedTopic.status = TopicStatus.CONTENT_GENERATED;
      saveTopicToCloud(updatedTopic);
      return prev.map(t => t.id === id ? updatedTopic : t);
    });
  };

  const deleteTopic = (id: string) => { deleteSupabaseTopic(id); setTopics((prev) => prev.filter((t) => String(t.id) !== String(id))); };

  const syncTopics = async () => {
    let ext: Topic[] = [];
    try { ext = await fetchSupabaseTopics(); } catch (e) { if (syncWebhookUrl) try { ext = await fetchExternalData(syncWebhookUrl); } catch(err) {} }
    setTopics(curr => {
       const map = new Map<string, Topic>(curr.map(t => [String(t.id), t]));
       ext.forEach(e => { const id = e.id ? String(e.id) : generateId(); map.set(id, normalizeTopic({ ...e, id })); });
       return Array.from(map.values());
    });
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <AppContext.Provider value={{
        topics, addTopics, updateTopicStatus, saveGeneratedContent, deleteTopic,
        preferredAngles, unpreferredAngles, webhookUrl, setWebhookUrl,
        contentWebhookUrl, setContentWebhookUrl, feedbackWebhookUrl, setFeedbackWebhookUrl,
        syncWebhookUrl, setSyncWebhookUrl, articleReviewWebhookUrl, setArticleReviewWebhookUrl,
        draftingWebhookUrl, setDraftingWebhookUrl, socialReviewWebhookUrl, setSocialReviewWebhookUrl,
        addAngle: (type, angle) => {
          const arr = type === 'preferred' ? preferredAngles : unpreferredAngles;
          if (!arr.includes(angle)) {
              const next = [...arr, angle];
              if (type === 'preferred') setPreferredAngles(next); else setUnpreferredAngles(next);
              saveAppConfig(type === 'preferred' ? 'preferred_angles' : 'unpreferred_angles', next);
          }
        },
        removeAngle: (type, angle) => {
          const next = (type === 'preferred' ? preferredAngles : unpreferredAngles).filter(a => a !== angle);
          if (type === 'preferred') setPreferredAngles(next); else setUnpreferredAngles(next);
          saveAppConfig(type === 'preferred' ? 'preferred_angles' : 'unpreferred_angles', next);
        },
        generateId, isGenerating, setIsGenerating, contentGeneratingIds, addContentGeneratingId: (id) => setContentGeneratingIds(p => [...p, id]),
        removeContentGeneratingId: (id) => setContentGeneratingIds(p => p.filter(i => i !== id)),
        syncTopics, exportData: () => {}, importData: () => {}, availableProducts: PRODUCTS, theme, toggleTheme
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};