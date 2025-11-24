import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { Topic, TopicStatus, GeneratedContentData, ValidatorData, ProductDef } from '../types';
import { fetchExternalData } from '../services/makeService';
import { fetchSupabaseTopics, saveSupabaseTopic, deleteSupabaseTopic, fetchAppConfig, saveAppConfig } from '../services/supabaseService';

// Defined Products List
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

// Robust ID generator that doesn't rely on external libraries
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper to safely parse JSON if it's a string, otherwise return as is
const safeParse = (value: any) => {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (e) {
            return value; // Return original string if parse fails (might be just a string)
        }
    }
    return value;
};

// Helper to clean strings (remove quotes)
const cleanString = (val: any): string => {
    if (typeof val === 'string') {
        return val.replace(/^["']|["']$/g, '').trim();
    }
    return '';
};

// Normalize function to ensure data structure consistency from various sources
const normalizeTopic = (t: any): Topic => {
  const id = t.id ? String(t.id) : generateId();
  
  // 1. Scavenge Generated Content
  let generatedContent: GeneratedContentData | undefined = t.generatedContent || t.content;
  
  // If generatedContent is missing, check if we have enough root-level data to build it
  if (!generatedContent) {
      const hasContent = t.content_html || t.html_content || t.htmlContent || t.body || 
                         t.featured_image || t.image || t.imageUrl || t.img || t.img_url ||
                         t.seo_title || t.seoTitle;
      
      if (hasContent) {
          generatedContent = {
              title: t.title || 'Untitled',
              h1: t.h1 || t.title || '',
              slug: t.slug || '',
              sections: [],
              faq: [],
              focus_keyword: t.focus_keyword || t.keyword || '',
              related_keywords: [],
              seo_title: t.seo_title || '',
              meta_description: t.meta_description || '',
              content_html: t.content_html || t.html_content || t.htmlContent || '',
              featured_image: ''
          };
      }
  }
  
  // If we have a generated content object (either existing or newly created), populate it aggressively
  if (generatedContent) {
      // Helper to populate a field if missing in generatedContent but present in root `t` OR aliased inside generatedContent
      const populateField = (targetKey: keyof GeneratedContentData, sourceKeys: string[], isArray = false) => {
          // If already populated correctly, skip
          if ((generatedContent as any)[targetKey]) {
              const val = (generatedContent as any)[targetKey];
              if (isArray && Array.isArray(val) && val.length > 0) return;
              if (!isArray && val) return;
          }

          // Look in source keys
          for (const key of sourceKeys) {
              // Check Root Topic First
              let val = t[key];
              
              // If not found at root, check inside generatedContent itself (e.g. casing mismatch like seoTitle vs seo_title)
              if (val === undefined || val === null) {
                   val = (generatedContent as any)[key];
              }

              if (val) {
                  if (isArray) {
                      (generatedContent as any)[targetKey] = safeParse(val);
                  } else {
                      (generatedContent as any)[targetKey] = val;
                  }
                  break; 
              }
          }
      };

      // Mappings for robust data scavenging
      populateField('seo_title', ['seo_title', 'seoTitle', 'meta_title']);
      populateField('meta_description', ['meta_description', 'metaDescription', 'description', 'meta_desc']);
      populateField('focus_keyword', ['focus_keyword', 'focusKeyword', 'keyword']);
      populateField('slug', ['slug', 'url_slug', 'urlSlug']);
      populateField('h1', ['h1', 'headline', 'title']);
      populateField('content_html', ['content_html', 'html_content', 'htmlContent', 'body', 'content', 'article_html']);
      
      populateField('sections', ['sections', 'outline', 'structure'], true);
      populateField('faq', ['faq', 'faqs', 'qna', 'questions'], true);
      populateField('related_keywords', ['related_keywords', 'relatedKeywords', 'keywords', 'tags'], true);

      // --- Aggressive Image Scavenging ---
      // Check all possible locations for the image URL
      const imgSources = [
          t.featured_image, t.featuredImage, t.image, t.imageUrl, t.img, t.src, t.picture, t.img_url,
          generatedContent.featured_image, (generatedContent as any).image, (generatedContent as any).imageUrl, (generatedContent as any).img, (generatedContent as any).img_url
      ];
      
      const foundImg = imgSources.find(i => i && typeof i === 'string' && i.length > 5 && (i.startsWith('http') || i.startsWith('data:image')));
      if (foundImg) {
          generatedContent.featured_image = cleanString(foundImg);
      }
      
      // Ensure arrays are actually arrays (parse stringified JSON if needed)
      if (typeof generatedContent.sections === 'string') generatedContent.sections = safeParse(generatedContent.sections);
      if (typeof generatedContent.faq === 'string') generatedContent.faq = safeParse(generatedContent.faq);
      if (typeof generatedContent.related_keywords === 'string') generatedContent.related_keywords = safeParse(generatedContent.related_keywords);
      
      // Safety: Ensure fields are at least empty strings if still undefined
      if (!generatedContent.seo_title) generatedContent.seo_title = '';
      if (!generatedContent.meta_description) generatedContent.meta_description = '';
  }

  // 2. Scavenge Validator Data
  let validatorData: ValidatorData | undefined = t.validatorData;
  
  if (!validatorData) {
      // Check for validator response at root or nested
      const vResponse = t.validator_response || t.validatorResponse;
      
      if (vResponse) {
          const parsedResponse = safeParse(vResponse);
          // Sometimes the response is directly the result, sometimes it wraps it
          const resultObj = parsedResponse.result || parsedResponse;
          
          validatorData = {
              validated_at: t.validated_at || new Date().toISOString(),
              result: safeParse(resultObj)
          };
      } else if (t.scores || t.summary || t.reasons) {
          // Reconstruct from flat fields
          validatorData = {
              validated_at: t.validated_at || new Date().toISOString(),
              result: {
                  scores: safeParse(t.scores),
                  summary: t.summary,
                  reasons: safeParse(t.reasons),
                  recommendations: safeParse(t.recommendations),
                  status: t.validator_status || 'completed'
              }
          };
      }
  }

  // Normalize validator result internal structures
  if (validatorData && validatorData.result) {
      if (typeof validatorData.result.scores === 'string') validatorData.result.scores = safeParse(validatorData.result.scores);
      if (typeof validatorData.result.reasons === 'string') validatorData.result.reasons = safeParse(validatorData.result.reasons);
      if (typeof validatorData.result.recommendations === 'string') validatorData.result.recommendations = safeParse(validatorData.result.recommendations);
  }

  // 3. Auto-Detect Status
  let status = t.status || TopicStatus.PENDING;
  // If we have substantial HTML content, assume it's generated, unless explicitly marked otherwise
  if (
      generatedContent?.content_html && 
      generatedContent.content_html.length > 50 && 
      status !== TopicStatus.CONTENT_GENERATED && 
      status !== TopicStatus.HUMAN_APPROVED &&
      status !== TopicStatus.ARTICLE_DRAFT &&
      status !== TopicStatus.ARTICLE_REJECTED
  ) {
      status = TopicStatus.CONTENT_GENERATED;
  }

  return {
    ...t,
    id,
    keyword: t.keyword || 'Unknown Keyword',
    product: t.product || 'Unknown Product',
    pageId: t.pageId || t.page_id || '', 
    title: t.title || 'Untitled Topic',
    angle: t.angle || '',
    searchIntent: t.searchIntent || t.search_intent || '',
    whyRelevant: t.whyRelevant || t.why_relevant || '',
    aiReason: t.aiReason || t.ai_reason || '',
    status: status,
    createdAt: t.createdAt || new Date().toISOString(),
    img_url: t.img_url || generatedContent?.featured_image, // Sync top-level img_url
    generatedContent,
    validatorData,
    htmlContent: t.htmlContent || generatedContent?.content_html
  };
};

export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('topicGen_theme') as Theme) || 'light';
  });

  const [topics, setTopics] = useState<Topic[]>([]);
  const [preferredAngles, setPreferredAngles] = useState<string[]>([]);
  const [unpreferredAngles, setUnpreferredAngles] = useState<string[]>([]);

  // Webhooks
  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_webhook') || 'https://hook.us2.make.com/p0fwplqxbb8dazf65l1mqoa0for1aoxj');
  const [contentWebhookUrl, setContentWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_content_webhook') || 'https://hook.us2.make.com/x7617cbg9m44yeske2a1gpom9u1ntdsf');
  const [feedbackWebhookUrl, setFeedbackWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_feedback_webhook') || 'https://hook.us2.make.com/vez8sh43oam4ew6e9qt0j2mjr82jynxt');
  const [syncWebhookUrl, setSyncWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_sync_webhook') || '');
  const [articleReviewWebhookUrl, setArticleReviewWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_article_review_webhook') || 'https://hook.us2.make.com/l4seaxq3m0pppc2fdu6zzfppj5guc6re');
  const [draftingWebhookUrl, setDraftingWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_drafting_webhook') || 'https://hook.us2.make.com/hpg4g5b1tv6oq7teawrbwm923qm5bgin');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [contentGeneratingIds, setContentGeneratingIds] = useState<string[]>([]);

  // Initialize Data from Database
  useEffect(() => {
    const initData = async () => {
      await syncTopics();
      const config = await fetchAppConfig();
      if (config) {
        if (config.preferredAngles.length > 0) setPreferredAngles(config.preferredAngles);
        if (config.unpreferredAngles.length > 0) setUnpreferredAngles(config.unpreferredAngles);
      } else {
        // Defaults if DB is empty
        setPreferredAngles([
            'Enterprise scalability', 
            'Data security and compliance', 
            'Cost reduction strategies'
        ]);
        setUnpreferredAngles([
            'Cheap/Free alternatives', 
            'Beginner tutorials', 
            'Opinion pieces'
        ]);
      }
    };
    initData();
  }, []);

  // Effect to Persist State
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('topicGen_theme', theme);
  }, [theme]);

  // Persist Settings
  useEffect(() => { localStorage.setItem('topicGen_webhook', webhookUrl); }, [webhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_content_webhook', contentWebhookUrl); }, [contentWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_feedback_webhook', feedbackWebhookUrl); }, [feedbackWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_sync_webhook', syncWebhookUrl); }, [syncWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_article_review_webhook', articleReviewWebhookUrl); }, [articleReviewWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_drafting_webhook', draftingWebhookUrl); }, [draftingWebhookUrl]);

  // Helper to save specific topic to cloud (Supabase)
  const saveTopicToCloud = async (topic: Topic) => {
    try {
        await saveSupabaseTopic(topic);
    } catch (e: any) {
        console.error("Supabase Save failed:", e.message || JSON.stringify(e));
    }
  };

  const addTopics = (newTopics: Topic[]) => {
    setTopics((prev) => [...newTopics, ...prev]);
    // Save new topics to cloud
    newTopics.forEach(t => saveTopicToCloud(t));
  };

  const updateTopicStatus = (id: string, status: TopicStatus) => {
    setTopics((prev) =>
      prev.map((t) => {
          if (t.id === id) {
              const updated = { ...t, status };
              saveTopicToCloud(updated);
              return updated;
          }
          return t;
      })
    );
  };

  const saveGeneratedContent = (id: string, data: any) => {
    let topicToSave: Topic | undefined;

    setTopics((prev) => {
      // Find the topic to be updated based on ID
      const existingTopic = prev.find(t => t.id === id);
      if (!existingTopic) return prev;

      let generatedContent: GeneratedContentData | undefined = data.content;
      let validatorData: ValidatorData | undefined = data.validator_response;

      // Backfill if structure is flat (common from AI webhooks)
      if (!generatedContent && (data.content_html || data.html_content || data.h1 || data.featured_image || data.image)) {
          generatedContent = { ...data };
      }
      
      // Ensure image is captured if present at root data or legacy fields
      if (generatedContent) {
          const rawImage = data.image || data.imageUrl || data.featured_image || data.img || data.img_url;
          if (rawImage && !generatedContent.featured_image) {
              generatedContent.featured_image = cleanString(rawImage);
          }
      }

      if (!validatorData && data.validated_at && data.result) {
          validatorData = {
              validated_at: data.validated_at,
              result: data.result
          };
      } else if (!validatorData && (data.scores || data.summary)) {
          // Reconstruct validator if data came flat
          validatorData = {
              validated_at: new Date().toISOString(),
              result: {
                  scores: data.scores,
                  summary: data.summary,
                  reasons: data.reasons,
                  recommendations: data.recommendations,
                  status: 'completed'
              }
          };
      }

      // Create the updated topic object using normalization to ensure structure is correct
      const updatedTopic = normalizeTopic({ 
          ...existingTopic, 
          status: TopicStatus.CONTENT_GENERATED,
          generatedContent: generatedContent,
          validatorData: validatorData,
          htmlContent: existingTopic.htmlContent || generatedContent?.content_html
      });
      
      // Explicitly sync img_url for persistence if it was found in content
      if (generatedContent?.featured_image) {
          (updatedTopic as any).img_url = generatedContent.featured_image;
      }
      
      topicToSave = updatedTopic;
      
      // Update state
      return prev.map(t => t.id === id ? updatedTopic : t);
    });

    // Save to cloud outside the state setter to ensure we have the fully updated object and avoid batching issues
    if (topicToSave) {
        console.log("Saving generated content to cloud...", topicToSave);
        saveTopicToCloud(topicToSave);
    }
  };

  const deleteTopic = (id: string) => {
    deleteSupabaseTopic(id).catch(e => console.error("Cloud delete failed", e));
    setTopics((prev) => prev.filter((t) => String(t.id) !== String(id)));
  };

  const addAngle = (type: 'preferred' | 'unpreferred', angle: string) => {
    if (type === 'preferred') {
      if (!preferredAngles.includes(angle)) {
        const newAngles = [...preferredAngles, angle];
        setPreferredAngles(newAngles);
        saveAppConfig('preferred_angles', newAngles);
      }
    } else {
      if (!unpreferredAngles.includes(angle)) {
        const newAngles = [...unpreferredAngles, angle];
        setUnpreferredAngles(newAngles);
        saveAppConfig('unpreferred_angles', newAngles);
      }
    }
  };

  const removeAngle = (type: 'preferred' | 'unpreferred', angle: string) => {
    if (type === 'preferred') {
      const newAngles = preferredAngles.filter((a) => a !== angle);
      setPreferredAngles(newAngles);
      saveAppConfig('preferred_angles', newAngles);
    } else {
      const newAngles = unpreferredAngles.filter((a) => a !== angle);
      setUnpreferredAngles(newAngles);
      saveAppConfig('unpreferred_angles', newAngles);
    }
  };

  const addContentGeneratingId = (id: string) => {
    setContentGeneratingIds(prev => [...prev, id]);
  };

  const removeContentGeneratingId = (id: string) => {
    setContentGeneratingIds(prev => prev.filter(item => item !== id));
  };

  const syncTopics = async () => {
    let externalTopics: Topic[] = [];

    // Prioritize Supabase
    try {
        externalTopics = await fetchSupabaseTopics();
    } catch (e: any) {
        console.error("Supabase Sync Failed:", e);
        // Fallback to Webhook if Supabase fails (optional legacy support)
        if (syncWebhookUrl) {
           console.log("Supabase failed, attempting Webhook fallback...");
           try { externalTopics = await fetchExternalData(syncWebhookUrl); } catch(err) {}
        }
    }
    
    setTopics(currentTopics => {
       const currentMap = new Map<string, Topic>(currentTopics.map(t => [String(t.id), t]));
       
       externalTopics.forEach(ext => {
           const id = ext.id ? String(ext.id) : generateId();
           const existing = currentMap.get(id);
           // Merge: External data takes precedence for fields present in it
           const mergedRaw = existing ? { ...existing, ...ext } : { ...ext, id };
           const normalized = normalizeTopic(mergedRaw);
           currentMap.set(id, normalized);
       });
       
       return Array.from(currentMap.values());
    });
  };

  const exportData = () => {
      const dataStr = JSON.stringify(topics, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `topic_gen_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed)) {
        alert("Invalid data format: Expected an array of topics.");
        return;
      }
      const importedTopics: Topic[] = parsed.map(normalizeTopic);
      setTopics(prev => {
         const topicMap = new Map(prev.map(t => [String(t.id), t]));
         importedTopics.forEach(t => topicMap.set(String(t.id), t));
         return Array.from(topicMap.values());
      });
      // Also save imported to cloud
      importedTopics.forEach(t => saveTopicToCloud(t));
      alert(`Successfully imported ${importedTopics.length} topics.`);
    } catch (e: any) {
      console.error(e);
      alert("Failed to parse JSON file.");
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <AppContext.Provider
      value={{
        topics,
        addTopics,
        updateTopicStatus,
        saveGeneratedContent,
        deleteTopic,
        preferredAngles,
        unpreferredAngles,
        webhookUrl,
        setWebhookUrl,
        contentWebhookUrl,
        setContentWebhookUrl,
        feedbackWebhookUrl,
        setFeedbackWebhookUrl,
        syncWebhookUrl,
        setSyncWebhookUrl,
        articleReviewWebhookUrl,
        setArticleReviewWebhookUrl,
        draftingWebhookUrl,
        setDraftingWebhookUrl,
        addAngle,
        removeAngle,
        generateId,
        isGenerating,
        setIsGenerating,
        contentGeneratingIds,
        addContentGeneratingId,
        removeContentGeneratingId,
        syncTopics,
        exportData,
        importData,
        availableProducts: PRODUCTS,
        theme,
        toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};