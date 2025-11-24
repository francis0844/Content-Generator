
import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { Topic, TopicStatus, GeneratedContentData, ValidatorData, ProductDef, ContentSection } from '../types';
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

// Robust ID generator
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper to safely parse JSON if it's a string, cleaning up common AI artifacts
const robustParse = (value: any) => {
    if (typeof value !== 'string') return value;
    
    // Attempt basic parse
    try {
        return JSON.parse(value);
    } catch (e) {
        // Cleanup Markdown code blocks
        let clean = value.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        // Cleanup escaped newlines/quotes loosely
        clean = clean.trim();
        try { return JSON.parse(clean); } catch (e2) { return value; }
    }
};

// Helper to clean strings (remove quotes, markdown images)
const cleanString = (val: any): string => {
    if (typeof val !== 'string') return '';
    
    let clean = val.trim();
    
    // 1. Remove surrounding quotes
    clean = clean.replace(/^["']|["']$/g, '').trim();
    
    // 2. Handle Markdown image syntax: ![Alt](url) or [Alt](url)
    const mdMatch = clean.match(/!?\[.*?\]\((https?:\/\/[^)]+)\)/);
    if (mdMatch && mdMatch[1]) return mdMatch[1];

    // 3. Handle parenthesized or bracketed url: (http://...) or [http://...]
    const wrapperMatch = clean.match(/^[\(\[]\s*(https?:\/\/[^)\]]+)\s*[\)\]]$/);
    if (wrapperMatch && wrapperMatch[1]) return wrapperMatch[1];
    
    // 4. Fallback: If the string is not a valid URL but contains one, extract it.
    // E.g. "Here is the image: https://..."
    if (!clean.match(/^(https?:\/\/|\/|data:)/i)) {
        const urlMatch = clean.match(/(https?:\/\/[^\s"'\)]+)/);
        if (urlMatch && urlMatch[1]) return urlMatch[1];
    }

    // 5. Cleanup trailing punctuation that might have been captured (.,;)
    clean = clean.replace(/[\.,;]$/, '');

    return clean;
};

// --- RECURSIVE FINDER ---
const findValueByKey = (obj: any, targetKey: string, depth = 0): any => {
    if (!obj || typeof obj !== 'object' || depth > 8) return undefined;
    
    // 0. Dot Notation Handling (e.g. "seo.title")
    if (targetKey.includes('.')) {
        const parts = targetKey.split('.');
        const rootKey = parts[0];
        const restKey = parts.slice(1).join('.');
        
        const rootObj = findValueByKey(obj, rootKey, depth);
        if (rootObj && typeof rootObj === 'object') {
            return findValueByKey(rootObj, restKey, 0);
        }
        return undefined;
    }
    
    // 1. Direct match (Case Insensitive Check)
    const keys = Object.keys(obj);
    const lowerTarget = targetKey.toLowerCase();
    for (const k of keys) {
        if (k.toLowerCase() === lowerTarget) {
            if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
        }
    }
    
    // 2. Snake case match
    const snake = targetKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (obj[snake] !== undefined && obj[snake] !== null && obj[snake] !== '') return obj[snake];
    
    // 3. Camel case match
    const camel = targetKey.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (obj[camel] !== undefined && obj[camel] !== null && obj[camel] !== '') return obj[camel];

    // 4. Recursive search in children
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const val = obj[key];
            
            if (typeof val === 'object' && val !== null) {
                // Handle Arrays by searching inside elements
                if (Array.isArray(val)) {
                    // Search first few elements to avoid massive loops
                    for (let i = 0; i < Math.min(val.length, 3); i++) {
                        const item = val[i];
                        if (typeof item === 'object') {
                            const found = findValueByKey(item, targetKey, depth + 1);
                            if (found !== undefined) return found;
                        }
                    }
                } else {
                    // Handle Objects
                    const found = findValueByKey(val, targetKey, depth + 1);
                    if (found !== undefined) return found;
                }
            }
        }
    }
    return undefined;
};

