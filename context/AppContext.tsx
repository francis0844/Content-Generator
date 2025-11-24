
import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { Topic, TopicStatus, GeneratedContentData, ValidatorData, ProductDef } from '../types';
import { fetchExternalData } from '../services/makeService';
import { loadFromVercel, saveToVercel } from '../services/vercelService';
import { fetchSupabaseTopics, saveSupabaseTopic, deleteSupabaseTopic } from '../services/supabaseService';

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
  vercelKvUrl: string;
  setVercelKvUrl: (url: string) => void;
  vercelKvToken: string;
  setVercelKvToken: (token: string) => void;
  supabaseUrl: string;
  setSupabaseUrl: (url: string) => void;
  supabaseKey: string;
  setSupabaseKey: (key: string) => void;
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

// Normalize function to ensure data structure consistency from various sources
const normalizeTopic = (t: any): Topic => {
  const id = t.id ? String(t.id) : generateId();
  
  // 1. Scavenge Generated Content
  let generatedContent: GeneratedContentData | undefined = t.generatedContent || t.content;
  
  if (!generatedContent && (t.content_html || t.html_content || t.htmlContent || t.featured_image || t.image)) {
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
          featured_image: t.featured_image || t.image || t.imageUrl
      };
  }
  
  if (generatedContent) {
      if (!generatedContent.sections && t.sections) generatedContent.sections = safeParse(t.sections);
      if (!generatedContent.faq && t.faq) generatedContent.faq = safeParse(t.faq);
      if (!generatedContent.related_keywords && t.related_keywords) generatedContent.related_keywords = safeParse(t.related_keywords);
      
      if (!generatedContent.seo_title && t.seo_title) generatedContent.seo_title = t.seo_title;
      if (!generatedContent.meta_description && t.meta_description) generatedContent.meta_description = t.meta_description;
      if (!generatedContent.slug && t.slug) generatedContent.slug = t.slug;
      if (!generatedContent.focus_keyword && (t.focus_keyword || t.keyword)) generatedContent.focus_keyword = t.focus_keyword || t.keyword;

      if (t.content_html && !generatedContent.content_html) generatedContent.content_html = t.content_html;
      if (t.html_content && !generatedContent.content_html) generatedContent.content_html = t.html_content;
      if (t.htmlContent && !generatedContent.content_html) generatedContent.content_html = t.htmlContent;
      
      if (t.image && !generatedContent.featured_image) generatedContent.featured_image = t.image;
      if (t.featured_image && !generatedContent.featured_image) generatedContent.featured_image = t.featured_image;

      if (typeof generatedContent.sections === 'string') generatedContent.sections = safeParse(generatedContent.sections);
      if (typeof generatedContent.faq === 'string') generatedContent.faq = safeParse(generatedContent.faq);
      if (typeof generatedContent.related_keywords === 'string') generatedContent.related_keywords = safeParse(generatedContent.related_keywords);
  }

  // 2. Scavenge Validator Data
  let validatorData: ValidatorData | undefined = t.validatorData;
  
  if (!validatorData) {
      const vResponse = t.validator_response || t.validatorResponse;
      
      if (vResponse) {
          const parsedResponse = safeParse(vResponse);
          const resultObj = parsedResponse.result || parsedResponse;
          validatorData = {
              validated_at: t.validated_at || new Date().toISOString(),
              result: safeParse(resultObj)
          };
      } else if (t.scores || t.summary || t.reasons) {
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

  if (validatorData && validatorData.result) {
      if (typeof validatorData.result.scores === 'string') validatorData.result.scores = safeParse(validatorData.result.scores);
      if (typeof validatorData.result.reasons === 'string') validatorData.result.reasons = safeParse(validatorData.result.reasons);
      if (typeof validatorData.result.recommendations === 'string') validatorData.result.recommendations = safeParse(validatorData.result.recommendations);
  }

  // 3. Auto-Detect Status
  let status = t.status || TopicStatus.PENDING;
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
    generatedContent,
    validatorData,
    htmlContent: t.htmlContent || generatedContent?.content_html
  };
};

