
import { GenerationRequest, MakeResponse, Topic } from '../types';

// Robust JSON extraction
const parseWithAutoFix = (jsonStr: string): any => {
  if (!jsonStr || typeof jsonStr !== 'string') return null;

  let cleanStr = jsonStr.trim();
  
  // 1. Broad extraction: Find the first '{' or '[' and the last '}' or ']'
  const startIdx = Math.min(
    cleanStr.indexOf('{') === -1 ? Infinity : cleanStr.indexOf('{'),
    cleanStr.indexOf('[') === -1 ? Infinity : cleanStr.indexOf('[')
  );
  const endIdx = Math.max(
    cleanStr.lastIndexOf('}'),
    cleanStr.lastIndexOf(']')
  );

  if (startIdx !== Infinity && endIdx !== -1 && endIdx > startIdx) {
    cleanStr = cleanStr.substring(startIdx, endIdx + 1);
  }

  // 2. Remove any remaining markdown artifacts (```json, ```, etc)
  cleanStr = cleanStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  
  try {
    return JSON.parse(cleanStr);
  } catch (e) {
    try {
          // Attempt to fix common newline escaping issues
          let fixedStr = cleanStr.replace(/([^\\[{\,])\n(?!\s*["}\]])/g, '$1\\n');
          fixedStr = fixedStr.replace(/(")\s*[\r\n]+\s*(")/g, '$1,$2');
          return JSON.parse(fixedStr);
    } catch (retryError) {
          console.error("All JSON parse attempts failed.", cleanStr.substring(0, 100));
          throw e;
    }
  }
};

// Helper to recursively scavenge for specific data types
const scavengeFields = (obj: any): { html?: string; seo?: any; validator?: any } => {
    let result: { html?: string; seo?: any; validator?: any } = {};
    if (!obj || typeof obj !== 'object') return result;

    // Check current level
    if (obj.content_html && typeof obj.content_html === 'string' && obj.content_html.includes('<')) result.html = obj.content_html;
    else if (obj.article && typeof obj.article === 'string' && obj.article.includes('<')) result.html = obj.article;
    else if (obj.html && typeof obj.html === 'string' && obj.html.includes('<')) result.html = obj.html;
    else if (obj.body && typeof obj.body === 'string' && obj.body.includes('<')) result.html = obj.body;
    
    // Check for SEO object
    if (obj.seo && typeof obj.seo === 'object') result.seo = obj.seo;
    else if (obj.meta && typeof obj.meta === 'object') result.seo = obj.meta;
    else if (obj.seo_metadata && typeof obj.seo_metadata === 'object') result.seo = obj.seo_metadata;
    else if (obj.metadata && typeof obj.metadata === 'object') result.seo = obj.metadata;

    // Check for Validator object
    if (obj.validator && typeof obj.validator === 'object') result.validator = obj.validator;
    else if (obj.validation && typeof obj.validation === 'object') result.validator = obj.validation;
    else if (obj.analysis && typeof obj.analysis === 'object') result.validator = obj.analysis;
    else if (obj.audit && typeof obj.audit === 'object') result.validator = obj.audit;
    else if (obj.ai_analysis && typeof obj.ai_analysis === 'object') result.validator = obj.ai_analysis;
    else if (obj.quality_analysis && typeof obj.quality_analysis === 'object') result.validator = obj.quality_analysis;
    else if (obj.evaluation && typeof obj.evaluation === 'object') result.validator = obj.evaluation;
    else if (obj.review && typeof obj.review === 'object') result.validator = obj.review;

    // Recurse if we haven't found everything
    if (!result.html || !result.seo || !result.validator) {
        if (Array.isArray(obj)) {
            for (const item of obj) {
                const sub = scavengeFields(item);
                if (!result.html && sub.html) result.html = sub.html;
                if (!result.seo && sub.seo) result.seo = sub.seo;
                if (!result.validator && sub.validator) result.validator = sub.validator;
            }
        } else {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    const sub = scavengeFields(obj[key]);
                    if (!result.html && sub.html) result.html = sub.html;
                    if (!result.seo && sub.seo) result.seo = sub.seo;
                    if (!result.validator && sub.validator) result.validator = sub.validator;
                }
            }
        }
    }
    return result;
};

export const sendToMake = async (webhookUrl: string, data: GenerationRequest): Promise<MakeResponse> => {
  if (!webhookUrl) throw new Error('Webhook URL is missing.');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`Make.com HTTP Error: ${response.status}`);

    const text = await response.text();
    const result = parseWithAutoFix(text);

    let finalResult = result;
    if (Array.isArray(result) && result.length > 0 && result[0].body) {
        finalResult = typeof result[0].body === 'string' ? parseWithAutoFix(result[0].body) : result[0].body;
    }

    if (Array.isArray(finalResult)) return { topics: finalResult };
    
    if (finalResult && typeof finalResult === 'object') {
       if (finalResult.article || finalResult.post_data?.article || finalResult.content) {
           return { topics: [finalResult] };
       }
       if (finalResult.topics || finalResult.results || finalResult.data) {
           return { 
               topics: finalResult.topics || finalResult.results || finalResult.data 
           };
       }
       return { topics: [finalResult] };
    }

    throw new Error('Could not find any topics or content in the response.');
  } catch (error: any) {
    throw error;
  }
};

export const generateArticle = async (webhookUrl: string, topic: Topic): Promise<any> => {
    if (!webhookUrl) throw new Error('Content Webhook URL is missing.');

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(topic),
        });

        if (!response.ok) throw new Error(`Make.com HTTP Error: ${response.status}`);

        const text = await response.text();
        
        // If it's pure HTML, wrap it
        if (text.trim().startsWith('<')) {
            return { content: { content_html: text.trim(), title: topic.title } };
        }

        let result = parseWithAutoFix(text);

        // Normalize Make.com specific wrappers
        if (Array.isArray(result) && result.length > 0) {
             // Sometimes Make returns an array of bundles
             result = result[0].body ? (typeof result[0].body === 'string' ? parseWithAutoFix(result[0].body) : result[0].body) : result[0];
        } else if (result.body) {
             result = typeof result.body === 'string' ? parseWithAutoFix(result.body) : result.body;
        }

        // Deep Scavenge for critical data
        const scavenged = scavengeFields(result);
        
        // Final Robust Field Mapping
        const source = result.post_data || result.data || result;
        const seoSource = scavenged.seo || source.seo || source.meta || {};
        const validatorSource = scavenged.validator || source.validator || source.validation || source.analysis || source.audit;

        const merged = {
            ...result,
            generated_content_raw: result,
            
            // Prioritize scavenged HTML
            content_html: scavenged.html || source.article || source.content_html || source.html_content || source.body || source.html,
            
            // Map SEO fields to top level
            seo_title: seoSource.title || seoSource.seo_title,
            meta_description: seoSource.description || seoSource.meta_description,
            slug: seoSource.slug,
            
            // Map Validator
            validatorData: validatorSource
        };

        return merged;
    } catch (error: any) {
        throw error;
    }
};