// Merges properties from nested objects (like 'seo', 'structure') into the main object
const scavengeObjects = (source: any, target: any, keys: string[]) => {
    keys.forEach(k => {
        const val = findValueByKey(source, k);
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            // We use a safe merge to not overwrite existing non-empty keys
            Object.keys(val).forEach(subKey => {
                if (!target[subKey]) target[subKey] = val[subKey];
            });
        }
    });
};

// Normalize function to ensure data structure consistency
const normalizeTopic = (t: any): Topic => {
  const id = t.id ? String(t.id) : generateId();
  
  // PRE-EXPANSION: Parse stringified fields
  const expandKeys = ['content', 'generatedContent', 'seo', 'seo_data', 'metadata', 'structure', 'outline', 'validator_response', 'scores', 'Scores', 'result'];
  expandKeys.forEach(k => {
     // Try finding the key recursively first, just in case it's nested
     const found = findValueByKey(t, k);
     if (found && typeof found === 'string') {
         // Determine where to set it back... complicated if deep. 
         // For now, if it's at root `t[k]`, parse it.
         if (t[k]) t[k] = robustParse(t[k]);
     }
  });

  // 1. Scavenge Generated Content
  let generatedContent: GeneratedContentData | undefined = t.generatedContent || (typeof t.content === 'object' ? t.content : undefined);
  
  if (!generatedContent) {
      // Fallback: Create basic object if content is found elsewhere
      const hasContent = findValueByKey(t, 'content_html') || findValueByKey(t, 'html_content');
      if (hasContent) {
          generatedContent = {
              title: t.title || 'Untitled',
              h1: t.h1 || t.title || '',
              slug: t.slug || '',
              sections: [],
              faq: [],
              focus_keyword: t.focus_keyword || t.keyword || '',
              related_keywords: [],
              seo_title: '',
              meta_description: '',
              content_html: hasContent,
              featured_image: ''
          };
      }
  }

  if (generatedContent) {
      // Flatten SEO/Structure objects into generatedContent for easier access
      scavengeObjects(t, generatedContent, ['seo', 'seo_data', 'metadata', 'structure', 'outline', 'content']);

      // Populate Helper
      const populateField = (targetKey: keyof GeneratedContentData, searchKeys: string[], isArray = false) => {
          // Check if already exists and is valid
          if ((generatedContent as any)[targetKey]) {
              const val = (generatedContent as any)[targetKey];
              if (isArray && Array.isArray(val) && val.length > 0) return;
              if (!isArray && val && val !== '-') return;
          }

          for (const key of searchKeys) {
             const val = findValueByKey(t, key);
             if (val !== undefined && val !== null && val !== '') {
                  const parsed = isArray ? robustParse(val) : val;
                  if (isArray) {
                      if (Array.isArray(parsed)) (generatedContent as any)[targetKey] = parsed;
                  } else {
                      (generatedContent as any)[targetKey] = parsed;
                  }
                  return;
             }
          }
      };

      // Mappings
      populateField('seo_title', ['seo_title', 'meta_title', 'title_tag', 'seo.title', 'seo.seo_title', 'metadata.title']);
      populateField('meta_description', ['meta_description', 'meta_desc', 'description', 'seo.description', 'seo_description', 'seo.meta_description', 'summary', 'short_description']);
      populateField('focus_keyword', ['focus_keyword', 'keyword', 'seo.keyword']);
      populateField('slug', ['slug', 'url_slug', 'seo.slug']);
      populateField('h1', ['h1', 'headline']);
      populateField('content_html', ['content_html', 'html_content', 'article_body', 'body_html']);
      
      populateField('sections', ['sections', 'outline', 'structure', 'content_structure', 'structure.sections'], true);
      populateField('faq', ['faq', 'faqs', 'qna', 'questions', 'faq_schema'], true);
      populateField('related_keywords', ['related_keywords', 'keywords', 'tags'], true);

      // --- Aggressive Image Scavenging ---
      // We look for any key that might hold an image URL
      const foundImg = findValueByKey(t, 'featured_image') || 
                       findValueByKey(t, 'img_url') || 
                       findValueByKey(t, 'image') || 
                       findValueByKey(t, 'imageUrl') || 
                       findValueByKey(t, 'src');
      
      if (foundImg && typeof foundImg === 'string' && foundImg.length > 5) {
          const cleaned = cleanString(foundImg);
          // Basic validation to ensure it looks like a url or path
          if (cleaned.match(/^(https?:\/\/|\/|data:)/i)) {
             generatedContent.featured_image = cleaned;
          }
      }

      // Fallback: Extract from content_html if no other image found
      if (!generatedContent.featured_image && generatedContent.content_html) {
          const imgMatch = generatedContent.content_html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
              const cleaned = cleanString(imgMatch[1]);
              if (cleaned.match(/^(https?:\/\/|\/|data:)/i)) {
                  generatedContent.featured_image = cleaned;
              }
          }
      }
      
      // --- Data Structure Normalization ---
      
      // Fix Sections: Convert string arrays or key-value objects to ContentSection[]
      if (generatedContent.sections) {
          if (Array.isArray(generatedContent.sections)) {
               // Handle ["Heading"] -> [{ heading: "Heading" }]
               if (generatedContent.sections.length > 0 && typeof generatedContent.sections[0] === 'string') {
                   generatedContent.sections = (generatedContent.sections as any[]).map(s => ({ heading: s, key_points: [] }));
               }
          } else if (typeof generatedContent.sections === 'object') {
              // Handle { "Intro": ["point"] } -> [{ heading: "Intro", key_points: ["point"] }]
              generatedContent.sections = Object.entries(generatedContent.sections).map(([k, v]) => ({
                  heading: k,
                  key_points: Array.isArray(v) ? v : [String(v)]
              }));
          } else if (typeof generatedContent.sections === 'string') {
              // Handle Text Block "1. Heading\n2. Heading"
              const str = generatedContent.sections as string;
              const lines = str.split('\n').filter(l => l.trim().length > 0);
              generatedContent.sections = lines.map(line => ({ 
                  heading: line.replace(/^\d+[\.:]\s*/, '').replace(/\*\*/g, '').trim(), 
                  key_points: [] 
              }));
          }
      }

      // Fix FAQ: Convert strings to objects
      if (Array.isArray(generatedContent.faq)) {
           generatedContent.faq = generatedContent.faq.map((f: any) => {
               if (typeof f === 'string') return { q: f, a_outline: [] };
               if (f.question && !f.q) f.q = f.question;
               if (f.answer && !f.a_outline) f.a_outline = [f.answer];
               return f;
           });
      }
      
      if (!generatedContent.seo_title) generatedContent.seo_title = t.title || '';
  }

  // 2. Scavenge Validator Data
  // Important: Create a mutable copy to avoid modifying read-only state objects
  let validatorData: ValidatorData | undefined = t.validatorData ? { ...t.validatorData } : undefined;
  
  if (!validatorData) {
      // Search for consolidated objects first
      const result = findValueByKey(t, 'validator_response') || findValueByKey(t, 'validator_result') || findValueByKey(t, 'validation_data');
      if (result) {
          const parsed = robustParse(result);
          const actualResult = parsed.result || parsed;
          validatorData = {
              validated_at: t.validated_at || new Date().toISOString(),
              result: (typeof actualResult === 'object' && actualResult !== null) ? actualResult : {}
          };
      }
  }

  // Check if we found validatorData but it's missing scores, OR if we never found it
  // In either case, run the manual score scavenger to find stray score keys
  let scoresFound = validatorData?.result?.scores;
  
  // Try finding scores object using multiple possible key names
  if (!scoresFound) {
      scoresFound = findValueByKey(t, 'scores') || findValueByKey(t, 'Scores');
      if (scoresFound) scoresFound = robustParse(scoresFound);
  }

  // If still no scores object, look for individual score keys at root or anywhere
  // We use a mapping to handle spaced keys like "B2B Tone" which might not be caught by simple snake_case conversion
  if (!scoresFound) {
       const individualScores: any = {};
       const scoreKeys = [
           { key: 'b2b_tone', alts: ['B2B Tone', 'b2b tone', 'Tone'] },
           { key: 'brand_alignment', alts: ['Brand Alignment', 'brand alignment', 'Alignment'] },
           { key: 'structure', alts: ['Structure', 'structure'] },
           { key: 'accuracy', alts: ['Accuracy', 'accuracy'] },
           { key: 'enterprise_relevance', alts: ['Enterprise Relevance', 'enterprise relevance', 'Relevance'] }
       ];

       let foundAny = false;
       scoreKeys.forEach(item => {
           // Search for main key
           let val = findValueByKey(t, item.key);
           
           // Search alts if not found
           if (val === undefined) {
               for (const alt of item.alts) {
                   val = findValueByKey(t, alt);
                   if (val !== undefined) break;
               }
           }

           // Handle "8/10" string format
           if (typeof val === 'string' && val.includes('/')) {
               val = val.split('/')[0];
           }

           if (val !== undefined && !isNaN(Number(val))) {
               individualScores[item.key] = Number(val);
               foundAny = true;
           }
       });
       if (foundAny) scoresFound = individualScores;
  }

  // Construct or Merge validatorData
  if (scoresFound) {
      if (!validatorData) {
           validatorData = {
               validated_at: t.validated_at || new Date().toISOString(),
               result: {
                   scores: scoresFound,
                   summary: '',
                   reasons: [],
                   recommendations: [],
                   status: 'completed'
               }
           };
      } else if (validatorData.result && typeof validatorData.result === 'object') {
          // Merge scores into existing result (copying result first)
          validatorData.result = { ...validatorData.result, scores: { ...validatorData.result.scores, ...scoresFound } };
      }
  }

  // Ensure result object exists if validatorData exists (Safety check for incomplete DB records)
  if (validatorData && (!validatorData.result || typeof validatorData.result !== 'object')) {
      validatorData.result = {
          status: 'unknown',
          summary: '',
          reasons: [],
          recommendations: [],
          scores: { b2b_tone: 0, brand_alignment: 0, structure: 0, accuracy: 0, enterprise_relevance: 0 }
      };
  }

  // FIX: Force population of summary/reasons/recommendations if missing
  if (validatorData && validatorData.result) {
      // result is definitely an object here, but we check specifically for missing string properties
      const res = validatorData.result; // Alias for cleaner access
      
      if (!res.summary || res.summary === '') {
          const scavengedSummary = findValueByKey(t, 'summary') || 
                                   findValueByKey(t, 'executive_summary') || 
                                   findValueByKey(t, 'validation_summary') || 
                                   findValueByKey(t, 'validator_summary');
          if (scavengedSummary && typeof scavengedSummary === 'string') {
              res.summary = scavengedSummary;
          }
      }
      
      if (!res.reasons || res.reasons.length === 0) {
           const scavengedReasons = findValueByKey(t, 'reasons');
           if (scavengedReasons) res.reasons = robustParse(scavengedReasons);
      }

      if (!res.recommendations || res.recommendations.length === 0) {
           const scavengedRecs = findValueByKey(t, 'recommendations');
           if (scavengedRecs) res.recommendations = robustParse(scavengedRecs);
      }
  }

  // 3. Status Logic
  let status = t.status || TopicStatus.PENDING;
  if (generatedContent?.content_html && generatedContent.content_html.length > 50 && status === TopicStatus.PENDING) {
      status = TopicStatus.CONTENT_GENERATED;
  }

  // 4. Bi-Directional Image Sync
  let finalImgUrl = t.img_url || generatedContent?.featured_image || '';
  
  if (!finalImgUrl) {
      const deepImg = findValueByKey(t, 'featured_image') || findValueByKey(t, 'img_url');
      if (deepImg && typeof deepImg === 'string') finalImgUrl = cleanString(deepImg);
  }

  if (generatedContent && !generatedContent.featured_image && finalImgUrl) {
      generatedContent.featured_image = finalImgUrl;
  }
  
  t.img_url = finalImgUrl;

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
    img_url: finalImgUrl,
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

  // Initialize Data
  useEffect(() => {
    const initData = async () => {
      await syncTopics();
      const config = await fetchAppConfig();
      if (config) {
        if (config.preferredAngles.length > 0) setPreferredAngles(config.preferredAngles);
        if (config.unpreferredAngles.length > 0) setUnpreferredAngles(config.unpreferredAngles);
      } else {
        setPreferredAngles(['Enterprise scalability', 'Data security and compliance', 'Cost reduction strategies']);
        setUnpreferredAngles(['Cheap/Free alternatives', 'Beginner tutorials', 'Opinion pieces']);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('topicGen_theme', theme);
  }, [theme]);

  // Persist Settings
  useEffect(() => { localStorage.setItem('topicGen_webhook', webhookUrl); }, [webhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_content_webhook', contentWebhookUrl); }, [contentWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_feedback_webhook', feedbackWebhookUrl); }, [feedbackWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_sync_webhook', syncWebhookUrl); }, [syncWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_article_review_webhook', articleReviewWebhookUrl); }, [articleReviewWebhookUrl]);
  useEffect(() => { localStorage.setItem('topicGen_drafting_webhook', draftingWebhookUrl); }, [draftingWebhookUrl]);

  const saveTopicToCloud = async (topic: Topic) => {
    try { await saveSupabaseTopic(topic); } 
    catch (e: any) { console.error("Supabase Save failed:", e.message); }
  };

  const addTopics = (newTopics: Topic[]) => {
    setTopics((prev) => [...newTopics, ...prev]);
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
    setTopics((prev) => {
      const existingTopic = prev.find(t => t.id === id);
      if (!existingTopic) return prev;

      const safeData = robustParse(data);
      const mergedRaw = { ...existingTopic, ...safeData };
      const updatedTopic = normalizeTopic(mergedRaw);
      updatedTopic.status = TopicStatus.CONTENT_GENERATED;
      
      console.log("Saving generated content:", updatedTopic);
      saveTopicToCloud(updatedTopic);
      
      return prev.map(t => t.id === id ? updatedTopic : t);
    });
  };

  const deleteTopic = (id: string) => {
    deleteSupabaseTopic(id).catch(e => console.error(e));
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

  const addContentGeneratingId = (id: string) => setContentGeneratingIds(prev => [...prev, id]);
  const removeContentGeneratingId = (id: string) => setContentGeneratingIds(prev => prev.filter(item => item !== id));

  const syncTopics = async () => {
    let externalTopics: Topic[] = [];
    try {
        externalTopics = await fetchSupabaseTopics();
    } catch (e: any) {
        console.error("Supabase Sync Failed:", e);
        if (syncWebhookUrl) {
           try { externalTopics = await fetchExternalData(syncWebhookUrl); } catch(err) {}
        }
    }
    
    setTopics(currentTopics => {
       const currentMap = new Map<string, Topic>(currentTopics.map(t => [String(t.id), t]));
       externalTopics.forEach(ext => {
           const id = ext.id ? String(ext.id) : generateId();
           const mergedRaw = { ...ext, id };
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
      link.download = `topic_gen_backup.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed)) { alert("Invalid data"); return; }
      const importedTopics: Topic[] = parsed.map(normalizeTopic);
      setTopics(prev => {
         const topicMap = new Map(prev.map(t => [String(t.id), t]));
         importedTopics.forEach(t => topicMap.set(String(t.id), t));
         return Array.from(topicMap.values());
      });
      importedTopics.forEach(t => saveTopicToCloud(t));
      alert(`Imported ${importedTopics.length} topics.`);
    } catch (e) { alert("Failed to parse JSON."); }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

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
        webhookUrl, setWebhookUrl,
        contentWebhookUrl, setContentWebhookUrl,
        feedbackWebhookUrl, setFeedbackWebhookUrl,
        syncWebhookUrl, setSyncWebhookUrl,
        articleReviewWebhookUrl, setArticleReviewWebhookUrl,
        draftingWebhookUrl, setDraftingWebhookUrl,
        addAngle,
        removeAngle,
        generateId,
        isGenerating, setIsGenerating,
        contentGeneratingIds, addContentGeneratingId, removeContentGeneratingId,
        syncTopics,
        exportData,
        importData,
        availableProducts: PRODUCTS,
        theme, toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