export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('topicGen_theme') as Theme) || 'light';
  });

  const [topics, setTopics] = useState<Topic[]>(() => {
    const saved = localStorage.getItem('topicGen_topics');
    let parsedTopics = saved ? JSON.parse(saved) : [];
    return parsedTopics.map(normalizeTopic);
  });

  const [preferredAngles, setPreferredAngles] = useState<string[]>(() => {
    const saved = localStorage.getItem('topicGen_preferred');
    return saved ? JSON.parse(saved) : [
      'Enterprise scalability', 
      'Data security and compliance', 
      'Cost reduction strategies'
    ];
  });

  const [unpreferredAngles, setUnpreferredAngles] = useState<string[]>(() => {
    const saved = localStorage.getItem('topicGen_unpreferred');
    return saved ? JSON.parse(saved) : [
      'Cheap/Free alternatives', 
      'Beginner tutorials', 
      'Opinion pieces'
    ];
  });

  // Webhooks
  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_webhook') || 'https://hook.us2.make.com/p0fwplqxbb8dazf65l1mqoa0for1aoxj');
  const [contentWebhookUrl, setContentWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_content_webhook') || 'https://hook.us2.make.com/x7617cbg9m44yeske2a1gpom9u1ntdsf');
  const [feedbackWebhookUrl, setFeedbackWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_feedback_webhook') || 'https://hook.us2.make.com/vez8sh43oam4ew6e9qt0j2mjr82jynxt');
  const [syncWebhookUrl, setSyncWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_sync_webhook') || '');
  const [articleReviewWebhookUrl, setArticleReviewWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_article_review_webhook') || 'https://hook.us2.make.com/l4seaxq3m0pppc2fdu6zzfppj5guc6re');
  const [draftingWebhookUrl, setDraftingWebhookUrl] = useState<string>(() => localStorage.getItem('topicGen_drafting_webhook') || 'https://hook.us2.make.com/hpg4g5b1tv6oq7teawrbwm923qm5bgin');

  // Vercel KV Credentials
  const [vercelKvUrl, setVercelKvUrl] = useState<string>(() => localStorage.getItem('topicGen_vercel_kv_url') || '');
  const [vercelKvToken, setVercelKvToken] = useState<string>(() => localStorage.getItem('topicGen_vercel_kv_token') || '');

  // Supabase Credentials
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => localStorage.getItem('topicGen_supabase_url') || '');
  const [supabaseKey, setSupabaseKey] = useState<string>(() => localStorage.getItem('topicGen_supabase_key') || '');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [contentGeneratingIds, setContentGeneratingIds] = useState<string[]>([]);

  // Effect to Persist State
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('topicGen_theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('topicGen_topics', JSON.stringify(topics)); }, [topics]);
  useEffect(() => { localStorage.setItem('topicGen_preferred', JSON.stringify(preferredAngles)); }, [preferredAngles]);
  useEffect(() => { localStorage.setItem('topicGen_unpreferred', JSON.stringify(unpreferredAngles)); }, [unpreferredAngles]);
  
  // Persist Settings
  useEffect(() => { localStorage.setItem('topicGen_webhook', webhookUrl); }, [webhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_content_webhook', contentWebhookUrl); }, [contentWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_feedback_webhook', feedbackWebhookUrl); }, [feedbackWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_sync_webhook', syncWebhookUrl); }, [syncWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_article_review_webhook', articleReviewWebhookUrl); }, [articleReviewWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_drafting_webhook', draftingWebhookUrl); }, [draftingWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_vercel_kv_url', vercelKvUrl); }, [vercelKvUrl]);
  useEffect(() => { localStorage.setItem('topicGen_vercel_kv_token', vercelKvToken); }, [vercelKvToken]);
  useEffect(() => { localStorage.setItem('topicGen_supabase_url', supabaseUrl); }, [supabaseUrl]);
  useEffect(() => { localStorage.setItem('topicGen_supabase_key', supabaseKey); }, [supabaseKey]);

  // Helper to save specific topic to cloud (Supabase priority)
  const saveTopicToCloud = async (topic: Topic) => {
    if (supabaseUrl && supabaseKey) {
        try {
            await saveSupabaseTopic(supabaseUrl, supabaseKey, topic);
        } catch (e: any) {
            console.error("Supabase Save failed:", e.message || JSON.stringify(e));
        }
    } else if (vercelKvUrl && vercelKvToken) {
        // Vercel KV is usually bulk save, but we can't easily update single item in simple list
        // So we trigger the bulk save effect
    }
  };

  // Auto-Save to Vercel KV (Bulk) when topics change - ONLY if Supabase is NOT active
  useEffect(() => {
    if (vercelKvUrl && vercelKvToken && !supabaseUrl && topics.length > 0) {
      const timeoutId = setTimeout(() => {
        saveToVercel(vercelKvUrl, vercelKvToken, topics).catch(e => console.error("Vercel Auto-save failed", e));
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [topics, vercelKvUrl, vercelKvToken, supabaseUrl]);

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
    setTopics((prev) =>
      prev.map((t) => {
          if (t.id !== id) return t;

          let generatedContent: GeneratedContentData | undefined = data.content;
          let validatorData: ValidatorData | undefined = data.validator_response;

          if (!generatedContent && (data.content_html || data.html_content || data.h1 || data.featured_image || data.image)) {
              generatedContent = { ...data };
              if (data.image && !generatedContent!.featured_image) {
                 generatedContent!.featured_image = data.image;
              }
          }

          if (!validatorData && data.validated_at && data.result) {
              validatorData = {
                  validated_at: data.validated_at,
                  result: data.result
              };
          }

          const updatedTopic = normalizeTopic({ 
              ...t, 
              status: TopicStatus.CONTENT_GENERATED,
              generatedContent: generatedContent,
              validatorData: validatorData,
              htmlContent: t.htmlContent || generatedContent?.content_html
          });
          
          saveTopicToCloud(updatedTopic);
          return updatedTopic;
      })
    );
  };

  const deleteTopic = (id: string) => {
    if (supabaseUrl && supabaseKey) {
        deleteSupabaseTopic(supabaseUrl, supabaseKey, id).catch(e => console.error("Cloud delete failed", e));
    }
    setTopics((prev) => prev.filter((t) => String(t.id) !== String(id)));
  };

  const addAngle = (type: 'preferred' | 'unpreferred', angle: string) => {
    if (type === 'preferred') {
      if (!preferredAngles.includes(angle)) setPreferredAngles([...preferredAngles, angle]);
    } else {
      if (!unpreferredAngles.includes(angle)) setUnpreferredAngles([...unpreferredAngles, angle]);
    }
  };

  const removeAngle = (type: 'preferred' | 'unpreferred', angle: string) => {
    if (type === 'preferred') {
      setPreferredAngles(preferredAngles.filter((a) => a !== angle));
    } else {
      setUnpreferredAngles(unpreferredAngles.filter((a) => a !== angle));
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
    if (supabaseUrl && supabaseKey) {
        console.log("Syncing from Supabase...");
        try {
            externalTopics = await fetchSupabaseTopics(supabaseUrl, supabaseKey);
        } catch (e: any) {
            // Rethrow so the UI can show the error alert
            throw new Error(`Supabase Sync Failed: ${e.message}`);
        }
    }
    // Then Vercel KV
    else if (vercelKvUrl && vercelKvToken) {
        console.log("Syncing from Vercel KV...");
        const cloudData = await loadFromVercel(vercelKvUrl, vercelKvToken);
        if (cloudData) externalTopics = cloudData;
    } 
    // Fallback to Webhook
    else if (syncWebhookUrl) {
        console.log("Syncing from Webhook...");
        externalTopics = await fetchExternalData(syncWebhookUrl);
    } 
    else {
        throw new Error("No Sync method configured. Please add Supabase credentials, Vercel KV, or a Sync Webhook URL.");
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
        vercelKvUrl,
        setVercelKvUrl,
        vercelKvToken,
        setVercelKvToken,
        supabaseUrl,
        setSupabaseUrl,
        supabaseKey,
        setSupabaseKey,
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
