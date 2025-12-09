
import { GenerationRequest, MakeResponse, Topic } from '../types';

// Helper to parse JSON with aggressive cleanup and auto-fixing
const parseWithAutoFix = (jsonStr: string): any => {
  if (!jsonStr || typeof jsonStr !== 'string') return null;

  // Remove Markdown code blocks if present
  let cleanStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  
  try {
    return JSON.parse(cleanStr);
  } catch (e) {
    // Attempt to fix common AI JSON errors: missing commas between properties/objects
    try {
          // Fix: "value" "key" -> "value", "key" (excluding colons for key:value pairs)
          let fixedStr = cleanStr.replace(/(")\s*[\r\n]+\s*(")/g, '$1,$2');
          // Fix: } { -> }, {
          fixedStr = fixedStr.replace(/(})\s*[\r\n]+\s*({)/g, '$1,$2');
          
          // Fix: Newlines inside JSON strings (common LLM error)
          // This is a naive fix for unescaped newlines in HTML strings that breaks JSON
          fixedStr = fixedStr.replace(/([^\\[{\,])\n(?!\s*["}\]])/g, '$1\\n');

          return JSON.parse(fixedStr);
    } catch (retryError) {
          throw e;
    }
  }
};

// Helper to manually extract JSON tokens (objects or strings) from broken text
const manualExtract = (text: string, key: string): string | null => {
    // Allow key to be surrounded by ", ', or \" (escaped quote)
    // Regex matches: key:, "key":, 'key':, \"key\":
    const regex = new RegExp(`(?:\\\\?["']?)${key}(?:\\\\?["']?)\\s*:\\s*`);
    
    const match = regex.exec(text);
    if (!match) return null;
    
    const start = match.index + match[0].length;
    const char = text[start];
    
    if (char === '{') {
        // Object - Assume balanced braces
        let balance = 1;
        let i = start + 1;
        while(i < text.length && balance > 0) {
            if (text[i] === '{') balance++;
            else if (text[i] === '}') balance--;
            i++;
        }
        return text.substring(start, i);
    } else if (char === '[') {
        // Array - Assume balanced brackets
        let balance = 1;
        let i = start + 1;
        while(i < text.length && balance > 0) {
            if (text[i] === '[') balance++;
            else if (text[i] === ']') balance--;
            i++;
        }
        return text.substring(start, i);
    } else if (char === '"' || char === "'") {
        // String - Scan for matching quote, ignoring escaped
        const quote = char;
        let i = start + 1;
        while(i < text.length) {
            if (text[i] === '\\') { i += 2; continue; }
            if (text[i] === quote) break;
            i++;
        }
        return text.substring(start, i + 1); 
    } else {
        // Simple value
        let i = start;
        while(i < text.length && text[i] !== ',' && text[i] !== '}' && text[i] !== ']' && text[i] !== '\n') i++;
        return text.substring(start, i).trim();
    }
};

// LAST RESORT: Hunt for individual score keys in the raw text if object parsing failed
const scavengeScores = (text: string) => {
    const keys = ['b2b_tone', 'brand_alignment', 'structure', 'accuracy', 'enterprise_relevance'];
    const scores: any = {};
    let found = false;
    keys.forEach(key => {
        // Matches "key": 9 or 'key': 9 or key: 9, handling optional whitespace and escaped quotes
        const regex = new RegExp(`(?:\\\\?["']?)${key}(?:\\\\?["']?)\\s*:\\s*(\\d+)`);
        const match = regex.exec(text);
        if (match && match[1]) {
            scores[key] = parseInt(match[1], 10);
            found = true;
        }
    });
    return found ? scores : null;
}

export const sendToMake = async (webhookUrl: string, data: GenerationRequest): Promise<MakeResponse> => {
  if (!webhookUrl) throw new Error('Webhook URL is missing. Please configure it in Settings.');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorBody = '';
      try { errorBody = await response.text(); } catch { /* ignore */ }
      const statusText = response.statusText ? ` ${response.statusText}` : '';
      const details = errorBody ? ` - ${errorBody.substring(0, 200)}` : '';
      throw new Error(`Make.com HTTP Error: ${response.status}${statusText}${details}`);
    }

    const text = await response.text();
    const cleanedText = text.trim();

    if (!cleanedText) throw new Error('Make.com returned an empty response.');
    if (cleanedText === 'Accepted') throw new Error('Make.com returned "Accepted" (200 OK) without JSON data.');
    if (cleanedText.startsWith('<') || cleanedText.toLowerCase().includes('doctype html')) throw new Error('Make.com returned HTML instead of JSON.');

    let result;
    try {
      result = parseWithAutoFix(cleanedText);
    } catch (e) {
      throw new Error(`Invalid response format from Make: ${cleanedText.substring(0, 100)}...`);
    }

    // Handle nested body response (common in Make.com scenarios)
    if (Array.isArray(result) && result.length > 0 && 'body' in result[0]) {
      const bodyContent = result[0].body;
      result = typeof bodyContent === 'string' ? parseWithAutoFix(bodyContent) : bodyContent;
    }

    // --- NORMALIZATION LOGIC ---
    
    // 1. If result is a direct Array, wrap it as { topics: [...] }
    if (Array.isArray(result)) {
        return { topics: result };
    }

    // 2. If result is an Object
    if (result && typeof result === 'object') {
       // Check for standard aliases
       if (!result.topics) {
           if (Array.isArray(result.results)) {
               result.topics = result.results;
           } else if (Array.isArray(result.data)) {
               result.topics = result.data;
           }
       }

       // 3. Handle Single Object Return (e.g. Social Media single generation)
       // If 'topics' is still missing, but the object itself looks like a topic data point
       if (!result.topics) {
           // Heuristic: Does it have topic-like keys?
           const keys = Object.keys(result);
           const hasTopicKeys = keys.some(k => 
               ['hook', 'post', 'topic', 'title', 'keyword', 'angle', 'hashtags'].includes(k)
           );
           
           if (hasTopicKeys) {
               return { topics: [result] };
           }
       }
    }

    return result as MakeResponse;

  } catch (error: any) {
    throw error;
  }
};

export const generateArticle = async (webhookUrl: string, topic: Topic): Promise<any> => {
    if (!webhookUrl) throw new Error('Content Webhook URL is missing. Please configure it in Settings.');

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(topic),
        });

        if (!response.ok) throw new Error(`Make.com HTTP Error: ${response.status}`);

        const text = await response.text();
        const cleanedText = text.trim();

        if (cleanedText.startsWith('<')) {
            return {
                content: {
                    content_html: cleanedText,
                    title: topic.title
                }
            };
        }

        let result: any = null;

        try {
            result = parseWithAutoFix(cleanedText);
        } catch (e) {
            console.warn("Main JSON Parse failed. Attempting manual extraction.");
        }

        if (!result) {
            result = {};
            
            // 1. Extract Content
            const contentRaw = manualExtract(cleanedText, 'content');
            if (contentRaw) {
                try {
                    const parsed = parseWithAutoFix(contentRaw);
                    result.content = (typeof parsed === 'string') ? parseWithAutoFix(parsed) : parsed;
                } catch(e) {}
            }
            
            // 2. Extract Validator
            const validatorRaw = manualExtract(cleanedText, 'validator_response');
            if (validatorRaw) {
                 try {
                     const parsed = parseWithAutoFix(validatorRaw);
                     result.validator_response = (typeof parsed === 'string') ? parseWithAutoFix(parsed) : parsed;
                 } catch(e) {
                     // Keep raw string if parse failed, might scavenge later
                     if (validatorRaw.startsWith('"') || validatorRaw.startsWith("'")) {
                         result.validator_response = validatorRaw.replace(/^["']|["']$/g, '');
                     }
                 }
            }

            // 3. Extract Image (Aggressive)
            let imageRaw = manualExtract(cleanedText, 'image');
            if (!imageRaw) imageRaw = manualExtract(cleanedText, 'featured_image');
            if (!imageRaw) imageRaw = manualExtract(cleanedText, 'img_url');
            
            if (imageRaw) {
                 try {
                     const parsed = parseWithAutoFix(imageRaw);
                     if (typeof parsed === 'string') result.image = parsed;
                     else result.image = imageRaw.replace(/^"|"$/g, '');
                 } catch(e) { 
                     result.image = imageRaw.replace(/^"|"$/g, ''); 
                 }
            }
        }

        if (Object.keys(result).length === 0) {
             return { content: { content_html: cleanedText, title: topic.title } };
        }

        // --- Post-Processing ---

        // 1. Handle Content
        if (result.content && typeof result.content === 'string') {
            try { result.content = parseWithAutoFix(result.content); } catch (e) {}
        }
        if (result.content && typeof result.content === 'string') {
             result.content = { content_html: result.content };
        } else if (!result.content) {
             result.content = {};
        }

        // 2. Handle Validator Response (Deep Scavenging)
        let validatorString = '';
        
        if (result.validator_response && typeof result.validator_response === 'string') {
            validatorString = result.validator_response; 
            try { 
                const parsed = parseWithAutoFix(result.validator_response); 
                if (parsed && typeof parsed === 'object') {
                    result.validator_response = parsed;
                } else {
                    result.validator_response = null; // failed to parse to object
                }
            } catch (e) {
                result.validator_response = null; 
            }
        }

        // If we still don't have a valid object, scavenge using the raw text OR the validatorString
        const sourceText = validatorString || cleanedText;
        
        if (!result.validator_response || typeof result.validator_response !== 'object') {
            // Try to find 'scores' directly (object extraction)
            let scoresObj = null;
            const scoresRaw = manualExtract(sourceText, 'scores');
            if (scoresRaw) {
                try { scoresObj = parseWithAutoFix(scoresRaw); } catch(e) {}
            } 
            
            // Fallback: Scavenge individual score keys (regex hunt)
            if (!scoresObj) {
                 scoresObj = scavengeScores(sourceText);
            }

            if (scoresObj) {
                if (!result.validator_response) result.validator_response = {};
                if (!result.validator_response.result) result.validator_response.result = {};
                result.validator_response.result.scores = scoresObj;
            }
        }

        // 3. Normalize 'image'
        // Explicitly put image at root so AppContext can find it easily
        const extractedImage = result.image || result.featured_image || result.img_url || result.img;
        
        if (extractedImage && typeof extractedImage === 'string') {
             if (!result.image) result.image = extractedImage;
             if (!result.content.featured_image) result.content.featured_image = extractedImage;
        }
        
        // 4. Extract Social Media Fields if present (Root or inside Content)
        const socialKeys = ['hook', 'post', 'social_post', 'hashtags', 'cta', 'fix_suggestions'];
        socialKeys.forEach(key => {
             // Check if it's already in result or content
             if (result[key] === undefined && result.content[key] === undefined) {
                  const extracted = manualExtract(cleanedText, key);
                  if (extracted) {
                      try {
                          const parsed = parseWithAutoFix(extracted);
                          // Place it in content for normalization
                          result.content[key] = parsed; 
                      } catch(e) {
                           result.content[key] = extracted.replace(/^"|"$/g, '');
                      }
                  }
             }
        });

        // 5. Scavenge Content Fields (SEO, Meta, etc)
        const scalarKeys = ['seo_title', 'slug', 'meta_description', 'focus_keyword', 'h1', 'title'];
        scalarKeys.forEach(key => {
            if (result[key] !== undefined && result.content[key] === undefined) result.content[key] = result[key];
            if (!result.content[key]) {
                 const extracted = manualExtract(cleanedText, key);
                 if (extracted) {
                     try { result.content[key] = parseWithAutoFix(extracted); } catch (e) { result.content[key] = extracted.replace(/^"|"$/g, ''); }
                 }
            }
        });

        const complexKeys = ['related_keywords', 'sections', 'faq'];
        complexKeys.forEach(key => {
            if (result[key] !== undefined && result.content[key] === undefined) result.content[key] = result[key];
            if (!result.content[key]) {
                 const extracted = manualExtract(cleanedText, key);
                 if (extracted) { try { result.content[key] = parseWithAutoFix(extracted); } catch (e) {} }
            }
        });

        // 6. Populate other validator fields
        if (result.validator_response) {
             if (result.validator_response.scores && !result.validator_response.result) {
                  result.validator_response.result = { 
                      scores: result.validator_response.scores,
                      ...result.validator_response
                  };
             }
             if (!result.validator_response.result) result.validator_response.result = { ...result.validator_response };

             const valKeys = ['summary', 'reasons', 'recommendations', 'status', 'fix_suggestions'];
             valKeys.forEach(key => {
                  if (!result.validator_response.result[key]) {
                      // Check root first
                      if (result[key]) {
                          result.validator_response.result[key] = result[key];
                      } 
                      // Check inside content object (some social payloads do this)
                      else if (result.content && result.content[key]) {
                           result.validator_response.result[key] = result.content[key];
                      }
                      else {
                           const extracted = manualExtract(cleanedText, key);
                           if (extracted) {
                               try { result.validator_response.result[key] = parseWithAutoFix(extracted); } 
                               catch(e) { result.validator_response.result[key] = extracted.replace(/^"|"$/g, ''); }
                           }
                      }
                  }
             });
        }

        // 7. HTML scavenging fallback
        if (!result.content.content_html) {
             const htmlMatch = cleanedText.match(/<(article|html|body)[\s\S]*?<\/\1>/i) || cleanedText.match(/<h1[\s\S]*?<\/article>/i);
             if (htmlMatch) {
                 result.content.content_html = htmlMatch[0];
             } else if (cleanedText.includes('<h1>') && cleanedText.includes('<p>')) {
                 result.content.content_html = cleanedText;
             }
        }

        return result;

    } catch (error: any) {
        throw error;
    }
};

export const sendFeedback = async (webhookUrl: string, data: any): Promise<void> => {
    if (!webhookUrl) return;
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    } catch (error) {
        console.error('Failed to send feedback:', error);
    }
};

export const sendArticleReview = async (webhookUrl: string, data: any): Promise<void> => {
    if (!webhookUrl) throw new Error('Review Webhook URL is missing.');
    
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
         let errorBody = '';
         try { errorBody = await response.text(); } catch { /* ignore */ }
         const details = errorBody ? ` - ${errorBody}` : '';
         throw new Error(`Failed to send review (${response.status}): ${response.statusText}${details}`);
    }
};

export const sendArticleDraft = async (webhookUrl: string, data: any): Promise<void> => {
    if (!webhookUrl) return; // Silent fail if not configured
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            console.warn(`Draft webhook failed: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to send draft webhook:', error);
    }
};

export const fetchExternalData = async (webhookUrl: string): Promise<Topic[]> => {
  if (!webhookUrl) throw new Error('Sync Webhook URL is missing.');
  
  const response = await fetch(webhookUrl);
  if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`);
  
  const text = await response.text();
  const data = parseWithAutoFix(text);
  
  let topicsArray: any[] = [];
  
  if (Array.isArray(data)) {
      topicsArray = data;
  } else if (data && typeof data === 'object') {
      if (Array.isArray(data.topics)) topicsArray = data.topics;
      else if (Array.isArray(data.data)) topicsArray = data.data;
      else if (Array.isArray(data.results)) topicsArray = data.results;
  }
  
  return topicsArray.map((t: any) => ({
      ...t,
      // Ensure critical fields exist, but don't override ID if it exists in DB
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