export const sendFeedback = async (webhookUrl: string, data: any): Promise<void> => {
    if (!webhookUrl) return;
    try { await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); } 
    catch (error) { console.error('Feedback failed:', error); }
};

export const sendArticleReview = async (webhookUrl: string, data: any): Promise<void> => {
    if (!webhookUrl) throw new Error('Review Webhook URL is missing.');
    const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error(`Review failed: ${response.status}`);
};

export const sendArticleDraft = async (webhookUrl: string, data: any): Promise<void> => {
    if (!webhookUrl) return; 
    try { await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); } 
    catch (error) { console.error('Draft failed:', error); }
};

export const sendSocialMediaReview = async (webhookUrl: string, data: any): Promise<void> => {
    if (!webhookUrl) throw new Error('Social Review Webhook URL is missing.');
    const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error(`Social review failed: ${response.status}`);
};

export const fetchExternalData = async (webhookUrl: string): Promise<Topic[]> => {
  if (!webhookUrl) throw new Error('Sync Webhook URL is missing.');
  const response = await fetch(webhookUrl);
  if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  const text = await response.text();
  const data = parseWithAutoFix(text);
  let topics: any[] = [];
  if (Array.isArray(data)) topics = data;
  else if (data?.topics) topics = data.topics;
  else if (data?.data) topics = data.data;
  
  return topics.map((t: any) => ({
      ...t,
      keyword: t.keyword || 'Synced Topic',
      product: t.product || 'Synced Product',
      title: t.title || 'Untitled',
      status: t.status || 'PENDING'
  }));
};

export const mockGenerateTopics = async (data: GenerationRequest): Promise<MakeResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return { topics: [] };
};
